"""
Unit tests for the recommendations endpoints and scoring logic:
  GET /recommendations/users/{user_id}
  GET /recommendations/survey/{survey_id}/users/{user_id}
  GET /recommendations/survey/{survey_id}/responses
  GET /recommendations/survey/{survey_id}/teams
  GET /recommendations/survey/{survey_id}/matches

  Pure functions:
    calculate_user_compatibility_score
    calculate_team_compatibility_score
    parse_recommendation_result

Uses FastAPI's TestClient and mocks Supabase calls so no live DB is needed.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from auth import get_current_user
from routers.recommendations import (
    calculate_user_compatibility_score,
    calculate_team_compatibility_score,
    parse_recommendation_result,
)

# ── Shared UUIDs ──────────────────────────────────────────────────────────────

SURVEY_ID  = "aaaa0000-0000-0000-0000-000000000001"
USER_ID_1  = "bbbb0000-0000-0000-0000-000000000002"
USER_ID_2  = "cccc0000-0000-0000-0000-000000000003"
USER_ID_3  = "dddd0000-0000-0000-0000-000000000004"
TEAM_ID_1  = "eeee0000-0000-0000-0000-000000000005"
TEAM_ID_2  = "ffff0000-0000-0000-0000-000000000006"
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


def _with_user(app, user_id):
    """Helper to temporarily override the current user to a different user_id."""
    app.dependency_overrides[get_current_user] = lambda: {"sub": user_id}


AUTH = {"Authorization": "Bearer fake-token"}

# ── Sample data ───────────────────────────────────────────────────────────────

PROFILE_ROW = {
    "id": USER_ID_1,
    "email": "alice@amherst.edu",
    "full_name": "Alice Chen",
    "school": "Amherst College",
    "major": "Computer Science",
    "grad_year": 2026,
    "bio": None,
    "contact_info": None,
}

QUESTIONS = [
    {"id": Q_ID_1, "prompt": "Working style", "question_type": "multiple_choice", "order_index": 0},
    {"id": Q_ID_2, "prompt": "Availability",  "question_type": "multiple_choice", "order_index": 1},
]

RESPONSES_USER_1 = [
    {"question_id": Q_ID_1, "answer_option_id": OPT_A, "answer_text": None},
    {"question_id": Q_ID_2, "answer_option_id": OPT_B, "answer_text": None},
]

RESPONSES_USER_2 = [
    {"question_id": Q_ID_1, "answer_option_id": OPT_A, "answer_text": None},  # same
    {"question_id": Q_ID_2, "answer_option_id": OPT_A, "answer_text": None},  # different
]

# ── test for GET /recommendations/users/{user_id} ──────────────────────────────────────

class TestGetUserById:
    def test_returns_profile(self, client):
        with patch("routers.recommendations.supabase") as mock_db:
            mock_db.table.return_value = _chainable_table(PROFILE_ROW)
            res = client.get(f"/recommendations/users/{USER_ID_1}", headers=AUTH)
        assert res.status_code == 200
        assert res.json()["id"] == USER_ID_1
        assert res.json()["full_name"] == "Alice Chen"

    def test_user_not_found_returns_404(self, client):
        with patch("routers.recommendations.supabase") as mock_db:
            mock_db.table.return_value = _chainable_table(None)
            res = client.get(f"/recommendations/users/{USER_ID_1}", headers=AUTH)
        assert res.status_code == 404
        assert "User not found" in res.json()["detail"]


# ── test for GET /recommendations/survey/{survey_id}/users/{user_id} ──────────────────

class TestGetUserSurveyAnswers:
    def test_returns_paired_responses(self, client):
        results = iter([QUESTIONS, RESPONSES_USER_1])
        with patch("routers.recommendations.supabase") as mock_db:
            mock_db.table.side_effect = lambda _: _chainable_table(next(results))
            res = client.get(
                f"/recommendations/survey/{SURVEY_ID}/users/{USER_ID_1}",
                headers=AUTH,
            )
        assert res.status_code == 200
        body = res.json()
        assert body["user_id"] == USER_ID_1
        assert body["survey_id"] == SURVEY_ID
        assert len(body["responses"]) == 2
        # First response should include the question prompt and the raw answer
        first = body["responses"][0]
        assert first["question_id"] == Q_ID_1
        assert first["prompt"] == "Working style"
        assert first["answer"]["answer_option_id"] == OPT_A

    def test_no_questions_returns_404(self, client):
        with patch("routers.recommendations.supabase") as mock_db:
            mock_db.table.return_value = _chainable_table([])
            res = client.get(
                f"/recommendations/survey/{SURVEY_ID}/users/{USER_ID_1}",
                headers=AUTH,
            )
        assert res.status_code == 404
        assert "No questions" in res.json()["detail"]

    def test_unanswered_questions_have_null_answer(self, client):
        # User has answered only the first question
        partial_responses = [RESPONSES_USER_1[0]]
        results = iter([QUESTIONS, partial_responses])
        with patch("routers.recommendations.supabase") as mock_db:
            mock_db.table.side_effect = lambda _: _chainable_table(next(results))
            res = client.get(
                f"/recommendations/survey/{SURVEY_ID}/users/{USER_ID_1}",
                headers=AUTH,
            )
        assert res.status_code == 200
        responses = res.json()["responses"]
        assert responses[0]["answer"] is not None
        assert responses[1]["answer"] is None


# ── test for GET /recommendations/survey/{survey_id}/responses ────────────────────────

class TestGetAllSurveyResponses:
    def _all_responses(self):
        """Both users' rows merged into one flat list as Supabase would return."""
        return [
            {"user_id": USER_ID_1, "question_id": Q_ID_1, "answer_option_id": OPT_A, "answer_text": None},
            {"user_id": USER_ID_1, "question_id": Q_ID_2, "answer_option_id": OPT_B, "answer_text": None},
            {"user_id": USER_ID_2, "question_id": Q_ID_1, "answer_option_id": OPT_A, "answer_text": None},
            {"user_id": USER_ID_2, "question_id": Q_ID_2, "answer_option_id": OPT_A, "answer_text": None},
        ]

    def test_groups_responses_by_user(self, client):
        results = iter([QUESTIONS, self._all_responses()])
        with patch("routers.recommendations.supabase") as mock_db:
            mock_db.table.side_effect = lambda _: _chainable_table(next(results))
            res = client.get(f"/recommendations/survey/{SURVEY_ID}/responses", headers=AUTH)
        assert res.status_code == 200
        body = res.json()
        assert body["survey_id"] == SURVEY_ID
        assert USER_ID_1 in body["users"]
        assert USER_ID_2 in body["users"]
        # Each user should have entries keyed by question id
        assert Q_ID_1 in body["users"][USER_ID_1]
        assert Q_ID_2 in body["users"][USER_ID_2]

    def test_no_questions_returns_404(self, client):
        with patch("routers.recommendations.supabase") as mock_db:
            mock_db.table.return_value = _chainable_table([])
            res = client.get(f"/recommendations/survey/{SURVEY_ID}/responses", headers=AUTH)
        assert res.status_code == 404

    def test_no_responses_returns_empty_users(self, client):
        results = iter([QUESTIONS, []])
        with patch("routers.recommendations.supabase") as mock_db:
            mock_db.table.side_effect = lambda _: _chainable_table(next(results))
            res = client.get(f"/recommendations/survey/{SURVEY_ID}/responses", headers=AUTH)
        assert res.status_code == 200
        assert res.json()["users"] == {}


# ── test for GET /recommendations/survey/{survey_id}/teams ─────────────────────────────

class TestGetSurveyTeams:
    def _teams(self):
        return [
            {"id": TEAM_ID_1, "name": "Team Alpha", "description": "A team", "max_size": 4},
            {"id": TEAM_ID_2, "name": "Team Beta",  "description": "B team", "max_size": 3},
        ]

    def _members(self):
        return [
            {
                "team_id": TEAM_ID_1,
                "user_id": USER_ID_1,
                "profiles": {"full_name": "Alice Chen", "school": "Amherst College", "major": "CS", "grad_year": 2026},
            },
            {
                "team_id": TEAM_ID_2,
                "user_id": USER_ID_2,
                "profiles": {"full_name": "Bob Lee", "school": "Smith College", "major": "Math", "grad_year": 2025},
            },
        ]

    def test_returns_teams_with_members(self, client):
        results = iter([self._teams(), self._members()])
        with patch("routers.recommendations.supabase") as mock_db:
            mock_db.table.side_effect = lambda _: _chainable_table(next(results))
            res = client.get(f"/recommendations/survey/{SURVEY_ID}/teams", headers=AUTH)
        assert res.status_code == 200
        body = res.json()
        assert TEAM_ID_1 in body
        assert body[TEAM_ID_1]["name"] == "Team Alpha"
        assert len(body[TEAM_ID_1]["members"]) == 1
        assert body[TEAM_ID_1]["members"][0]["full_name"] == "Alice Chen"

    def test_no_teams_returns_empty(self, client):
        with patch("routers.recommendations.supabase") as mock_db:
            mock_db.table.return_value = _chainable_table([])
            res = client.get(f"/recommendations/survey/{SURVEY_ID}/teams", headers=AUTH)
        assert res.status_code == 200
        assert res.json() == {}

    def test_member_with_missing_profile_is_handled(self, client):
        members_no_profile = [
            {"team_id": TEAM_ID_1, "user_id": USER_ID_3, "profiles": None},
        ]
        results = iter([self._teams()[:1], members_no_profile])
        with patch("routers.recommendations.supabase") as mock_db:
            mock_db.table.side_effect = lambda _: _chainable_table(next(results))
            res = client.get(f"/recommendations/survey/{SURVEY_ID}/teams", headers=AUTH)
        assert res.status_code == 200
        member = res.json()[TEAM_ID_1]["members"][0]
        assert member["full_name"] is None


# ── test for function calculate_user_compatibility_score ─────────────────────────

class TestCalculateUserCompatibilityScore:
    """
    all_survey_responses format mirrors what get_all_survey_responses returns:
      { "survey_id": ..., "users": { user_id: { question_id: { prompt, answer: {...} } } } }
    """

    def _make_responses(self, u1_opts, u2_opts):
        """Build the nested structure with two users each answering Q_ID_1 and Q_ID_2."""
        def _entry(opt):
            return {"prompt": "Q", "question_type": "multiple_choice", "order_index": 0,
                    "answer": {"answer_option_id": opt, "answer_text": None}}
        return {
            "survey_id": SURVEY_ID,
            "users": {
                USER_ID_1: {Q_ID_1: _entry(u1_opts[0]), Q_ID_2: _entry(u1_opts[1])},
                USER_ID_2: {Q_ID_1: _entry(u2_opts[0]), Q_ID_2: _entry(u2_opts[1])},
            }
        }

    def test_perfect_match_returns_one(self):
        data = self._make_responses([OPT_A, OPT_B], [OPT_A, OPT_B])
        score = calculate_user_compatibility_score(USER_ID_1, USER_ID_2, data)
        assert score == 1.0

    def test_no_match_returns_zero(self):
        data = self._make_responses([OPT_A, OPT_A], [OPT_B, OPT_B])
        score = calculate_user_compatibility_score(USER_ID_1, USER_ID_2, data)
        assert score == 0.0

    def test_partial_match_returns_fraction(self):
        # Q_ID_1 matches, Q_ID_2 does not -> 1/2
        data = self._make_responses([OPT_A, OPT_A], [OPT_A, OPT_B])
        score = calculate_user_compatibility_score(USER_ID_1, USER_ID_2, data)
        assert score == pytest.approx(0.5)

    def test_missing_user_returns_zero(self):
        data = self._make_responses([OPT_A, OPT_B], [OPT_A, OPT_B])
        score = calculate_user_compatibility_score("nonexistent-user", USER_ID_2, data)
        assert score == 0.0

    def test_empty_questions_returns_zero(self):
        data = {"survey_id": SURVEY_ID, "users": {USER_ID_1: {}, USER_ID_2: {}}}
        score = calculate_user_compatibility_score(USER_ID_1, USER_ID_2, data)
        assert score == 0.0


# ── test for function calculate_team_compatibility_score ─────────────────────────

class TestCalculateTeamCompatibilityScore:
    def _make_responses(self, u1_opt, u2_opt, u3_opt):
        def _entry(opt):
            return {"prompt": "Q", "question_type": "multiple_choice", "order_index": 0,
                    "answer": {"answer_option_id": opt, "answer_text": None}}
        return {
            "survey_id": SURVEY_ID,
            "users": {
                USER_ID_1: {Q_ID_1: _entry(u1_opt)},
                USER_ID_2: {Q_ID_1: _entry(u2_opt)},
                USER_ID_3: {Q_ID_1: _entry(u3_opt)},
            }
        }

    def _teams(self, t1_members, t2_members):
        def _m(uid):
            return {"user_id": uid, "full_name": None, "school": None, "major": None, "grad_year": None}
        return {
            TEAM_ID_1: {"members": [_m(u) for u in t1_members]},
            TEAM_ID_2: {"members": [_m(u) for u in t2_members]},
        }

    def test_all_members_match_returns_one(self):
        responses = self._make_responses(OPT_A, OPT_A, OPT_A)
        teams = self._teams([USER_ID_1], [USER_ID_2])
        score = calculate_team_compatibility_score(TEAM_ID_1, TEAM_ID_2, responses, teams)
        assert score == 1.0

    def test_no_members_match_returns_zero(self):
        responses = self._make_responses(OPT_A, OPT_B, OPT_B)
        teams = self._teams([USER_ID_1], [USER_ID_2])
        score = calculate_team_compatibility_score(TEAM_ID_1, TEAM_ID_2, responses, teams)
        assert score == 0.0

    def test_multi_member_averages_pairwise_scores(self):
        # U1 vs U2: match (OPT_A == OPT_A) -> 1.0
        # U1 vs U3: no match (OPT_A != OPT_B) -> 0.0
        # average = 0.5
        responses = self._make_responses(OPT_A, OPT_A, OPT_B)
        teams = self._teams([USER_ID_1], [USER_ID_2, USER_ID_3])
        score = calculate_team_compatibility_score(TEAM_ID_1, TEAM_ID_2, responses, teams)
        assert score == pytest.approx(0.5)

    def test_empty_team_returns_zero(self):
        responses = self._make_responses(OPT_A, OPT_A, OPT_A)
        teams = self._teams([], [USER_ID_2])
        score = calculate_team_compatibility_score(TEAM_ID_1, TEAM_ID_2, responses, teams)
        assert score == 0.0


# ── test for function parse_recommendation_result ────────────────────────────────

class TestParseRecommendationResult:
    def _team_entry(self, team_id, name, score, members, max_size=4, description="A team"):
        return {
            team_id: {
                "name": name,
                "description": description,
                "max_size": max_size,
                "score": score,
                "members": members,
            }
        }

    def _member(self, uid="u1", name="Alice", school="Amherst", major="CS", year=2026):
        return {"user_id": uid, "full_name": name, "school": school, "major": major, "grad_year": year}

    def test_skips_current_user_team(self):
        data = {TEAM_ID_1: {"name": "Mine", "description": "", "max_size": 4, "score": -1, "members": []}}
        result = parse_recommendation_result(data)
        assert result == []

    def test_solo_team_has_type_person(self):
        data = {TEAM_ID_1: {"name": "Solo", "description": "", "max_size": 4, "score": 0.8,
                             "members": [self._member()]}}
        result = parse_recommendation_result(data)
        assert result[0]["type"] == "person"

    def test_multi_member_team_has_type_team(self):
        data = {TEAM_ID_1: {"name": "Group", "description": "", "max_size": 4, "score": 0.5,
                             "members": [self._member("u1"), self._member("u2")]}}
        result = parse_recommendation_result(data)
        assert result[0]["type"] == "team"

    def test_match_pct_is_rounded_percentage(self):
        data = {TEAM_ID_1: {"name": "T", "description": "", "max_size": 4, "score": 0.756,
                             "members": [self._member()]}}
        result = parse_recommendation_result(data)
        assert result[0]["matchPct"] == 76

    def test_spots_left_is_correct(self):
        data = {TEAM_ID_1: {"name": "T", "description": "", "max_size": 4, "score": 0.5,
                             "members": [self._member("u1"), self._member("u2")]}}
        result = parse_recommendation_result(data)
        assert result[0]["spotsLeft"] == 2

    def test_sorted_by_match_pct_descending(self):
        data = {
            TEAM_ID_1: {"name": "Low",  "description": "", "max_size": 4, "score": 0.3, "members": [self._member("u1")]},
            TEAM_ID_2: {"name": "High", "description": "", "max_size": 4, "score": 0.9, "members": [self._member("u2")]},
        }
        result = parse_recommendation_result(data)
        assert result[0]["matchPct"] > result[1]["matchPct"]

    def test_member_fields_are_mapped_correctly(self):
        member = self._member("u1", "Alice Chen", "Amherst College", "CS", 2026)
        data = {TEAM_ID_1: {"name": "T", "description": "", "max_size": 4, "score": 1.0, "members": [member]}}
        result = parse_recommendation_result(data)
        m = result[0]["members"][0]
        assert m["id"] == "u1"
        assert m["name"] == "Alice Chen"
        assert m["school"] == "Amherst College"
        assert m["major"] == "CS"
        assert m["gradYear"] == 2026


# ── test for GET /recommendations/survey/{survey_id}/matches ──────────────────────────

class TestGetUserMatches:
    """
    This endpoint chains get_survey_teams -> get_all_survey_responses -> scoring.
    We patch supabase at the router level and drive table() calls in order.
    """

    def _teams_data(self):
        return [
            {"id": TEAM_ID_1, "name": "Team Alpha", "description": "desc", "max_size": 4},
            {"id": TEAM_ID_2, "name": "Team Beta",  "description": "desc", "max_size": 4},
        ]

    def _members_data(self):
        return [
            {"team_id": TEAM_ID_1, "user_id": USER_ID_1,
             "profiles": {"full_name": "Alice", "school": "Amherst", "major": "CS", "grad_year": 2026}},
            {"team_id": TEAM_ID_2, "user_id": USER_ID_2,
             "profiles": {"full_name": "Bob", "school": "Smith", "major": "Math", "grad_year": 2025}},
        ]

    def _questions_data(self):
        return QUESTIONS

    def _responses_data(self):
        return [
            {"user_id": USER_ID_1, "question_id": Q_ID_1, "answer_option_id": OPT_A, "answer_text": None},
            {"user_id": USER_ID_1, "question_id": Q_ID_2, "answer_option_id": OPT_B, "answer_text": None},
            {"user_id": USER_ID_2, "question_id": Q_ID_1, "answer_option_id": OPT_A, "answer_text": None},
            {"user_id": USER_ID_2, "question_id": Q_ID_2, "answer_option_id": OPT_B, "answer_text": None},
        ]

    def _call_sequence(self):
        """
        Table call order inside get_user_matches:
          1. teams (get_survey_teams)
          2. team_members (get_survey_teams)
          3. questions (get_all_survey_responses)
          4. survey_responses (get_all_survey_responses)
        """
        return iter([
            self._teams_data(),
            self._members_data(),
            self._questions_data(),
            self._responses_data(),
        ])

    def test_returns_ranked_list(self, client):
        seq = self._call_sequence()
        with patch("routers.recommendations.supabase") as mock_db:
            mock_db.table.side_effect = lambda _: _chainable_table(next(seq))
            res = client.get(f"/recommendations/survey/{SURVEY_ID}/matches", headers=AUTH)
        assert res.status_code == 200
        body = res.json()
        assert isinstance(body, list)
        assert len(body) == 1  # only TEAM_ID_2; own team is excluded
        assert body[0]["id"] == TEAM_ID_2

    def test_match_pct_is_between_0_and_100(self, client):
        seq = self._call_sequence()
        with patch("routers.recommendations.supabase") as mock_db:
            mock_db.table.side_effect = lambda _: _chainable_table(next(seq))
            res = client.get(f"/recommendations/survey/{SURVEY_ID}/matches", headers=AUTH)
        assert res.status_code == 200
        for match in res.json():
            assert 0 <= match["matchPct"] <= 100
        assert res.status_code == 200
        for match in res.json():
            assert 0 <= match["matchPct"] <= 100

    def test_user_not_in_any_team_returns_404(self, client):
        from main import app
        # Switch to a user who is not in any team
        _with_user(app, USER_ID_3)
        seq = iter([self._teams_data(), self._members_data(),
                    self._questions_data(), self._responses_data()])
        with patch("routers.recommendations.supabase") as mock_db:
            mock_db.table.side_effect = lambda _: _chainable_table(next(seq))
            res = client.get(f"/recommendations/survey/{SURVEY_ID}/matches", headers=AUTH)
        assert res.status_code == 404
        assert "not in any team" in res.json()["detail"]
