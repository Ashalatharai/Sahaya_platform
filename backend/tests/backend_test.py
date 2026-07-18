"""
Sahaaya (Instagram-style social platform) backend tests.
Covers auth, feed, groups, posts (like/comment), stories, friends, memories, chat.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sahaaya-care.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def sess():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(sess, email, pw):
    r = sess.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=20)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def kamala(sess):
    return _login(sess, "kamala@demo.com", "demo1234")


@pytest.fixture(scope="session")
def ramesh(sess):
    return _login(sess, "ramesh@demo.com", "demo1234")


def _auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Auth ----------
class TestAuth:
    def test_login_kamala(self, kamala):
        assert kamala["user"]["email"] == "kamala@demo.com"
        assert "token" in kamala and len(kamala["token"]) > 10

    def test_login_invalid(self, sess):
        r = sess.post(f"{API}/auth/login", json={"email": "kamala@demo.com", "password": "wrong"})
        assert r.status_code == 401

    def test_me(self, sess, kamala):
        r = sess.get(f"{API}/auth/me", headers=_auth(kamala["token"]))
        assert r.status_code == 200
        me = r.json()
        assert me["email"] == "kamala@demo.com"
        assert "friend_count" in me and "pending_request_count" in me

    def test_register_and_reject_dup(self, sess):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = sess.post(f"{API}/auth/register", json={"name": "TEST User", "email": email, "password": "pw12345"})
        assert r.status_code == 200
        assert "token" in r.json()
        # duplicate
        r2 = sess.post(f"{API}/auth/register", json={"name": "TEST User", "email": email, "password": "pw12345"})
        assert r2.status_code == 400


# ---------- Feed & Posts ----------
class TestFeed:
    def test_feed_returns_system_posts(self, sess, kamala):
        r = sess.get(f"{API}/feed", headers=_auth(kamala["token"]))
        assert r.status_code == 200
        feed = r.json()
        assert isinstance(feed, list)
        system_posts = [p for p in feed if p.get("author_id") == "system"]
        assert len(system_posts) >= 5, f"Expected >=5 seeded system posts, got {len(system_posts)}"
        # author enriched
        sp = system_posts[0]
        assert sp["author"]["name"] == "Sahaaya Daily" or sp["author"]["name"] == "Sahaaya"
        assert "like_count" in sp and "comment_count" in sp

    def test_create_post_appears_in_feed(self, sess, kamala):
        content = f"TEST post {uuid.uuid4().hex[:8]}"
        r = sess.post(f"{API}/posts", headers=_auth(kamala["token"]),
                      json={"content": content})
        assert r.status_code == 200
        post = r.json()
        assert post["content"] == content
        assert post["author"]["name"] == "Kamala Rao"
        pid = post["id"]

        # feed contains it
        r = sess.get(f"{API}/feed", headers=_auth(kamala["token"]))
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert pid in ids

    def test_like_toggle(self, sess, kamala):
        # create post
        r = sess.post(f"{API}/posts", headers=_auth(kamala["token"]),
                      json={"content": "TEST like target"})
        pid = r.json()["id"]

        r1 = sess.post(f"{API}/posts/{pid}/like", headers=_auth(kamala["token"]))
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1["liked"] is True
        assert d1["like_count"] == 1

        r2 = sess.post(f"{API}/posts/{pid}/like", headers=_auth(kamala["token"]))
        d2 = r2.json()
        assert d2["liked"] is False
        assert d2["like_count"] == 0

    def test_comments_flow(self, sess, kamala):
        r = sess.post(f"{API}/posts", headers=_auth(kamala["token"]),
                      json={"content": "TEST comment target"})
        pid = r.json()["id"]

        r1 = sess.post(f"{API}/posts/{pid}/comment", headers=_auth(kamala["token"]),
                       json={"text": "TEST_hello"})
        assert r1.status_code == 200
        c = r1.json()
        assert c["text"] == "TEST_hello"
        assert c["author_name"] == "Kamala Rao"

        r2 = sess.get(f"{API}/posts/{pid}/comments", headers=_auth(kamala["token"]))
        assert r2.status_code == 200
        comments = r2.json()
        assert any(cm["text"] == "TEST_hello" for cm in comments)


# ---------- Groups ----------
class TestGroups:
    def test_list_seeded_groups(self, sess, kamala):
        r = sess.get(f"{API}/groups", headers=_auth(kamala["token"]))
        assert r.status_code == 200
        groups = r.json()
        assert len(groups) >= 7, f"Expected >=7 seeded groups, got {len(groups)}"
        for g in groups:
            assert "id" in g and "name" in g and "is_joined" in g and "member_count" in g

    def test_create_and_get_group(self, sess, kamala):
        name = f"TEST_Group_{uuid.uuid4().hex[:6]}"
        r = sess.post(f"{API}/groups", headers=_auth(kamala["token"]),
                      json={"name": name, "category": "Test", "description": "TEST group"})
        assert r.status_code == 200
        g = r.json()
        assert g["name"] == name and g["is_joined"] is True and g["member_count"] == 1
        gid = g["id"]

        # detail
        r2 = sess.get(f"{API}/groups/{gid}", headers=_auth(kamala["token"]))
        assert r2.status_code == 200
        assert r2.json()["is_joined"] is True

    def test_join_leave(self, sess, ramesh):
        # find a group not yet joined
        r = sess.get(f"{API}/groups", headers=_auth(ramesh["token"]))
        groups = r.json()
        target = next((g for g in groups if not g["is_joined"]), None)
        assert target is not None
        gid = target["id"]

        j = sess.post(f"{API}/groups/{gid}/join", headers=_auth(ramesh["token"]))
        assert j.status_code == 200
        r2 = sess.get(f"{API}/groups/{gid}", headers=_auth(ramesh["token"]))
        assert r2.json()["is_joined"] is True

        leave = sess.post(f"{API}/groups/{gid}/leave", headers=_auth(ramesh["token"]))
        assert leave.status_code == 200
        r3 = sess.get(f"{API}/groups/{gid}", headers=_auth(ramesh["token"]))
        assert r3.json()["is_joined"] is False

    def test_post_to_group_and_shows_name(self, sess, kamala):
        # create group
        r = sess.post(f"{API}/groups", headers=_auth(kamala["token"]),
                      json={"name": f"TEST_GP_{uuid.uuid4().hex[:6]}", "category": "Test", "description": "d"})
        gid = r.json()["id"]
        gname = r.json()["name"]

        # post to group
        r2 = sess.post(f"{API}/posts", headers=_auth(kamala["token"]),
                       json={"content": "TEST group post", "group_id": gid})
        assert r2.status_code == 200
        p = r2.json()
        assert p["group_id"] == gid
        assert p.get("group_name") == gname

        # group posts endpoint
        r3 = sess.get(f"{API}/groups/{gid}/posts", headers=_auth(kamala["token"]))
        assert r3.status_code == 200
        assert any(pp["id"] == p["id"] for pp in r3.json())


# ---------- Friends ----------
class TestFriends:
    def test_discover_lists_other_users(self, sess, kamala):
        r = sess.get(f"{API}/users/discover", headers=_auth(kamala["token"]))
        assert r.status_code == 200
        users = r.json()
        names = {u["name"] for u in users}
        # At least Ramesh, Lakshmi, Harbhajan should be present
        assert "Ramesh Kulkarni" in names
        assert "Lakshmi Iyer" in names
        assert "Harbhajan Singh" in names

    def test_friend_request_flow(self, sess):
        # Create two fresh users to keep state isolated
        e1 = f"testA_{uuid.uuid4().hex[:8]}@example.com"
        e2 = f"testB_{uuid.uuid4().hex[:8]}@example.com"
        u1 = sess.post(f"{API}/auth/register", json={"name": "TEST A", "email": e1, "password": "pw12345"}).json()
        u2 = sess.post(f"{API}/auth/register", json={"name": "TEST B", "email": e2, "password": "pw12345"}).json()
        t1, t2 = u1["token"], u2["token"]
        id1, id2 = u1["user"]["id"], u2["user"]["id"]

        # u1 sends request to u2
        r = sess.post(f"{API}/friends/request/{id2}", headers=_auth(t1))
        assert r.status_code == 200
        assert r.json()["status"] == "requested"

        # u2 sees request
        r2 = sess.get(f"{API}/friends/requests", headers=_auth(t2))
        assert r2.status_code == 200
        req_ids = [u["id"] for u in r2.json()]
        assert id1 in req_ids

        # u2 accepts
        r3 = sess.post(f"{API}/friends/accept/{id1}", headers=_auth(t2))
        assert r3.status_code == 200

        # both see each other as friends
        f1 = sess.get(f"{API}/friends", headers=_auth(t1)).json()
        f2 = sess.get(f"{API}/friends", headers=_auth(t2)).json()
        assert id2 in [u["id"] for u in f1]
        assert id1 in [u["id"] for u in f2]

    def test_reject_request(self, sess):
        e1 = f"testC_{uuid.uuid4().hex[:8]}@example.com"
        e2 = f"testD_{uuid.uuid4().hex[:8]}@example.com"
        u1 = sess.post(f"{API}/auth/register", json={"name": "TEST C", "email": e1, "password": "pw12345"}).json()
        u2 = sess.post(f"{API}/auth/register", json={"name": "TEST D", "email": e2, "password": "pw12345"}).json()
        t1, t2 = u1["token"], u2["token"]
        id1, id2 = u1["user"]["id"], u2["user"]["id"]

        sess.post(f"{API}/friends/request/{id2}", headers=_auth(t1))
        r = sess.post(f"{API}/friends/reject/{id1}", headers=_auth(t2))
        assert r.status_code == 200

        reqs = sess.get(f"{API}/friends/requests", headers=_auth(t2)).json()
        assert id1 not in [u["id"] for u in reqs]

    def test_cannot_friend_self(self, sess, kamala):
        r = sess.post(f"{API}/friends/request/{kamala['user']['id']}", headers=_auth(kamala["token"]))
        assert r.status_code == 400


# ---------- Stories ----------
class TestStories:
    def test_create_and_list_story(self, sess, kamala):
        r = sess.post(f"{API}/stories", headers=_auth(kamala["token"]),
                      json={"caption": "TEST story caption", "image": None, "video": None})
        assert r.status_code == 200
        s = r.json()
        assert s["caption"] == "TEST story caption"
        assert s["author"]["id"] == kamala["user"]["id"]

        r2 = sess.get(f"{API}/stories", headers=_auth(kamala["token"]))
        assert r2.status_code == 200
        groups = r2.json()
        # should include own story
        mine = [g for g in groups if g["author"] and g["author"]["id"] == kamala["user"]["id"]]
        assert len(mine) >= 1
        assert any(st["caption"] == "TEST story caption" for st in mine[0]["stories"])


# ---------- Memories ----------
class TestMemories:
    def test_create_and_list_memory(self, sess, kamala):
        title = f"TEST_mem_{uuid.uuid4().hex[:6]}"
        r = sess.post(f"{API}/memories", headers=_auth(kamala["token"]),
                      json={"title": title, "story": "This is a nice memory."})
        assert r.status_code == 200
        m = r.json()
        assert m["title"] == title
        assert m["auto_caption"] is not None

        r2 = sess.get(f"{API}/memories", headers=_auth(kamala["token"]))
        assert r2.status_code == 200
        assert any(mm["title"] == title for mm in r2.json())


# ---------- Chat (Gemini) ----------
class TestChat:
    def test_chat_returns_reply(self, sess, kamala):
        r = sess.post(f"{API}/chat", headers=_auth(kamala["token"]),
                      json={"message": "Hello Sahaaya, tell me a short greeting."}, timeout=45)
        assert r.status_code == 200
        d = r.json()
        assert "reply" in d and isinstance(d["reply"], str) and len(d["reply"]) > 0
        assert "session_id" in d


# ---------- Unauth ----------
class TestUnauth:
    def test_feed_unauth(self, sess):
        r = requests.get(f"{API}/feed")
        assert r.status_code == 401

    def test_groups_unauth(self, sess):
        r = requests.get(f"{API}/groups")
        assert r.status_code == 401
