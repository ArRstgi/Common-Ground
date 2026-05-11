"""
Simple unit tests for the survey endpoints:
  POST /surveys/create
  POST /surveys/join
  GET  /surveys/surveys_by_user/{user_id}
  POST /surveys/save_answers

Uses FastAPI's TestClient and mocks Supabase calls so no live DB is needed.
"""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient

# ── Fixtures ───────────────────────────────────────────────────────────────────

CREATOR_USER_ID = "aaaa0000-0000-0000-0000-000000000001"
OTHER_USER_ID   = "bbbb0000-0000-0000-0000-000000000002"
SURVEY_ID       = "cccc0000-0000-0000-0000-000000000003"
QUESTION_ID     = "dddd0000-0000-0000-0000-000000000004"
OPTION_ID       = "eeee0000-0000-0000-0000-000000000005"
JOIN_CODE       = "ABCD1234"

SURVEY_ROW = {
    "id": SURVEY_ID,
    "title": "Test Survey",
    "description": "A test survey",
    "join_code": JOIN_CODE,
    "deadline": None,
    "created_at": "2026-01-01T00:00:00+00:00",
    "created_by": CREATOR_USER_ID,
}

MC_QUESTION_ROW = {
    "id": QUESTION_ID,
    "survey_id": SURVEY_ID,
    "prompt": "Pick one",
    "question_type": "multiple_choice",
    "order_index": 0,
}

OPTION_ROW = {
    "id": OPTION_ID,
    "question_id": QUESTION_ID,
    "option_text": "Option A",
    "order_index": 0,
}

OPTION_ROW_B = {
    "id": "ffff0000-0000-0000-0000-000000000006",
    "question_id": QUESTION_ID,
    "option_text": "Option B",
    "order_index": 1,
}

SA_QUESTION_ROW = {
    "id": QUESTION_ID,
    "survey_id": SURVEY_ID,
    "prompt": "Describe yourself",
    "question_type": "short_answer",
    "order_index": 0,
}


def _make_result(data):
    m = MagicMock()
    m.data = data
    return m


def _chainable_table(data):
    """Return a mock table that chains fluent calls and returns data on execute()."""
    m = MagicMock()
    m.select.return_value = m
    m.eq.return_value = m
    m.limit.return_value = m
    m.insert.return_value = m
    m.update.return_value = m
    m.upsert.return_value = m
    m.order.return_value = m
    m.delete.return_value = m
    m.maybe_single.return_value = m
    m.execute.return_value = _make_result(data)
    return m


# ── App setup ──────────────────────────────────────────────────────────────────

@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr("auth.get_user_id", lambda: CREATOR_USER_ID)
    monkeypatch.setattr(
        "auth.get_current_user",
        lambda: {"sub": CREATOR_USER_ID},
    )
    from main import app
    return TestClient(app, raise_server_exceptions=True)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _mc_body():
    return {
        "title": "Test Survey",
        "description": "desc",
        "deadline": None,
        "questions": [
            {
                "prompt": "Pick one",
                "question_type": "multiple_choice",
                "order_index": 0,
                "answer_options": [
                    {"option_text": "Option A", "order_index": 0},
                    {"option_text": "Option B", "order_index": 1},
                ],
            }
        ],
    }


def _sa_body():
    return {
        "title": "Test Survey",
        "description": "desc",
        "deadline": None,
        "questions": [
            {
                "prompt": "Describe yourself",
                "question_type": "short_answer",
                "order_index": 0,
                "answer_options": [],
            }
        ],
    }


AUTH_HEADER = {"Authorization": "Bearer fake-token"}

# ── POST /surveys/create ───────────────────────────────────────────────────────

def test_create_survey_non_creator_forbidden(client):
    """Users without the survey_creator role cannot create surveys."""
    with patch("routers.surveys.supabase_admin") as mock_admin:
        mock_admin.table.return_value = _chainable_table({"role": "student"})
        res = client.post("/surveys/create", json=_mc_body(), headers=AUTH_HEADER)
    assert res.status_code == 403


def test_create_survey_mc_too_few_options(client):
    """Multiple choice question with fewer than 2 options is rejected."""
    body = _mc_body()
    body["questions"][0]["answer_options"] = [{"option_text": "Only one", "order_index": 0}]

    with patch("routers.surveys.supabase_admin") as mock_admin:
        mock_admin.table.return_value = _chainable_table({"role": "survey_creator"})
        res = client.post("/surveys/create", json=body, headers=AUTH_HEADER)
    assert res.status_code == 422
    assert "2" in res.json()["detail"]


def test_create_survey_mc_too_many_options(client):
    """Multiple choice question with more than 6 options is rejected."""
    body = _mc_body()
    body["questions"][0]["answer_options"] = [
        {"option_text": f"Option {i}", "order_index": i} for i in range(7)
    ]

    with patch("routers.surveys.supabase_admin") as mock_admin:
        mock_admin.table.return_value = _chainable_table({"role": "survey_creator"})
        res = client.post("/surveys/create", json=body, headers=AUTH_HEADER)
    assert res.status_code == 422
    assert "6" in res.json()["detail"]


def test_create_survey_sa_with_options_rejected(client):
    """Short answer question that includes answer options is rejected."""
    body = _sa_body()
    body["questions"][0]["answer_options"] = [{"option_text": "Option A", "order_index": 0}]

    with patch("routers.surveys.supabase_admin") as mock_admin:
        mock_admin.table.return_value = _chainable_table({"role": "survey_creator"})
        res = client.post("/surveys/create", json=body, headers=AUTH_HEADER)
    assert res.status_code == 422


def test_create_survey_success_mc(client):
    """Valid MC survey is created and returns join_code."""
    creator_profile = {"role": "survey_creator"}
    join_code_check = []          # empty → join code is unique
    survey_insert   = [SURVEY_ROW]
    question_insert = [MC_QUESTION_ROW]
    option_insert   = [OPTION_ROW, OPTION_ROW_B]

    results = iter([join_code_check, survey_insert, question_insert, option_insert])

    with patch("routers.surveys.supabase_admin") as mock_admin, \
         patch("routers.surveys.get_supabase") as mock_get_sb:

        mock_admin.table.return_value = _chainable_table(creator_profile)
        mock_sb = MagicMock()
        mock_sb.table.side_effect = lambda _: _chainable_table(next(results))
        mock_get_sb.return_value = mock_sb

        res = client.post("/surveys/create", json=_mc_body(), headers=AUTH_HEADER)

    assert res.status_code == 201
    body = res.json()
    assert "join_code" in body
    assert "id" in body


def test_create_survey_success_sa(client):
    """Valid short-answer survey is created and returns join_code."""
    creator_profile = {"role": "survey_creator"}
    join_code_check = []
    survey_insert   = [SURVEY_ROW]
    question_insert = [SA_QUESTION_ROW]

    results = iter([join_code_check, survey_insert, question_insert])

    with patch("routers.surveys.supabase_admin") as mock_admin, \
         patch("routers.surveys.get_supabase") as mock_get_sb:

        mock_admin.table.return_value = _chainable_table(creator_profile)
        mock_sb = MagicMock()
        mock_sb.table.side_effect = lambda _: _chainable_table(next(results))
        mock_get_sb.return_value = mock_sb

        res = client.post("/surveys/create", json=_sa_body(), headers=AUTH_HEADER)

    assert res.status_code == 201
    assert "join_code" in res.json()


# ── POST /surveys/join ─────────────────────────────────────────────────────────

def _join_body(join_code=JOIN_CODE, user_id=OTHER_USER_ID):
    return {"join_code": join_code, "user_id": user_id}


def test_join_invalid_code(client):
    """Unknown join code returns 404."""
    with patch("routers.surveys.get_supabase") as mock_get_sb:
        mock_sb = MagicMock()
        mock_sb.table.return_value = _chainable_table([])
        mock_get_sb.return_value = mock_sb
        res = client.post("/surveys/join", json=_join_body(), headers=AUTH_HEADER)
    assert res.status_code == 404
    assert "join code" in res.json()["detail"].lower()


def test_join_expired_survey(client):
    """Joining a survey past its deadline returns 404."""
    expired_survey = {**SURVEY_ROW, "deadline": "2000-01-01T00:00:00+00:00"}
    with patch("routers.surveys.get_supabase") as mock_get_sb:
        mock_sb = MagicMock()
        mock_sb.table.return_value = _chainable_table([expired_survey])
        mock_get_sb.return_value = mock_sb
        res = client.post("/surveys/join", json=_join_body(), headers=AUTH_HEADER)
    assert res.status_code == 404
    assert "expired" in res.json()["detail"].lower()


def test_join_already_a_member(client):
    """User who already joined the survey is rejected with 403."""
    existing_member = {"user_id": OTHER_USER_ID, "survey_id": SURVEY_ID}
    results = iter([[SURVEY_ROW], [existing_member]])

    with patch("routers.surveys.get_supabase") as mock_get_sb:
        mock_sb = MagicMock()
        mock_sb.table.side_effect = lambda _: _chainable_table(next(results))
        mock_get_sb.return_value = mock_sb
        res = client.post("/surveys/join", json=_join_body(), headers=AUTH_HEADER)
    assert res.status_code == 403
    assert "already" in res.json()["detail"].lower()


def test_join_success(client):
    """Valid join code and new user returns 201 with survey_id and user_id."""
    member_row = {
        "user_id": OTHER_USER_ID,
        "survey_id": SURVEY_ID,
        "joined_at": "2026-01-01T00:00:00+00:00",
    }
    results = iter([[SURVEY_ROW], [], [member_row]])

    with patch("routers.surveys.get_supabase") as mock_get_sb:
        mock_sb = MagicMock()
        mock_sb.table.side_effect = lambda _: _chainable_table(next(results))
        mock_get_sb.return_value = mock_sb
        res = client.post("/surveys/join", json=_join_body(), headers=AUTH_HEADER)

    assert res.status_code == 201
    body = res.json()
    assert body["user_id"] == OTHER_USER_ID
    assert body["survey_id"] == SURVEY_ID


# ── GET /surveys/surveys_by_user/{user_id} ─────────────────────────────────────

def test_surveys_by_user_empty(client):
    """User with no joined surveys returns an empty list."""
    with patch("routers.surveys.get_supabase") as mock_get_sb:
        mock_sb = MagicMock()
        mock_sb.table.return_value = _chainable_table([])
        mock_get_sb.return_value = mock_sb
        res = client.get(f"/surveys/surveys_by_user/{CREATOR_USER_ID}", headers=AUTH_HEADER)
    assert res.status_code == 200
    assert res.json() == []


def test_surveys_by_user_returns_previews(client):
    """User with one joined survey returns a list with that survey's preview."""
    member_entry = {"survey_id": SURVEY_ID, "user_id": CREATOR_USER_ID}
    results = iter([[member_entry], [SURVEY_ROW]])

    with patch("routers.surveys.get_supabase") as mock_get_sb:
        mock_sb = MagicMock()
        mock_sb.table.side_effect = lambda _: _chainable_table(next(results))
        mock_get_sb.return_value = mock_sb
        res = client.get(f"/surveys/surveys_by_user/{CREATOR_USER_ID}", headers=AUTH_HEADER)

    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    assert body[0]["survey_id"] == SURVEY_ID
    assert body[0]["title"] == SURVEY_ROW["title"]


# ── POST /surveys/save_answers ─────────────────────────────────────────────────

def _save_answers_body(question_type="multiple_choice"):
    if question_type == "multiple_choice":
        answer = {
            "question_type": "multiple_choice",
            "answer_id": OPTION_ID,
            "answer_text": None,
        }
    else:
        answer = {
            "question_type": "short_answer",
            "answer_id": None,
            "answer_text": "My short answer",
        }
    return {
        "survey_id": SURVEY_ID,
        "user_id": CREATOR_USER_ID,
        "answers": {QUESTION_ID: answer},
    }


def test_save_answers_mc_success(client):
    """Saving a multiple choice answer upserts and returns 201."""
    with patch("routers.surveys.get_supabase") as mock_get_sb:
        mock_sb = MagicMock()
        mock_sb.table.return_value = _chainable_table([{"id": "some-uuid"}])
        mock_get_sb.return_value = mock_sb
        res = client.post(
            "/surveys/save_answers",
            json=_save_answers_body("multiple_choice"),
            headers=AUTH_HEADER,
        )
    assert res.status_code == 201


def test_save_answers_sa_success(client):
    """Saving a short answer upserts and returns 201."""
    with patch("routers.surveys.get_supabase") as mock_get_sb:
        mock_sb = MagicMock()
        mock_sb.table.return_value = _chainable_table([{"id": "some-uuid"}])
        mock_get_sb.return_value = mock_sb
        res = client.post(
            "/surveys/save_answers",
            json=_save_answers_body("short_answer"),
            headers=AUTH_HEADER,
        )
    assert res.status_code == 201


def test_save_answers_db_failure_returns_500(client):
    """If the upsert raises an exception, the endpoint returns 500."""
    with patch("routers.surveys.get_supabase") as mock_get_sb:
        mock_sb = MagicMock()
        mock_sb.table.side_effect = Exception("DB is down")
        mock_get_sb.return_value = mock_sb
        res = client.post(
            "/surveys/save_answers",
            json=_save_answers_body(),
            headers=AUTH_HEADER,
        )
    assert res.status_code == 500