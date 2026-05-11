"""
Unit tests for the profiles endpoints:
  GET  /profiles/me
  PATCH /profiles/me
  GET  /profiles/me/surveys

Uses FastAPI's TestClient and mocks Supabase calls so no live DB is needed.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from auth import get_current_user
import routers.profiles  # noqa: F401 — required so patch("routers.profiles.supabase") can resolve

# ── Shared UUIDs ──────────────────────────────────────────────────────────────

USER_ID_1  = "bbbb0000-0000-0000-0000-000000000002"
SURVEY_ID  = "aaaa0000-0000-0000-0000-000000000001"
Q_ID_1     = "q111-0000-0000-0000-000000000001"
Q_ID_2     = "q222-0000-0000-0000-000000000002"
OPT_A      = "opt-aaaa-0000-0000-0000-000000000001"
OPT_B      = "opt-bbbb-0000-0000-0000-000000000002"

# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_result(data):
    m = MagicMock()
    m.data = data
    return m


def _chainable_table(data):
    """Mock Supabase table that supports method chaining and returns data on execute()."""
    m = MagicMock()
    m.select.return_value = m
    m.eq.return_value = m
    m.in_.return_value = m
    m.order.return_value = m
    m.update.return_value = m
    m.single.return_value = m
    m.execute.return_value = _make_result(data)
    return m


# ── App / client fixture ──────────────────────────────────────────────────────

@pytest.fixture()
def client():
    from main import app
    # Override the JWT dependency at the FastAPI level so no real token is needed
    app.dependency_overrides[get_current_user] = lambda: {"sub": USER_ID_1}
    yield TestClient(app, raise_server_exceptions=True)
    app.dependency_overrides.clear()


AUTH = {"Authorization": "Bearer fake-token"}

# ── Sample data ───────────────────────────────────────────────────────────────

PROFILE_ROW = {
    "id": USER_ID_1,
    "email": "alice@amherst.edu",
    "full_name": "Alice Chen",
    "school": "Amherst College",
    "major": "Computer Science",
    "grad_year": 2026,
    "bio": "Loves hiking.",
    "contact_info": "@alice",
}

MEMBERSHIP_ROW = {
    "survey_id": SURVEY_ID,
    "joined_at": "2026-04-01T00:00:00",
    "surveys": {"id": SURVEY_ID, "title": "Spring 2026 Team Survey"},
}

QUESTIONS = [
    {"id": Q_ID_1, "prompt": "Working style", "question_type": "multiple_choice", "order_index": 0},
    {"id": Q_ID_2, "prompt": "Availability",  "question_type": "multiple_choice", "order_index": 1},
]

RESPONSES = [
    {"question_id": Q_ID_1, "answer_option_id": OPT_A, "answer_text": None},
    {"question_id": Q_ID_2, "answer_option_id": OPT_B, "answer_text": None},
]

ANSWER_OPTIONS = [
    {"id": OPT_A, "option_text": "Async"},
    {"id": OPT_B, "option_text": "Morning"},
]


# ── test for GET /profiles/me ─────────────────────────────────────────────────

class TestGetMyProfile:
    def test_returns_profile(self, client):
        with patch("routers.profiles.supabase") as mock_db:
            mock_db.table.return_value = _chainable_table(PROFILE_ROW)
            res = client.get("/profiles/me", headers=AUTH)
        assert res.status_code == 200
        body = res.json()
        assert body["id"] == USER_ID_1
        assert body["email"] == "alice@amherst.edu"
        assert body["full_name"] == "Alice Chen"
        assert body["school"] == "Amherst College"
        assert body["major"] == "Computer Science"
        assert body["grad_year"] == 2026

    def test_profile_not_found_returns_404(self, client):
        with patch("routers.profiles.supabase") as mock_db:
            mock_db.table.return_value = _chainable_table(None)
            res = client.get("/profiles/me", headers=AUTH)
        assert res.status_code == 404
        assert "Profile not found" in res.json()["detail"]


# ── test for PATCH /profiles/me ──────────────────────────────────────────────

class TestUpdateMyProfile:
    def test_updates_full_name(self, client):
        updated_row = {**PROFILE_ROW, "full_name": "Alice Updated"}
        with patch("routers.profiles.supabase") as mock_db:
            mock_db.table.return_value = _chainable_table([updated_row])
            res = client.patch(
                "/profiles/me",
                json={"full_name": "Alice Updated"},
                headers=AUTH,
            )
        assert res.status_code == 200
        assert res.json()["full_name"] == "Alice Updated"

    def test_updates_multiple_fields(self, client):
        updated_row = {**PROFILE_ROW, "school": "Smith College", "major": "Math"}
        with patch("routers.profiles.supabase") as mock_db:
            mock_db.table.return_value = _chainable_table([updated_row])
            res = client.patch(
                "/profiles/me",
                json={"school": "Smith College", "major": "Math"},
                headers=AUTH,
            )
        assert res.status_code == 200
        assert res.json()["school"] == "Smith College"
        assert res.json()["major"] == "Math"

    def test_empty_body_returns_422(self, client):
        with patch("routers.profiles.supabase"):
            res = client.patch("/profiles/me", json={}, headers=AUTH)
        assert res.status_code == 422

    def test_db_failure_returns_500(self, client):
        with patch("routers.profiles.supabase") as mock_db:
            mock_db.table.return_value = _chainable_table([])
            res = client.patch(
                "/profiles/me",
                json={"bio": "New bio"},
                headers=AUTH,
            )
        assert res.status_code == 500
        assert "Failed to update profile" in res.json()["detail"]

    def test_null_fields_are_ignored(self, client):
        """Fields explicitly set to None should not be sent to the DB."""
        updated_row = {**PROFILE_ROW, "bio": "New bio"}
        with patch("routers.profiles.supabase") as mock_db:
            table_mock = _chainable_table([updated_row])
            mock_db.table.return_value = table_mock
            res = client.patch(
                "/profiles/me",
                json={"bio": "New bio", "school": None},
                headers=AUTH,
            )
        assert res.status_code == 200
        # Verify only non-null fields were passed to .update()
        call_args = table_mock.update.call_args[0][0]
        assert "school" not in call_args
        assert call_args["bio"] == "New bio"


# ── test for GET /profiles/me/surveys ────────────────────────────────────────

class TestGetMySurveys:
    def _call_sequence(self):
        """
        Table call order inside get_my_surveys for one membership:
          1. survey_members (memberships)
          2. questions
          3. survey_responses
          4. answer_options
        """
        return iter([
            [MEMBERSHIP_ROW],
            QUESTIONS,
            RESPONSES,
            ANSWER_OPTIONS,
        ])

    def test_returns_surveys_list(self, client):
        seq = self._call_sequence()
        with patch("routers.profiles.supabase") as mock_db:
            mock_db.table.side_effect = lambda _: _chainable_table(next(seq))
            res = client.get("/profiles/me/surveys", headers=AUTH)
        assert res.status_code == 200
        body = res.json()
        assert isinstance(body, list)
        assert len(body) == 1
        assert body[0]["survey_id"] == SURVEY_ID
        assert body[0]["title"] == "Spring 2026 Team Survey"

    def test_survey_is_marked_submitted_when_responses_exist(self, client):
        seq = self._call_sequence()
        with patch("routers.profiles.supabase") as mock_db:
            mock_db.table.side_effect = lambda _: _chainable_table(next(seq))
            res = client.get("/profiles/me/surveys", headers=AUTH)
        assert res.status_code == 200
        assert res.json()[0]["submitted"] is True

    def test_survey_responses_are_resolved_to_option_text(self, client):
        seq = self._call_sequence()
        with patch("routers.profiles.supabase") as mock_db:
            mock_db.table.side_effect = lambda _: _chainable_table(next(seq))
            res = client.get("/profiles/me/surveys", headers=AUTH)
        assert res.status_code == 200
        responses = res.json()[0]["responses"]
        answer_texts = [r["a"] for r in responses]
        assert "Async" in answer_texts
        assert "Morning" in answer_texts

    def test_no_memberships_returns_empty_list(self, client):
        with patch("routers.profiles.supabase") as mock_db:
            mock_db.table.return_value = _chainable_table([])
            res = client.get("/profiles/me/surveys", headers=AUTH)
        assert res.status_code == 200
        assert res.json() == []

    def test_survey_with_no_responses_is_not_submitted(self, client):
        seq = iter([
            [MEMBERSHIP_ROW],
            QUESTIONS,
            [],           # no responses
            [],           # no answer options
        ])
        with patch("routers.profiles.supabase") as mock_db:
            mock_db.table.side_effect = lambda _: _chainable_table(next(seq))
            res = client.get("/profiles/me/surveys", headers=AUTH)
        assert res.status_code == 200
        assert res.json()[0]["submitted"] is False
