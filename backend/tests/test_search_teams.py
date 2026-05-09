"""
Unit tests for GET /search/teams.
Covers: basic behaviour, has_space filter, sorting, question answer filter, and combined filters.
Uses FastAPI TestClient with mocked Supabase — no live DB required.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# ── Constants ─────────────────────────────────────────────────────────────────

SURVEY_ID    = "d0000000-0000-0000-0000-000000000001"
QUESTION_ID  = "e0000000-0000-0000-0000-000000000001"
OPTION_A     = "f0000000-0000-0000-0000-000000000001"
CURRENT_USER = "a0000000-0000-0000-0000-000000000001"
USER_2       = "a0000000-0000-0000-0000-000000000002"
USER_3       = "a0000000-0000-0000-0000-000000000003"
TEAM_1       = "b0000000-0000-0000-0000-000000000001"
TEAM_2       = "b0000000-0000-0000-0000-000000000002"
TEAM_3       = "b0000000-0000-0000-0000-000000000003"
AUTH         = {"Authorization": "Bearer fake-token"}
BASE         = f"/search/teams?survey_id={SURVEY_ID}"

# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_result(data):
    m = MagicMock()
    m.data = data
    return m


def _chainable(execute_data):
    """Mock for chains ending in .execute()."""
    m = MagicMock()
    for method in ("select", "eq", "neq", "is_", "ilike"):
        getattr(m, method).return_value = m
    m.execute.return_value = _make_result(execute_data)
    return m


def _chainable_ms(ms_return):
    """Mock for chains ending in .maybe_single().execute().
    ms_return: None (no row found) or _make_result({...}) for a found row.
    """
    m = MagicMock()
    for method in ("select", "eq", "neq", "is_", "ilike"):
        getattr(m, method).return_value = m
    ms = MagicMock()
    ms.execute.return_value = ms_return
    m.maybe_single.return_value = ms
    return m


def _team_row(team_id, name, member_ids, max_size=4, description=None):
    return {
        "id": team_id,
        "name": name,
        "description": description,
        "max_size": max_size,
        "created_by": CURRENT_USER,
        "team_members": [
            {"user_id": uid, "status": "approved", "profiles": {"full_name": f"User {i}"}}
            for i, uid in enumerate(member_ids)
        ],
    }


def _three_teams():
    """Three teams with different names and sizes (unsorted)."""
    return [
        _team_row(TEAM_1, "Zara's team",  [USER_2],             max_size=4),  # 3 spots
        _team_row(TEAM_2, "Alice's team", [USER_2, USER_3],     max_size=4),  # 2 spots
        _team_row(TEAM_3, "Mike's team",  [USER_2, USER_3, "u4"], max_size=4),  # 1 spot
    ]


# ── Fixture ───────────────────────────────────────────────────────────────────

@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr("auth.get_user_id", lambda: CURRENT_USER)
    from main import app
    return TestClient(app, raise_server_exceptions=True)


# ── Group 1: Basic behaviour ──────────────────────────────────────────────────

def test_returns_empty_when_no_teams(client):
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.return_value = _chainable([])
        res = client.get(BASE, headers=AUTH)
    assert res.status_code == 200
    body = res.json()
    assert body["results"] == []
    assert body["total"] == 0
    assert body["page"] == 1


def test_filters_out_non_approved_members(client):
    row = {
        "id": TEAM_1,
        "name": "Alice's team",
        "description": None,
        "max_size": 4,
        "created_by": CURRENT_USER,
        "team_members": [
            {"user_id": USER_2, "status": "approved", "profiles": {"full_name": "Alice"}},
            {"user_id": USER_3, "status": "pending",  "profiles": {"full_name": "Bob"}},
        ],
    }
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.return_value = _chainable([row])
        res = client.get(BASE, headers=AUTH)
    assert res.status_code == 200
    members = res.json()["results"][0]["team_members"]
    assert len(members) == 1
    assert members[0]["user_id"] == USER_2


def test_response_shape(client):
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.return_value = _chainable([_team_row(TEAM_1, "Alice's team", [USER_2])])
        res = client.get(BASE, headers=AUTH)
    assert res.status_code == 200
    body = res.json()
    assert "results" in body and "total" in body and "page" in body
    t = body["results"][0]
    for field in ("id", "name", "description", "max_size", "created_by", "team_members"):
        assert field in t
    assert "user_id"    in t["team_members"][0]
    assert "full_name"  in t["team_members"][0]


# ── Group 2: has_space filter ─────────────────────────────────────────────────

def test_has_space_excludes_full_teams(client):
    full    = _team_row(TEAM_1, "Full team",    [USER_2, USER_3, "u3", "u4"], max_size=4)
    partial = _team_row(TEAM_2, "Partial team", [USER_2],                      max_size=4)
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.return_value = _chainable([full, partial])
        res = client.get(BASE + "&has_space=true", headers=AUTH)
    ids = [t["id"] for t in res.json()["results"]]
    assert TEAM_1 not in ids
    assert TEAM_2 in ids


def test_without_has_space_includes_full_teams(client):
    full    = _team_row(TEAM_1, "Full team",    [USER_2, USER_3, "u3", "u4"], max_size=4)
    partial = _team_row(TEAM_2, "Partial team", [USER_2],                      max_size=4)
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.return_value = _chainable([full, partial])
        res = client.get(BASE, headers=AUTH)
    ids = [t["id"] for t in res.json()["results"]]
    assert TEAM_1 in ids
    assert TEAM_2 in ids


# ── Group 3: Sorting ──────────────────────────────────────────────────────────

def test_sort_by_name_asc(client):
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.return_value = _chainable(_three_teams())
        res = client.get(BASE + "&sort_by=name&sort_order=asc", headers=AUTH)
    names = [t["name"] for t in res.json()["results"]]
    assert names == sorted(names, key=str.lower)


def test_sort_by_name_desc(client):
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.return_value = _chainable(_three_teams())
        res = client.get(BASE + "&sort_by=name&sort_order=desc", headers=AUTH)
    names = [t["name"] for t in res.json()["results"]]
    assert names == sorted(names, key=str.lower, reverse=True)


def test_sort_by_spots_asc(client):
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.return_value = _chainable(_three_teams())
        res = client.get(BASE + "&sort_by=spots&sort_order=asc", headers=AUTH)
    spots = [t["max_size"] - len(t["team_members"]) for t in res.json()["results"]]
    assert spots == sorted(spots)


def test_sort_by_spots_desc(client):
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.return_value = _chainable(_three_teams())
        res = client.get(BASE + "&sort_by=spots&sort_order=desc", headers=AUTH)
    spots = [t["max_size"] - len(t["team_members"]) for t in res.json()["results"]]
    assert spots == sorted(spots, reverse=True)


def test_no_sort_preserves_db_order(client):
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.return_value = _chainable(_three_teams())
        res = client.get(BASE, headers=AUTH)
    ids = [t["id"] for t in res.json()["results"]]
    assert ids == [TEAM_1, TEAM_2, TEAM_3]


# ── Group 5: Question answer filter ──────────────────────────────────────────

def test_question_filter_no_answer_returns_all(client):
    calls = iter([
        _chainable_ms(None),            # user has no answer row
        _chainable(_three_teams()),     # teams fetch
    ])
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.side_effect = lambda _: next(calls)
        res = client.get(BASE + f"&filter_question_id={QUESTION_ID}", headers=AUTH)
    assert res.status_code == 200
    assert len(res.json()["results"]) == 3


def test_question_filter_keeps_matching_teams(client):
    team1 = _team_row(TEAM_1, "Team 1", [USER_2])  # USER_2 answered OPTION_A
    team2 = _team_row(TEAM_2, "Team 2", [USER_3])  # USER_3 did not
    calls = iter([
        _chainable_ms(_make_result({"answer_option_id": OPTION_A, "answer_text": None})),
        _chainable([{"user_id": USER_2}]),
        _chainable([team1, team2]),
    ])
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.side_effect = lambda _: next(calls)
        res = client.get(BASE + f"&filter_question_id={QUESTION_ID}", headers=AUTH)
    ids = [t["id"] for t in res.json()["results"]]
    assert TEAM_1 in ids
    assert TEAM_2 not in ids


def test_question_filter_excludes_nonmatching_teams(client):
    team1 = _team_row(TEAM_1, "Team 1", [USER_2])
    team2 = _team_row(TEAM_2, "Team 2", [USER_3])
    calls = iter([
        _chainable_ms(_make_result({"answer_option_id": OPTION_A, "answer_text": None})),
        _chainable([{"user_id": USER_2}]),
        _chainable([team1, team2]),
    ])
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.side_effect = lambda _: next(calls)
        res = client.get(BASE + f"&filter_question_id={QUESTION_ID}", headers=AUTH)
    assert TEAM_2 not in [t["id"] for t in res.json()["results"]]


def test_question_filter_no_matching_users_returns_empty(client):
    calls = iter([
        _chainable_ms(_make_result({"answer_option_id": OPTION_A, "answer_text": None})),
        _chainable([]),                              # nobody else answered the same
        _chainable([_team_row(TEAM_1, "Team 1", [USER_2])]),
    ])
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.side_effect = lambda _: next(calls)
        res = client.get(BASE + f"&filter_question_id={QUESTION_ID}", headers=AUTH)
    assert res.json()["results"] == []


def test_question_filter_short_answer_match(client):
    team1 = _team_row(TEAM_1, "Team 1", [USER_2])
    team2 = _team_row(TEAM_2, "Team 2", [USER_3])
    calls = iter([
        _chainable_ms(_make_result({"answer_option_id": None, "answer_text": "I love Python"})),
        _chainable([{"user_id": USER_2}]),
        _chainable([team1, team2]),
    ])
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.side_effect = lambda _: next(calls)
        res = client.get(BASE + f"&filter_question_id={QUESTION_ID}", headers=AUTH)
    ids = [t["id"] for t in res.json()["results"]]
    assert TEAM_1 in ids
    assert TEAM_2 not in ids


# ── Group 6: Combined filters ─────────────────────────────────────────────────

def test_has_space_and_sort_combined(client):
    full     = _team_row(TEAM_1, "Zara's team",  [USER_2, USER_3, "u3", "u4"], max_size=4)
    partial1 = _team_row(TEAM_2, "Mike's team",  [USER_2],                      max_size=4)
    partial2 = _team_row(TEAM_3, "Alice's team", [USER_2, USER_3],              max_size=4)
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.return_value = _chainable([full, partial1, partial2])
        res = client.get(BASE + "&has_space=true&sort_by=name&sort_order=asc", headers=AUTH)
    results = res.json()["results"]
    assert TEAM_1 not in [t["id"] for t in results]
    names = [t["name"] for t in results]
    assert names == sorted(names, key=str.lower)


def test_sort_and_question_filter_combined(client):
    team1 = _team_row(TEAM_1, "Zara's team",  [USER_2],       max_size=4)  # 3 spots, matches
    team2 = _team_row(TEAM_2, "Alice's team", [USER_2, USER_3], max_size=4)  # 2 spots, matches
    team3 = _team_row(TEAM_3, "Mike's team",  ["u5"],          max_size=4)  # no matching member
    calls = iter([
        _chainable_ms(_make_result({"answer_option_id": OPTION_A, "answer_text": None})),
        _chainable([{"user_id": USER_2}]),
        _chainable([team1, team2, team3]),
    ])
    with patch("routers.search.supabase") as mock_db:
        mock_db.table.side_effect = lambda _: next(calls)
        res = client.get(BASE + f"&sort_by=spots&sort_order=asc&filter_question_id={QUESTION_ID}", headers=AUTH)
    results = res.json()["results"]
    assert TEAM_3 not in [t["id"] for t in results]
    spots = [t["max_size"] - len(t["team_members"]) for t in results]
    assert spots == sorted(spots)
