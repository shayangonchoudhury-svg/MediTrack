"""MediTrack backend API tests - auth, profiles, medicines, schedule, stats, isolation, brute force."""
import os
import uuid
from datetime import date, timedelta
import requests
import pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://dosage-hub-5.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"
ADMIN = ("admin@meditrack.app", "admin123")


def new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def register_user(s, suffix=""):
    email = f"test_{uuid.uuid4().hex[:8]}{suffix}@example.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "passw0rd!", "name": "Tester"})
    assert r.status_code == 200, r.text
    return email, r.json()


@pytest.fixture(scope="module")
def admin_session():
    s = new_session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN[0], "password": ADMIN[1]})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def user_session():
    s = new_session()
    email, _ = register_user(s)
    return s, email


# ---------- Auth ----------
class TestAuth:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_register_and_default_profile(self):
        s = new_session()
        email, user = register_user(s)
        assert user["email"] == email
        assert "id" in user
        # cookies set
        assert "access_token" in s.cookies
        assert "refresh_token" in s.cookies
        # default profile created
        r = s.get(f"{API}/profiles")
        assert r.status_code == 200
        profs = r.json()
        assert len(profs) >= 1
        assert any(p.get("relation") == "self" for p in profs)

    def test_register_duplicate(self):
        s = new_session()
        email, _ = register_user(s)
        s2 = new_session()
        r = s2.post(f"{API}/auth/register", json={"email": email, "password": "passw0rd!", "name": "Dup"})
        assert r.status_code == 400

    def test_login_admin_and_me(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN[0]

    def test_logout_clears(self):
        s = new_session()
        register_user(s)
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # cookies cleared; /me should 401
        s.cookies.clear()
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 401

    def test_brute_force_lockout(self):
        s = new_session()
        email = f"test_bf_{uuid.uuid4().hex[:6]}@example.com"
        # register first so email exists
        register_user(s)
        s2 = new_session()
        last_status = None
        for _ in range(6):
            r = s2.post(f"{API}/auth/login", json={"email": email, "password": "wrong"})
            last_status = r.status_code
        assert last_status == 429, f"Expected lockout 429, got {last_status}"


# ---------- Profiles ----------
class TestProfiles:
    def test_profile_crud(self, user_session):
        s, _ = user_session
        # create
        r = s.post(f"{API}/profiles", json={"name": "TEST_Mom", "relation": "mother", "color": "#22D3EE"})
        assert r.status_code == 200
        pid = r.json()["id"]
        assert r.json()["name"] == "TEST_Mom"
        # list
        r = s.get(f"{API}/profiles")
        assert any(p["id"] == pid for p in r.json())
        # update
        r = s.put(f"{API}/profiles/{pid}", json={"name": "TEST_Mom2", "relation": "mother", "color": "#22D3EE"})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Mom2"
        # delete
        r = s.delete(f"{API}/profiles/{pid}")
        assert r.status_code == 200
        # verify gone
        r = s.put(f"{API}/profiles/{pid}", json={"name": "x"})
        assert r.status_code in (404, 422)


# ---------- Medicines ----------
class TestMedicines:
    def test_medicine_crud_and_schedule_flow(self, user_session):
        s, _ = user_session
        profs = s.get(f"{API}/profiles").json()
        pid = profs[0]["id"]
        payload = {
            "profile_id": pid,
            "name": "TEST_Paracetamol",
            "dosage": "500 mg",
            "form": "tablet",
            "times": ["08:00", "20:00"],
            "frequency": "daily",
            "days_of_week": [0, 1, 2, 3, 4, 5, 6],
            "notes": "after food",
            "color": "#34D399",
        }
        r = s.post(f"{API}/medicines", json=payload)
        assert r.status_code == 200, r.text
        mid = r.json()["id"]
        assert r.json()["name"] == "TEST_Paracetamol"

        # list
        r = s.get(f"{API}/medicines", params={"profile_id": pid})
        assert any(m["id"] == mid for m in r.json())

        # update
        r = s.put(f"{API}/medicines/{mid}", json={"dosage": "650 mg"})
        assert r.status_code == 200
        assert r.json()["dosage"] == "650 mg"

        # schedule returns 2 items pending
        r = s.get(f"{API}/schedule", params={"profile_id": pid})
        assert r.status_code == 200
        items = [i for i in r.json()["items"] if i["medicine_id"] == mid]
        assert len(items) == 2
        assert all(i["status"] == "pending" for i in items)

        # mark taken
        today = date.today().isoformat()
        r = s.post(f"{API}/schedule/status", json={
            "medicine_id": mid, "profile_id": pid,
            "scheduled_time": "08:00", "date": today, "status": "taken",
        })
        assert r.status_code == 200

        # schedule reflects
        r = s.get(f"{API}/schedule", params={"profile_id": pid})
        it = [i for i in r.json()["items"] if i["medicine_id"] == mid and i["scheduled_time"] == "08:00"][0]
        assert it["status"] == "taken"

        # mark skipped
        r = s.post(f"{API}/schedule/status", json={
            "medicine_id": mid, "profile_id": pid,
            "scheduled_time": "20:00", "date": today, "status": "skipped",
        })
        assert r.status_code == 200

        # stats
        r = s.get(f"{API}/stats", params={"profile_id": pid, "days": 7})
        assert r.status_code == 200
        data = r.json()
        assert "overall_adherence" in data
        assert "current_streak" in data
        assert data["total_taken"] >= 1
        assert len(data["daily"]) == 7

        # delete medicine
        r = s.delete(f"{API}/medicines/{mid}")
        assert r.status_code == 200
        r = s.get(f"{API}/medicines", params={"profile_id": pid})
        assert not any(m["id"] == mid for m in r.json())

    def test_invalid_profile_rejected(self, user_session):
        s, _ = user_session
        r = s.post(f"{API}/medicines", json={
            "profile_id": "does-not-exist",
            "name": "X", "dosage": "1", "times": ["09:00"],
        })
        assert r.status_code == 404


# ---------- Isolation ----------
class TestIsolation:
    def test_cross_user_isolation(self):
        s1 = new_session()
        _, _ = register_user(s1, "_a")
        s2 = new_session()
        _, _ = register_user(s2, "_b")

        prof1 = s1.get(f"{API}/profiles").json()[0]["id"]
        r = s1.post(f"{API}/medicines", json={
            "profile_id": prof1, "name": "TEST_Iso", "dosage": "1mg", "times": ["09:00"],
        })
        mid = r.json()["id"]

        # user B cannot update/delete
        r = s2.put(f"{API}/medicines/{mid}", json={"dosage": "9mg"})
        assert r.status_code == 404
        r = s2.delete(f"{API}/medicines/{mid}")
        assert r.status_code == 404

        # user B cannot access profile via schedule (empty result only)
        r = s2.get(f"{API}/schedule", params={"profile_id": prof1})
        assert r.status_code == 200
        assert r.json()["items"] == []

        # user B cannot update profile 1
        r = s2.put(f"{API}/profiles/{prof1}", json={"name": "hack"})
        assert r.status_code == 404
