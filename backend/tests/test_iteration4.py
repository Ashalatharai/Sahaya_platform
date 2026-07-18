"""
Sahaaya Iteration 4 backend tests.
Covers:
- Direct messages: POST /api/messages, GET /api/messages/conversations, GET /api/messages/thread/{friend_id}
- Public user profile: GET /api/users/{uid}
- Notifications aggregation includes 'message' type
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sahaaya-care.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def sess():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(sess, email, pw="demo1234"):
    r = sess.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=20)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    return r.json()


def _auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def kamala(sess):
    return _login(sess, "kamala@demo.com")


@pytest.fixture(scope="module")
def lakshmi(sess):
    return _login(sess, "lakshmi@demo.com")


@pytest.fixture(scope="module")
def ramesh(sess):
    return _login(sess, "ramesh@demo.com")


# ---------- Public user profile ----------
class TestUserProfile:
    def test_get_own_profile(self, sess, kamala):
        uid = kamala["user"]["id"]
        r = sess.get(f"{API}/users/{uid}", headers=_auth(kamala["token"]))
        assert r.status_code == 200
        p = r.json()
        assert p["id"] == uid
        assert p["is_me"] is True
        assert "post_count" in p and isinstance(p["post_count"], int)
        assert "friend_count" in p and isinstance(p["friend_count"], int)
        assert "posts" in p and isinstance(p["posts"], list)
        assert p["name"]

    def test_get_friend_profile(self, sess, kamala, lakshmi):
        uid = lakshmi["user"]["id"]
        r = sess.get(f"{API}/users/{uid}", headers=_auth(kamala["token"]))
        assert r.status_code == 200
        p = r.json()
        assert p["is_me"] is False
        # kamala and lakshmi are friends
        assert p["is_friend"] is True
        assert p["request_sent"] is False

    def test_get_non_friend_profile(self, sess, kamala, ramesh):
        uid = ramesh["user"]["id"]
        r = sess.get(f"{API}/users/{uid}", headers=_auth(kamala["token"]))
        assert r.status_code == 200
        p = r.json()
        assert p["is_me"] is False
        # kamala/ramesh not friends by default
        assert isinstance(p["is_friend"], bool)

    def test_profile_not_found(self, sess, kamala):
        r = sess.get(f"{API}/users/nonexistent-user-id", headers=_auth(kamala["token"]))
        assert r.status_code == 404

    def test_profile_unauth(self, sess, kamala):
        r = requests.get(f"{API}/users/{kamala['user']['id']}")
        assert r.status_code == 401


# ---------- Direct messages ----------
class TestMessages:
    def test_send_message_kamala_to_lakshmi(self, sess, kamala, lakshmi):
        text = f"TEST_msg_{uuid.uuid4().hex[:6]}"
        r = sess.post(
            f"{API}/messages",
            headers=_auth(kamala["token"]),
            json={"to_user_id": lakshmi["user"]["id"], "text": text},
        )
        assert r.status_code == 200
        m = r.json()
        assert m["text"] == text
        assert m["from_user_id"] == kamala["user"]["id"]
        assert m["to_user_id"] == lakshmi["user"]["id"]
        assert kamala["user"]["id"] in m["read_by"]
        assert "id" in m and "created_at" in m
        # No mongo _id leaked
        assert "_id" not in m

    def test_cannot_message_self(self, sess, kamala):
        r = sess.post(
            f"{API}/messages",
            headers=_auth(kamala["token"]),
            json={"to_user_id": kamala["user"]["id"], "text": "self"},
        )
        assert r.status_code == 400

    def test_message_unknown_user(self, sess, kamala):
        r = sess.post(
            f"{API}/messages",
            headers=_auth(kamala["token"]),
            json={"to_user_id": "unknown-user-id", "text": "hi"},
        )
        assert r.status_code == 404

    def test_conversations_list(self, sess, kamala, lakshmi):
        # Ensure a message exists in this test session
        sess.post(
            f"{API}/messages",
            headers=_auth(kamala["token"]),
            json={"to_user_id": lakshmi["user"]["id"], "text": f"TEST_conv_{uuid.uuid4().hex[:5]}"},
        )
        r = sess.get(f"{API}/messages/conversations", headers=_auth(kamala["token"]))
        assert r.status_code == 200
        convs = r.json()
        assert isinstance(convs, list)
        assert len(convs) >= 1
        c = next((c for c in convs if c["friend_id"] == lakshmi["user"]["id"]), None)
        assert c is not None
        assert "friend" in c and c["friend"]["id"] == lakshmi["user"]["id"]
        assert "last_message" in c and "last_at" in c
        assert "unread" in c and isinstance(c["unread"], int)

    def test_thread_view_and_mark_read(self, sess, kamala, lakshmi):
        text = f"TEST_thread_{uuid.uuid4().hex[:5]}"
        # Kamala sends to Lakshmi
        sess.post(
            f"{API}/messages",
            headers=_auth(kamala["token"]),
            json={"to_user_id": lakshmi["user"]["id"], "text": text},
        )
        # Lakshmi fetches thread with Kamala
        r = sess.get(
            f"{API}/messages/thread/{kamala['user']['id']}",
            headers=_auth(lakshmi["token"]),
        )
        assert r.status_code == 200
        data = r.json()
        assert data["friend"]["id"] == kamala["user"]["id"]
        msgs = data["messages"]
        assert isinstance(msgs, list) and len(msgs) >= 1
        # The recent message should be present
        assert any(m["text"] == text for m in msgs)
        # Re-fetch: after this the read_by should include Lakshmi (DB was updated on first fetch).
        # NOTE: endpoint returns pre-update snapshot on first call; persistence verified via second call.
        r2 = sess.get(
            f"{API}/messages/thread/{kamala['user']['id']}",
            headers=_auth(lakshmi["token"]),
        )
        assert r2.status_code == 200
        msgs2 = r2.json()["messages"]
        latest = [m for m in msgs2 if m["text"] == text][0]
        assert lakshmi["user"]["id"] in latest["read_by"], (
            "After thread fetch, incoming message should be marked read for the reader"
        )

    def test_thread_returns_sorted_ascending(self, sess, kamala, lakshmi):
        r = sess.get(
            f"{API}/messages/thread/{lakshmi['user']['id']}",
            headers=_auth(kamala["token"]),
        )
        assert r.status_code == 200
        msgs = r.json()["messages"]
        if len(msgs) >= 2:
            times = [m["created_at"] for m in msgs]
            assert times == sorted(times), "Thread should be sorted ascending by created_at"

    def test_message_with_image(self, sess, kamala, lakshmi):
        img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
        r = sess.post(
            f"{API}/messages",
            headers=_auth(kamala["token"]),
            json={"to_user_id": lakshmi["user"]["id"], "text": "", "image": img},
        )
        assert r.status_code == 200
        assert r.json()["image"] == img


# ---------- Notifications with message type ----------
class TestNotificationsMessage:
    def test_notifications_include_message_when_unread(self, sess, kamala, lakshmi):
        # Kamala sends a new message to Lakshmi (unread on Lakshmi's side)
        sess.post(
            f"{API}/messages",
            headers=_auth(kamala["token"]),
            json={"to_user_id": lakshmi["user"]["id"], "text": f"TEST_notify_{uuid.uuid4().hex[:5]}"},
        )
        r = sess.get(f"{API}/notifications", headers=_auth(lakshmi["token"]))
        assert r.status_code == 200
        data = r.json()
        items = data["items"]
        msg_items = [it for it in items if it.get("type") == "message"]
        assert len(msg_items) >= 1, f"Expected message-type notification. Got items: {[it['type'] for it in items]}"
        assert msg_items[0]["link"] == "/messages"
