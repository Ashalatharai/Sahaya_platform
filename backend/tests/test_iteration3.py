"""
Sahaaya iteration 3 backend tests:
- Daily reminders (CRUD + toggle)
- Nostalgia (list + filter)
- Events (nearby ordering + RSVP)
- Notifications (aggregated: friend req + nearby events + due reminders)
- Chat language handling (English/Hindi/Kannada)
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sahaaya-care.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def sess():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(sess, email, pw="demo1234"):
    r = sess.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=20)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="module")
def kamala(sess):
    return _login(sess, "kamala@demo.com")


@pytest.fixture(scope="module")
def harbhajan(sess):
    return _login(sess, "harbhajan@demo.com")


# ---------- Reminders ----------
class TestReminders:
    def test_list_reminders_initial(self, sess, kamala):
        r = sess.get(f"{API}/reminders", headers=_auth(kamala["token"]))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_toggle_delete_reminder(self, sess, kamala):
        # Create
        payload = {"title": "TEST_BP tablet", "time": "08:30",
                   "notes": "TEST after breakfast", "category": "medicine"}
        r = sess.post(f"{API}/reminders", headers=_auth(kamala["token"]), json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == payload["title"]
        assert d["time"] == "08:30"
        assert d["category"] == "medicine"
        assert d["taken_today"] is False
        assert "id" in d
        rid = d["id"]

        # Verify persisted via GET
        r = sess.get(f"{API}/reminders", headers=_auth(kamala["token"]))
        ids = [x["id"] for x in r.json()]
        assert rid in ids

        # Toggle -> taken
        t1 = sess.post(f"{API}/reminders/{rid}/toggle", headers=_auth(kamala["token"]))
        assert t1.status_code == 200
        assert t1.json()["taken_today"] is True
        r = sess.get(f"{API}/reminders", headers=_auth(kamala["token"]))
        item = next(x for x in r.json() if x["id"] == rid)
        assert item["taken_today"] is True

        # Toggle -> untaken
        t2 = sess.post(f"{API}/reminders/{rid}/toggle", headers=_auth(kamala["token"]))
        assert t2.json()["taken_today"] is False

        # Delete
        d1 = sess.delete(f"{API}/reminders/{rid}", headers=_auth(kamala["token"]))
        assert d1.status_code == 200
        r = sess.get(f"{API}/reminders", headers=_auth(kamala["token"]))
        assert rid not in [x["id"] for x in r.json()]

    def test_toggle_nonexistent_returns_404(self, sess, kamala):
        r = sess.post(f"{API}/reminders/nope-{uuid.uuid4()}/toggle", headers=_auth(kamala["token"]))
        assert r.status_code == 404

    def test_reminders_unauth(self):
        r = requests.get(f"{API}/reminders")
        assert r.status_code == 401


# ---------- Nostalgia ----------
class TestNostalgia:
    def test_list_all(self, sess, kamala):
        r = sess.get(f"{API}/nostalgia", headers=_auth(kamala["token"]))
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 10, f"Expected >=10 seeded nostalgia items, got {len(items)}"
        cats = {i["category"] for i in items}
        assert {"song", "event", "festival"}.issubset(cats)

    def test_filter_song(self, sess, kamala):
        r = sess.get(f"{API}/nostalgia?category=song", headers=_auth(kamala["token"]))
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 4
        assert all(i["category"] == "song" for i in items)
        # Songs should have youtube link
        assert all(i.get("youtube") for i in items)

    def test_filter_event(self, sess, kamala):
        r = sess.get(f"{API}/nostalgia?category=event", headers=_auth(kamala["token"]))
        items = r.json()
        assert len(items) >= 3
        assert all(i["category"] == "event" for i in items)

    def test_filter_festival(self, sess, kamala):
        r = sess.get(f"{API}/nostalgia?category=festival", headers=_auth(kamala["token"]))
        items = r.json()
        assert len(items) >= 3
        assert all(i["category"] == "festival" for i in items)


# ---------- Events ----------
class TestEvents:
    def test_events_nearby_for_kamala(self, sess, kamala):
        r = sess.get(f"{API}/events", headers=_auth(kamala["token"]))
        assert r.status_code == 200
        events = r.json()
        assert len(events) >= 9
        nearby = [e for e in events if e.get("nearby")]
        assert len(nearby) >= 3, f"Kamala (Bengaluru) should have >=3 nearby events, got {len(nearby)}"
        # First result should be nearby (sorted nearby-first)
        assert events[0]["nearby"] is True
        # All nearby events should be Bengaluru
        for e in nearby:
            assert e["city"].lower() == "bengaluru"

    def test_events_nearby_for_harbhajan(self, sess, harbhajan):
        r = sess.get(f"{API}/events", headers=_auth(harbhajan["token"]))
        events = r.json()
        nearby = [e for e in events if e.get("nearby")]
        assert len(nearby) >= 1
        for e in nearby:
            assert e["city"].lower() == "chandigarh"

    def test_rsvp_toggle(self, sess, kamala):
        r = sess.get(f"{API}/events", headers=_auth(kamala["token"]))
        events = r.json()
        target = events[0]
        eid = target["id"]
        was = bool(target.get("rsvp"))

        r1 = sess.post(f"{API}/events/rsvp", headers=_auth(kamala["token"]),
                       json={"event_id": eid})
        assert r1.status_code == 200
        assert r1.json()["rsvp"] is (not was)

        # Verify persisted
        r2 = sess.get(f"{API}/events", headers=_auth(kamala["token"]))
        cur = next(e for e in r2.json() if e["id"] == eid)
        assert cur["rsvp"] is (not was)

        # Toggle back
        r3 = sess.post(f"{API}/events/rsvp", headers=_auth(kamala["token"]),
                       json={"event_id": eid})
        assert r3.json()["rsvp"] is was

    def test_rsvp_bad_event(self, sess, kamala):
        r = sess.post(f"{API}/events/rsvp", headers=_auth(kamala["token"]),
                      json={"event_id": "not-a-real-event"})
        assert r.status_code == 404


# ---------- Notifications ----------
class TestNotifications:
    def test_notifications_shape(self, sess, kamala):
        r = sess.get(f"{API}/notifications", headers=_auth(kamala["token"]))
        assert r.status_code == 200
        d = r.json()
        assert "count" in d and "items" in d
        assert isinstance(d["items"], list)
        assert d["count"] == len(d["items"])

    def test_notifications_include_nearby_event(self, sess, kamala):
        r = sess.get(f"{API}/notifications", headers=_auth(kamala["token"]))
        items = r.json()["items"]
        # Kamala (Bengaluru) should get at least one event notification
        event_notifs = [it for it in items if it["type"] == "event"]
        assert len(event_notifs) >= 1, f"Expected nearby event notification, items={items}"
        # Subtitle should include Bengaluru
        assert any("Bengaluru" in it.get("subtitle", "") for it in event_notifs)

    def test_notifications_include_reminder_when_due(self, sess, kamala):
        # Create a fresh reminder to guarantee a due one
        rc = sess.post(f"{API}/reminders", headers=_auth(kamala["token"]),
                       json={"title": "TEST_notif_reminder", "time": "09:00",
                             "category": "water"})
        assert rc.status_code == 200
        rid = rc.json()["id"]
        try:
            r = sess.get(f"{API}/notifications", headers=_auth(kamala["token"]))
            items = r.json()["items"]
            reminder_notifs = [it for it in items if it["type"] == "reminder"]
            assert len(reminder_notifs) >= 1
            assert "pending reminders" in reminder_notifs[0]["title"].lower()
        finally:
            sess.delete(f"{API}/reminders/{rid}", headers=_auth(kamala["token"]))

    def test_notifications_friend_request(self, sess):
        # Register two fresh users; one sends request to the other; verify.
        e1 = f"testN1_{uuid.uuid4().hex[:8]}@example.com"
        e2 = f"testN2_{uuid.uuid4().hex[:8]}@example.com"
        u1 = sess.post(f"{API}/auth/register", json={"name": "TEST N1", "email": e1, "password": "pw12345"}).json()
        u2 = sess.post(f"{API}/auth/register", json={"name": "TEST N2", "email": e2, "password": "pw12345"}).json()
        t1, t2 = u1["token"], u2["token"]
        id1, id2 = u1["user"]["id"], u2["user"]["id"]

        sess.post(f"{API}/friends/request/{id2}", headers=_auth(t1))
        r = sess.get(f"{API}/notifications", headers=_auth(t2))
        assert r.status_code == 200
        fr_notifs = [it for it in r.json()["items"] if it["type"] == "friend_request"]
        assert len(fr_notifs) >= 1
        assert any(it["user"]["id"] == id1 for it in fr_notifs)

    def test_notifications_unauth(self):
        r = requests.get(f"{API}/notifications")
        assert r.status_code == 401


# ---------- Chat language ----------
class TestChatLanguage:
    def test_chat_english(self, sess, kamala):
        r = sess.post(f"{API}/chat", headers=_auth(kamala["token"]),
                      json={"message": "Say a warm hello.", "language": "English"},
                      timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["language"] == "English"
        assert isinstance(d["reply"], str) and len(d["reply"]) > 0

    def test_chat_hindi_returns_devanagari(self, sess, kamala):
        r = sess.post(f"{API}/chat", headers=_auth(kamala["token"]),
                      json={"message": "Namaste, kaise ho?", "language": "Hindi"},
                      timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["language"] == "Hindi"
        assert isinstance(d["reply"], str) and len(d["reply"]) > 0
        # Reply should contain at least some Devanagari characters
        has_devanagari = any('\u0900' <= ch <= '\u097F' for ch in d["reply"])
        assert has_devanagari, f"Expected Devanagari in Hindi reply, got: {d['reply']}"

    def test_chat_kannada_returns_kannada_script(self, sess, kamala):
        r = sess.post(f"{API}/chat", headers=_auth(kamala["token"]),
                      json={"message": "Namaskara, hegiddira?", "language": "Kannada"},
                      timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["language"] == "Kannada"
        has_kannada = any('\u0C80' <= ch <= '\u0CFF' for ch in d["reply"])
        assert has_kannada, f"Expected Kannada script in reply, got: {d['reply']}"
