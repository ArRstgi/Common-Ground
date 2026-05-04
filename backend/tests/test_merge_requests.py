"""
Simple unit tests for the merge-request endpoints:
  POST /teams/{team_id}/merge-requests
  POST /teams/{team_id}/merge-requests/{rid}/approve
  POST /teams/{team_id}/merge-requests/{rid}/reject

Uses FastAPI's TestClient and mocks Supabase calls so no live DB is needed.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# ── Fixtures ──────────────────────────────────────────────────────────────────

REQUESTING_TEAM_ID = "aaaa0000-0000-0000-0000-000000000001"
TARGET_TEAM_ID     = "bbbb0000-0000-0000-0000-000000000002"
CREATOR_USER_ID    = "cccc0000-0000-0000-0000-000000000003"
OTHER_USER_ID      = "dddd0000-0000-0000-0000-000000000004"

MERGE_REQUEST_ROW = {
    "id": "eeee0000-0000-0000-0000-000000000005",
    "requesting_team_id": REQUESTING_TEAM_ID,
    "target_team_id": TARGET_TEAM_ID,
    "status": "pending",
    "created_at": "2026-04-28T00:00:00+00:00",
}


def _make_result(data):
    m = MagicMock()
    m.data = data
    return m


def _chainable_table(data):
    """Return a mock table that chains select/eq/limit/insert/update and returns data on execute()."""
    m = MagicMock()
    m.select.return_value = m
    m.eq.return_value = m
    m.limit.return_value = m
    m.insert.return_value = m
    m.update.return_value = m
    m.execute.return_value = _make_result(data)
    return m


# ── App setup ─────────────────────────────────────────────────────────────────

@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr("auth.get_user_id", lambda: CREATOR_USER_ID)
    from main import app
    return TestClient(app, raise_server_exceptions=True)


def _post(client, target=TARGET_TEAM_ID, requesting=REQUESTING_TEAM_ID):
    return client.post(
        f"/teams/{target}/merge-requests",
        json={"requesting_team_id": requesting},
        headers={"Authorization": "Bearer fake-token"},
    )


# ── Tests ──────────────────────────────────────────────────────────────────────

def test_self_merge_rejected(client):
    res = client.post(
        f"/teams/{REQUESTING_TEAM_ID}/merge-requests",
        json={"requesting_team_id": REQUESTING_TEAM_ID},
        headers={"Authorization": "Bearer fake-token"},
    )
    assert res.status_code == 400
    assert "itself" in res.json()["detail"]


def test_requesting_team_not_found(client):
    with patch("routers.teams.supabase_admin") as mock_db:
        mock_db.table.return_value = _chainable_table([])
        res = _post(client)
    assert res.status_code == 404
    assert "Requesting team" in res.json()["detail"]


def test_not_team_creator_forbidden(client):
    req_team_row = {"id": REQUESTING_TEAM_ID, "created_by": OTHER_USER_ID}

    with patch("routers.teams.supabase_admin") as mock_db:
        mock_db.table.return_value = _chainable_table([req_team_row])
        res = _post(client)
    assert res.status_code == 403


def test_target_team_not_found(client):
    req_team_row = {"id": REQUESTING_TEAM_ID, "created_by": CREATOR_USER_ID}
    results = iter([[req_team_row], []])

    def table_side_effect(name):
        m = _chainable_table(next(results))
        return m

    with patch("routers.teams.supabase_admin") as mock_db:
        mock_db.table.side_effect = table_side_effect
        res = _post(client)
    assert res.status_code == 404
    assert "Target team" in res.json()["detail"]


def test_duplicate_pending_request_rejected(client):
    req_team_row    = {"id": REQUESTING_TEAM_ID, "created_by": CREATOR_USER_ID}
    target_team_row = {"id": TARGET_TEAM_ID}
    existing_row    = {"id": "existing-uuid"}
    results = iter([[req_team_row], [target_team_row], [existing_row]])

    with patch("routers.teams.supabase_admin") as mock_db:
        mock_db.table.side_effect = lambda _: _chainable_table(next(results))
        res = _post(client)
    assert res.status_code == 409


def test_successful_merge_request(client):
    req_team_row    = {"id": REQUESTING_TEAM_ID, "created_by": CREATOR_USER_ID}
    target_team_row = {"id": TARGET_TEAM_ID}
    results = iter([[req_team_row], [target_team_row], [], [MERGE_REQUEST_ROW]])

    with patch("routers.teams.supabase_admin") as mock_db:
        mock_db.table.side_effect = lambda _: _chainable_table(next(results))
        res = _post(client)

    assert res.status_code == 201
    body = res.json()
    assert body["requesting_team_id"] == REQUESTING_TEAM_ID
    assert body["target_team_id"]     == TARGET_TEAM_ID
    assert body["status"]             == "pending"


MERGE_REQUEST_ID = MERGE_REQUEST_ROW["id"]

# ── Approve / Reject helpers ───────────────────────────────────────────────────

def _approve(client, team_id=TARGET_TEAM_ID, rid=MERGE_REQUEST_ID):
    return client.post(
        f"/teams/{team_id}/merge-requests/{rid}/approve",
        headers={"Authorization": "Bearer fake-token"},
    )

def _reject(client, team_id=TARGET_TEAM_ID, rid=MERGE_REQUEST_ID):
    return client.post(
        f"/teams/{team_id}/merge-requests/{rid}/reject",
        headers={"Authorization": "Bearer fake-token"},
    )

def _approved_row():
    return {**MERGE_REQUEST_ROW, "status": "approved"}

def _rejected_row():
    return {**MERGE_REQUEST_ROW, "status": "rejected"}


# ── Approve tests ─────────────────────────────────────────────────────────────

def test_approve_not_target_owner_forbidden(client):
    # _assert_target_owner: target team exists but belongs to someone else
    target_row = {"created_by": OTHER_USER_ID}
    with patch("routers.teams.supabase_admin") as mock_db:
        mock_db.table.side_effect = lambda _: _chainable_table([target_row])
        res = _approve(client)
    assert res.status_code == 403


def test_approve_merge_request_not_found(client):
    target_row = {"created_by": CREATOR_USER_ID}
    results = iter([[target_row], []])  # owner ok, then MR missing
    with patch("routers.teams.supabase_admin") as mock_db:
        mock_db.table.side_effect = lambda _: _chainable_table(next(results))
        res = _approve(client)
    assert res.status_code == 404


def test_approve_exceeds_max_size(client):
    target_row = {"created_by": CREATOR_USER_ID}
    pending_mr = {**MERGE_REQUEST_ROW, "status": "pending"}
    target_team_size = {"max_size": 2}
    # 2 existing members + 1 requesting member = 3 > max 2
    two_members  = [{"user_id": "u1"}, {"user_id": "u2"}]
    one_member   = [{"user_id": "u3"}]
    results = iter([[target_row], [pending_mr], [target_team_size], two_members, one_member])
    with patch("routers.teams.supabase_admin") as mock_db:
        mock_db.table.side_effect = lambda _: _chainable_table(next(results))
        res = _approve(client)
    assert res.status_code == 409
    assert "max size" in res.json()["detail"]


def test_approve_success(client):
    target_row       = {"created_by": CREATOR_USER_ID}
    pending_mr       = {**MERGE_REQUEST_ROW, "status": "pending"}
    target_team_size = {"max_size": 4}
    one_member       = [{"user_id": "u1"}]
    one_member2      = [{"user_id": "u2"}]
    # table() is called 8 times: owner check, MR fetch, max_size, 2x members,
    # move members (update), mark merged (update), update MR status (update)
    results = iter([
        [target_row], [pending_mr], [target_team_size], one_member, one_member2,
        [], [], [_approved_row()],
    ])

    with patch("routers.teams.supabase_admin") as mock_db:
        mock_db.table.side_effect = lambda _: _chainable_table(next(results))
        res = _approve(client)

    assert res.status_code == 200
    assert res.json()["status"] == "approved"


# ── Reject tests ──────────────────────────────────────────────────────────────

def test_reject_not_target_owner_forbidden(client):
    target_row = {"created_by": OTHER_USER_ID}
    with patch("routers.teams.supabase_admin") as mock_db:
        mock_db.table.side_effect = lambda _: _chainable_table([target_row])
        res = _reject(client)
    assert res.status_code == 403


def test_reject_merge_request_not_found(client):
    target_row = {"created_by": CREATOR_USER_ID}
    results = iter([[target_row], []])
    with patch("routers.teams.supabase_admin") as mock_db:
        mock_db.table.side_effect = lambda _: _chainable_table(next(results))
        res = _reject(client)
    assert res.status_code == 404


def test_reject_success(client):
    target_row = {"created_by": CREATOR_USER_ID}
    pending_mr = {**MERGE_REQUEST_ROW, "status": "pending"}
    # table() called 3 times: owner check, MR fetch, update MR status
    results = iter([[target_row], [pending_mr], [_rejected_row()]])
    with patch("routers.teams.supabase_admin") as mock_db:
        mock_db.table.side_effect = lambda _: _chainable_table(next(results))
        res = _reject(client)
    assert res.status_code == 200
    assert res.json()["status"] == "rejected"
