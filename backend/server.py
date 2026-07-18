from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt as pyjwt
import google.generativeai as genai
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', os.environ.get('REACT_APP_GOOGLE_CLIENT_ID', ''))

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginInput(BaseModel):
    credential: str
    mode: str = "login"


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    token: str
    new_password: str


class ProfileInput(BaseModel):
    name: str
    age: int
    city: str
    language: str
    interests: List[str] = []
    bio: Optional[str] = None
    avatar: Optional[str] = None  # base64


class GroupInput(BaseModel):
    name: str
    category: str
    description: str
    image: Optional[str] = None


class PostInput(BaseModel):
    group_id: Optional[str] = None  # if None, personal share to feed
    content: str
    image: Optional[str] = None
    video: Optional[str] = None  # base64 or url


class CommentInput(BaseModel):
    text: str


class StoryInput(BaseModel):
    image: Optional[str] = None
    video: Optional[str] = None
    caption: Optional[str] = None


class ChatInput(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: Optional[str] = None  # English/Hindi/Kannada


class MessageInput(BaseModel):
    to_user_id: str
    text: str
    image: Optional[str] = None


class ReminderInput(BaseModel):
    title: str
    time: str  # HH:MM 24hr
    notes: Optional[str] = None
    category: str = "medicine"  # medicine, water, exercise, other


class EventRSVPInput(BaseModel):
    event_id: str


# ---------- Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())


def make_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing auth token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except pyjwt.PyJWTError:
        raise HTTPException(401, "Invalid token")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def user_public(user_id: str):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not u:
        return None
    p = u.get("profile") or {}
    return {
        "id": u["id"],
        "name": p.get("name") or u["name"],
        "avatar": p.get("avatar"),
        "city": p.get("city"),
    }


# ---------- Auth ----------
@api_router.post("/auth/register")
async def register(data: RegisterInput):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(400, "User already existed")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "password": hash_password(data.password),
        "profile": None,
        "joined_groups": [],
        "friends": [],
        "friend_requests_in": [],
        "friend_requests_out": [],
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    return {"token": make_token(user_id),
            "user": {"id": user_id, "name": data.name, "email": data.email, "profile": None}}


@api_router.post("/auth/login")
async def login(data: LoginInput):
    user = await db.users.find_one({"email": data.email})
    if not user or "password" not in user or not verify_password(data.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    return {"token": make_token(user["id"]),
            "user": {"id": user["id"], "name": user["name"], "email": user["email"],
                     "profile": user.get("profile")}}


@api_router.post("/auth/google")
async def google_login(data: GoogleLoginInput):
    try:
        # Verify Google token
        idinfo = id_token.verify_oauth2_token(
            data.credential, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else None
        )
        email = idinfo['email']
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')
        
        user = await db.users.find_one({"email": email})
        
        if user and data.mode == "register":
            raise HTTPException(status_code=400, detail="User already existed")
            
        if not user:
            # Create new user for Google Sign-In
            user_id = str(uuid.uuid4())
            profile = {"name": name, "avatar": picture, "city": "", "language": "", "interests": [], "bio": "", "age": 0}
            doc = {
                "id": user_id,
                "name": name,
                "email": email,
                "password": hash_password(secrets.token_urlsafe(32)), # Random password for OAuth users
                "profile": profile,
                "joined_groups": [],
                "friends": [],
                "friend_requests_in": [],
                "friend_requests_out": [],
                "created_at": now_iso(),
                "google_id": idinfo['sub']
            }
            await db.users.insert_one(doc)
            user = doc

        return {"token": make_token(user["id"]),
                "user": {"id": user["id"], "name": user["name"], "email": user["email"],
                         "profile": user.get("profile")}}
    except ValueError:
        raise HTTPException(401, "Invalid Google token")


@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordInput):
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(404, "User not found")
    
    # Generate mock token
    reset_token = secrets.token_urlsafe(32)
    # Store token in db with expiry (mocking it by just updating user document for now)
    await db.users.update_one({"id": user["id"]}, {"$set": {"reset_token": reset_token}})
    
    return {"msg": "If an account with this email exists, a password reset link has been sent.", "token": reset_token}


@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordInput):
    user = await db.users.find_one({"reset_token": data.token})
    if not user:
        raise HTTPException(400, "Invalid or expired reset token")
    
    # Update password
    await db.users.update_one({"id": user["id"]}, {
        "$set": {"password": hash_password(data.new_password)},
        "$unset": {"reset_token": ""}
    })
    
    return {"msg": "Password has been reset successfully."}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    user["friend_count"] = len(user.get("friends", []))
    user["pending_request_count"] = len(user.get("friend_requests_in", []))
    return user


# ---------- Profile ----------
@api_router.post("/profile")
async def save_profile(data: ProfileInput, user=Depends(get_current_user)):
    profile = data.model_dump()
    await db.users.update_one({"id": user["id"]}, {"$set": {"profile": profile, "name": profile["name"]}})
    return {"profile": profile}


# ---------- Friends ----------
@api_router.get("/users/discover")
async def discover_users(user=Depends(get_current_user)):
    all_users = await db.users.find({"id": {"$ne": user["id"]}}, {"_id": 0, "password": 0}).to_list(500)
    friends = set(user.get("friends", []))
    sent = set(user.get("friend_requests_out", []))
    result = []
    for u in all_users:
        p = u.get("profile") or {}
        result.append({
            "id": u["id"],
            "name": p.get("name") or u["name"],
            "avatar": p.get("avatar"),
            "city": p.get("city"),
            "interests": p.get("interests", []),
            "is_friend": u["id"] in friends,
            "request_sent": u["id"] in sent,
        })
    return result


@api_router.post("/friends/request/{uid}")
async def send_request(uid: str, user=Depends(get_current_user)):
    if uid == user["id"]:
        raise HTTPException(400, "Cannot friend yourself")
    target = await db.users.find_one({"id": uid})
    if not target:
        raise HTTPException(404, "User not found")
    if uid in user.get("friends", []):
        return {"ok": True, "status": "already_friends"}
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"friend_requests_out": uid}})
    await db.users.update_one({"id": uid}, {"$addToSet": {"friend_requests_in": user["id"]}})
    return {"ok": True, "status": "requested"}


@api_router.post("/friends/accept/{uid}")
async def accept_request(uid: str, user=Depends(get_current_user)):
    if uid not in user.get("friend_requests_in", []):
        raise HTTPException(400, "No such request")
    await db.users.update_one({"id": user["id"]}, {
        "$pull": {"friend_requests_in": uid},
        "$addToSet": {"friends": uid},
    })
    await db.users.update_one({"id": uid}, {
        "$pull": {"friend_requests_out": user["id"]},
        "$addToSet": {"friends": user["id"]},
    })
    return {"ok": True}


@api_router.post("/friends/reject/{uid}")
async def reject_request(uid: str, user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$pull": {"friend_requests_in": uid}})
    await db.users.update_one({"id": uid}, {"$pull": {"friend_requests_out": user["id"]}})
    return {"ok": True}


@api_router.get("/friends/requests")
async def list_requests(user=Depends(get_current_user)):
    ids = user.get("friend_requests_in", [])
    users = []
    for uid in ids:
        u = await user_public(uid)
        if u:
            users.append(u)
    return users


@api_router.get("/friends")
async def list_friends(user=Depends(get_current_user)):
    users = []
    for uid in user.get("friends", []):
        u = await user_public(uid)
        if u:
            users.append(u)
    return users


# ---------- Groups (formerly communities) ----------
@api_router.get("/groups")
async def list_groups(user=Depends(get_current_user)):
    items = await db.groups.find({}, {"_id": 0}).to_list(500)
    joined = set(user.get("joined_groups", []))
    for c in items:
        c["is_joined"] = c["id"] in joined
        c["member_count"] = len(c.get("members", []))
    return items


@api_router.post("/groups")
async def create_group(data: GroupInput, user=Depends(get_current_user)):
    cid = str(uuid.uuid4())
    doc = {
        "id": cid,
        "name": data.name,
        "category": data.category,
        "description": data.description,
        "image": data.image,
        "created_by": user["id"],
        "created_at": now_iso(),
        "members": [user["id"]],
    }
    await db.groups.insert_one(doc)
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"joined_groups": cid}})
    doc.pop("_id", None)
    doc["is_joined"] = True
    doc["member_count"] = 1
    return doc


@api_router.post("/groups/{cid}/join")
async def join_group(cid: str, user=Depends(get_current_user)):
    c = await db.groups.find_one({"id": cid})
    if not c:
        raise HTTPException(404, "Group not found")
    await db.groups.update_one({"id": cid}, {"$addToSet": {"members": user["id"]}})
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"joined_groups": cid}})
    return {"ok": True}


@api_router.post("/groups/{cid}/leave")
async def leave_group(cid: str, user=Depends(get_current_user)):
    await db.groups.update_one({"id": cid}, {"$pull": {"members": user["id"]}})
    await db.users.update_one({"id": user["id"]}, {"$pull": {"joined_groups": cid}})
    return {"ok": True}


@api_router.get("/groups/{cid}")
async def get_group(cid: str, user=Depends(get_current_user)):
    c = await db.groups.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Group not found")
    c["is_joined"] = cid in user.get("joined_groups", [])
    c["member_count"] = len(c.get("members", []))
    return c


# ---------- Posts / Feed ----------
async def enrich_post(p, user):
    p["like_count"] = len(p.get("likes", []))
    p["liked_by_me"] = user["id"] in p.get("likes", [])
    p["comment_count"] = len(p.get("comments", []))
    # attach author info
    if p.get("author_id") == "system":
        p["author"] = {"id": "system", "name": p.get("author_name", "Sahaaya"), "avatar": None, "city": None}
    else:
        au = await user_public(p["author_id"])
        p["author"] = au or {"id": p["author_id"], "name": p.get("author_name", "User"), "avatar": None}
    # attach group name if group post
    if p.get("group_id"):
        g = await db.groups.find_one({"id": p["group_id"]}, {"_id": 0, "name": 1})
        p["group_name"] = g.get("name") if g else None
    return p


@api_router.get("/feed")
async def feed(user=Depends(get_current_user)):
    friends = user.get("friends", []) + [user["id"]]
    groups = user.get("joined_groups", [])
    query = {"$or": [
        {"author_id": {"$in": friends}},
        {"group_id": {"$in": groups}},
        {"author_id": "system"},
    ]}
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).limit(80).to_list(80)
    return [await enrich_post(p, user) for p in posts]


@api_router.get("/groups/{cid}/posts")
async def group_posts(cid: str, user=Depends(get_current_user)):
    posts = await db.posts.find({"group_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [await enrich_post(p, user) for p in posts]


@api_router.post("/posts")
async def create_post(data: PostInput, user=Depends(get_current_user)):
    pid = str(uuid.uuid4())
    doc = {
        "id": pid,
        "group_id": data.group_id,
        "content": data.content,
        "image": data.image,
        "video": data.video,
        "author_id": user["id"],
        "author_name": user.get("profile", {}).get("name") if user.get("profile") else user["name"],
        "likes": [],
        "comments": [],
        "created_at": now_iso(),
    }
    await db.posts.insert_one(doc)
    doc.pop("_id", None)
    return await enrich_post(doc, user)


@api_router.post("/posts/{pid}/like")
async def toggle_like(pid: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": pid})
    if not post:
        raise HTTPException(404, "Post not found")
    if user["id"] in post.get("likes", []):
        await db.posts.update_one({"id": pid}, {"$pull": {"likes": user["id"]}})
        liked = False
    else:
        await db.posts.update_one({"id": pid}, {"$addToSet": {"likes": user["id"]}})
        liked = True
    post = await db.posts.find_one({"id": pid}, {"_id": 0})
    return {"liked": liked, "like_count": len(post.get("likes", []))}


@api_router.post("/posts/{pid}/comment")
async def add_comment(pid: str, data: CommentInput, user=Depends(get_current_user)):
    p = await db.posts.find_one({"id": pid})
    if not p:
        raise HTTPException(404, "Post not found")
    name = user.get("profile", {}).get("name") if user.get("profile") else user["name"]
    c = {
        "id": str(uuid.uuid4()),
        "author_id": user["id"],
        "author_name": name,
        "text": data.text,
        "created_at": now_iso(),
    }
    await db.posts.update_one({"id": pid}, {"$push": {"comments": c}})
    return c


@api_router.get("/posts/{pid}/comments")
async def get_comments(pid: str, user=Depends(get_current_user)):
    p = await db.posts.find_one({"id": pid}, {"_id": 0, "comments": 1})
    if not p:
        raise HTTPException(404, "Post not found")
    return p.get("comments", [])


# ---------- Stories (24hr) ----------
@api_router.post("/stories")
async def create_story(data: StoryInput, user=Depends(get_current_user)):
    sid = str(uuid.uuid4())
    name = user.get("profile", {}).get("name") if user.get("profile") else user["name"]
    doc = {
        "id": sid,
        "author_id": user["id"],
        "author_name": name,
        "image": data.image,
        "video": data.video,
        "caption": data.caption,
        "created_at": now_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
    }
    await db.stories.insert_one(doc)
    doc.pop("_id", None)
    doc["author"] = await user_public(user["id"])
    return doc


@api_router.get("/stories")
async def list_stories(user=Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    # Delete expired
    await db.stories.delete_many({"expires_at": {"$lt": now}})
    # Include self + friends + system
    ids = user.get("friends", []) + [user["id"], "system"]
    stories = await db.stories.find({"author_id": {"$in": ids}}, {"_id": 0}).sort("created_at", -1).to_list(200)
    # Group by author
    groups = {}
    for s in stories:
        aid = s["author_id"]
        if aid not in groups:
            au = {"id": "system", "name": "Sahaaya", "avatar": None} if aid == "system" else (await user_public(aid))
            groups[aid] = {"author": au, "stories": []}
        groups[aid]["stories"].append(s)
    return list(groups.values())


# ---------- Memory Lane (private personal memories) ----------
@api_router.get("/memories")
async def list_memories(user=Depends(get_current_user)):
    return await db.memories.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


class MemoryInput(BaseModel):
    title: str
    story: str
    image: Optional[str] = None


@api_router.post("/memories")
async def create_memory(data: MemoryInput, user=Depends(get_current_user)):
    # Simple auto-caption: use first sentence + hashtags derived from content
    auto_caption = None
    text = f"{data.title}. {data.story}".strip()
    if text:
        first = text.split(".")[0][:120]
        auto_caption = f"{first} ✨ #MemoryLane"
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": data.title,
        "story": data.story,
        "image": data.image,
        "auto_caption": auto_caption,
        "created_at": now_iso(),
    }
    await db.memories.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------- AI Companion ----------
LANG_INSTRUCTION = {
    "English": "Reply in clear, simple English.",
    "Hindi": "हिंदी में सरल, छोटे वाक्यों में उत्तर दें। रोज़मर्रा की भाषा का प्रयोग करें।",
    "Kannada": "ಸರಳ, ಚಿಕ್ಕ ವಾಕ್ಯಗಳಲ್ಲಿ ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ. ದೈನಂದಿನ ಭಾಷೆ ಬಳಸಿ.",
}

SYSTEM_PROMPT_BASE = """You are Sahaaya, a warm, friendly AI friend for Indian senior citizens on a social media app.
Speak simply, in short sentences. Be positive, respectful, and never rushed. Address the user warmly.
- Answer general health questions but ALWAYS add a medical disclaimer that you are not a doctor.
- Suggest interests, hobby groups, or old Bollywood songs, festivals, and nostalgic content.
- Explain phones, WhatsApp, video calling in very simple steps.
- Keep replies 2-5 sentences unless a step-by-step is needed."""


@api_router.post("/chat")
async def chat(data: ChatInput, user=Depends(get_current_user)):
    session_id = data.session_id or f"user-{user['id']}"
    await db.chats.insert_one({"user_id": user["id"], "session_id": session_id, "role": "user",
                               "text": data.message, "created_at": now_iso()})
    # Resolve language: request → profile → English
    profile = user.get("profile") or {}
    language = data.language or profile.get("language") or "English"
    lang_instr = LANG_INSTRUCTION.get(language, LANG_INSTRUCTION["English"])
    system_message = f"{SYSTEM_PROMPT_BASE}\n\nUser's preferred language: {language}. {lang_instr}"
    try:
        if not EMERGENT_LLM_KEY:
            reply = "I'm a local assistant because the AI key is missing! But I'm still here for you. How was your day?"
        else:
            genai.configure(api_key=EMERGENT_LLM_KEY)
            model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=system_message)
            resp = await model.generate_content_async(data.message)
            reply = resp.text if resp else "I'm here for you. Please tell me a little more."
    except Exception:
        logging.exception("LLM error")
        fallback_map = {
            "Hindi": "अभी मैं थोड़ी देर में जवाब नहीं दे पा रहा हूँ। कृपया कुछ देर बाद पुनः प्रयास करें।",
            "Kannada": "ನಾನು ಈಗ ಉತ್ತರಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಪ್ರಯತ್ನಿಸಿ.",
        }
        reply = fallback_map.get(language, "I'm having trouble reaching my thoughts right now. Please try again in a moment.")
    await db.chats.insert_one({"user_id": user["id"], "session_id": session_id, "role": "assistant",
                               "text": reply, "created_at": now_iso()})
    return {"reply": reply, "session_id": session_id, "language": language}


@api_router.get("/chat/history")
async def chat_history(user=Depends(get_current_user)):
    return await db.chats.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", 1).to_list(200)


# ---------- Daily Medical Reminders ----------
@api_router.get("/reminders")
async def list_reminders(user=Depends(get_current_user)):
    items = await db.reminders.find({"user_id": user["id"]}, {"_id": 0}).sort("time", 1).to_list(100)
    today = datetime.now(timezone.utc).date().isoformat()
    for r in items:
        r["taken_today"] = today in r.get("history", [])
    return items


@api_router.post("/reminders")
async def create_reminder(data: ReminderInput, user=Depends(get_current_user)):
    rid = str(uuid.uuid4())
    doc = {
        "id": rid,
        "user_id": user["id"],
        "title": data.title,
        "time": data.time,
        "notes": data.notes,
        "category": data.category,
        "history": [],
        "created_at": now_iso(),
    }
    await db.reminders.insert_one(doc)
    doc.pop("_id", None)
    doc["taken_today"] = False
    return doc


@api_router.post("/reminders/{rid}/toggle")
async def toggle_reminder(rid: str, user=Depends(get_current_user)):
    r = await db.reminders.find_one({"id": rid, "user_id": user["id"]})
    if not r:
        raise HTTPException(404, "Reminder not found")
    today = datetime.now(timezone.utc).date().isoformat()
    if today in r.get("history", []):
        await db.reminders.update_one({"id": rid}, {"$pull": {"history": today}})
        return {"taken_today": False}
    await db.reminders.update_one({"id": rid}, {"$addToSet": {"history": today}})
    return {"taken_today": True}


@api_router.delete("/reminders/{rid}")
async def delete_reminder(rid: str, user=Depends(get_current_user)):
    await db.reminders.delete_one({"id": rid, "user_id": user["id"]})
    return {"ok": True}


# ---------- Nostalgia ----------
@api_router.get("/nostalgia")
async def list_nostalgia(category: Optional[str] = None, user=Depends(get_current_user)):
    query = {"category": category} if category else {}
    items = await db.nostalgia.find(query, {"_id": 0}).sort("year", -1).to_list(200)
    return items


# ---------- Events (Nearby) ----------
@api_router.get("/events")
async def list_events(user=Depends(get_current_user)):
    profile = user.get("profile") or {}
    user_city = (profile.get("city") or "").strip().lower()
    all_events = await db.events.find({}, {"_id": 0}).sort("date", 1).to_list(200)
    rsvps = set(user.get("rsvps", []))
    result = []
    for e in all_events:
        e["nearby"] = user_city and e.get("city", "").lower() == user_city
        e["rsvp"] = e["id"] in rsvps
        result.append(e)
    # nearby first
    result.sort(key=lambda x: (not x["nearby"], x.get("date", "")))
    return result


@api_router.post("/events/rsvp")
async def toggle_rsvp(data: EventRSVPInput, user=Depends(get_current_user)):
    e = await db.events.find_one({"id": data.event_id})
    if not e:
        raise HTTPException(404, "Event not found")
    if data.event_id in user.get("rsvps", []):
        await db.users.update_one({"id": user["id"]}, {"$pull": {"rsvps": data.event_id}})
        return {"rsvp": False}
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"rsvps": data.event_id}})
    return {"rsvp": True}


# ---------- Notifications (aggregated) ----------
@api_router.get("/notifications")
async def notifications(user=Depends(get_current_user)):
    items = []
    # Friend requests
    for uid in user.get("friend_requests_in", []):
        u = await user_public(uid)
        if u:
            items.append({
                "type": "friend_request",
                "title": f"{u['name']} sent you a friend request",
                "user": u,
                "link": "/family",
            })
    # Nearby events (within next 30 days) in user city
    profile = user.get("profile") or {}
    user_city = (profile.get("city") or "").strip().lower()
    if user_city:
        soon = (datetime.now(timezone.utc) + timedelta(days=30)).date().isoformat()
        today = datetime.now(timezone.utc).date().isoformat()
        events = await db.events.find(
            {"date": {"$gte": today, "$lte": soon}}, {"_id": 0}
        ).to_list(50)
        for e in events:
            if e.get("city", "").lower() == user_city:
                items.append({
                    "type": "event",
                    "title": f"Nearby: {e['title']}",
                    "subtitle": f"{e['city']} · {e['date']}",
                    "event": e,
                    "link": "/events",
                })
    # Due reminders today (not yet taken)
    today = datetime.now(timezone.utc).date().isoformat()
    reminders = await db.reminders.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    due = [r for r in reminders if today not in r.get("history", [])]
    if due:
        items.append({
            "type": "reminder",
            "title": f"You have {len(due)} pending reminders today",
            "link": "/reminders",
        })
    # Unread messages
    msgs = await db.messages.find(
        {"to_user_id": user["id"], "read_by": {"$ne": user["id"]}}, {"_id": 0}
    ).to_list(500)
    if msgs:
        unique_senders = {m["from_user_id"] for m in msgs}
        items.append({
            "type": "message",
            "title": f"{len(msgs)} new message{'s' if len(msgs) != 1 else ''} from {len(unique_senders)} friend{'s' if len(unique_senders) != 1 else ''}",
            "link": "/messages",
        })
    return {"count": len(items), "items": items}



# ---------- Personal Messages (DMs) ----------
def _conv_key(a: str, b: str) -> str:
    return "|".join(sorted([a, b]))


@api_router.post("/messages")
async def send_direct_message(data: MessageInput, user=Depends(get_current_user)):
    if data.to_user_id == user["id"]:
        raise HTTPException(400, "Cannot message yourself")
    target = await db.users.find_one({"id": data.to_user_id})
    if not target:
        raise HTTPException(404, "User not found")
    mid = str(uuid.uuid4())
    doc = {
        "id": mid,
        "conv_key": _conv_key(user["id"], data.to_user_id),
        "from_user_id": user["id"],
        "to_user_id": data.to_user_id,
        "text": data.text,
        "image": data.image,
        "read_by": [user["id"]],
        "created_at": now_iso(),
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/messages/conversations")
async def list_conversations(user=Depends(get_current_user)):
    msgs = await db.messages.find(
        {"$or": [{"from_user_id": user["id"]}, {"to_user_id": user["id"]}]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(2000)
    convs = {}
    for m in msgs:
        key = m["conv_key"]
        other_id = m["to_user_id"] if m["from_user_id"] == user["id"] else m["from_user_id"]
        if key not in convs:
            convs[key] = {
                "friend_id": other_id,
                "last_message": m["text"],
                "last_at": m["created_at"],
                "unread": 0,
            }
        if user["id"] not in m.get("read_by", []):
            convs[key]["unread"] += 1
    result = []
    for c in convs.values():
        u = await user_public(c["friend_id"])
        if u:
            c["friend"] = u
            result.append(c)
    result.sort(key=lambda x: x["last_at"], reverse=True)
    return result


@api_router.get("/messages/thread/{friend_id}")
async def get_thread(friend_id: str, user=Depends(get_current_user)):
    key = _conv_key(user["id"], friend_id)
    # Mark incoming messages as read BEFORE fetching so response reflects state
    await db.messages.update_many(
        {"conv_key": key, "from_user_id": friend_id},
        {"$addToSet": {"read_by": user["id"]}},
    )
    msgs = await db.messages.find({"conv_key": key}, {"_id": 0}).sort("created_at", 1).to_list(500)
    friend = await user_public(friend_id)
    return {"friend": friend, "messages": msgs}


# ---------- Public user profile ----------
@api_router.get("/users/{uid}")
async def get_user_profile(uid: str, user=Depends(get_current_user)):
    target = await db.users.find_one({"id": uid}, {"_id": 0, "password": 0})
    if not target:
        raise HTTPException(404, "User not found")
    p = target.get("profile") or {}
    posts = await db.posts.find({"author_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for post in posts:
        post["like_count"] = len(post.get("likes", []))
        post["comment_count"] = len(post.get("comments", []))
    friends_list = target.get("friends", [])
    my_friends = set(user.get("friends", []))
    sent = set(user.get("friend_requests_out", []))
    return {
        "id": target["id"],
        "name": p.get("name") or target["name"],
        "avatar": p.get("avatar"),
        "city": p.get("city"),
        "bio": p.get("bio"),
        "age": p.get("age"),
        "interests": p.get("interests", []),
        "post_count": len(posts),
        "friend_count": len(friends_list),
        "is_friend": uid in my_friends,
        "request_sent": uid in sent,
        "is_me": uid == user["id"],
        "posts": posts,
    }


# ---------- Demo Seed ----------
DEMO_GROUPS = [
    {"name": "Gardening Circle", "category": "Gardening", "description": "Share your plants, tips, and seasonal harvests.", "image": "https://images.unsplash.com/photo-1693154629670-ce08bf178ecb"},
    {"name": "Grandma's Kitchen", "category": "Cooking", "description": "Traditional recipes and family secrets.", "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136"},
    {"name": "Morning Yoga", "category": "Yoga", "description": "Gentle yoga, pranayama, and daily stretches.", "image": "https://images.unsplash.com/photo-1782389084089-33dcf931da98"},
    {"name": "Bhajans & Kirtans", "category": "Bhajans", "description": "Devotional songs, satsang and daily prayers.", "image": "https://images.unsplash.com/photo-1604608672516-f1b9b1d1fdb2"},
    {"name": "Book Lovers", "category": "Reading", "description": "Novels, biographies and spiritual books.", "image": "https://images.unsplash.com/photo-1758691031958-29541f3207a5"},
    {"name": "Old Melodies", "category": "Music", "description": "Rafi, Lata, Kishore — classics that warm the heart.", "image": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745"},
    {"name": "Walking Club", "category": "Walking", "description": "Daily walks, step counts and encouragement.", "image": "https://images.unsplash.com/photo-1519162808019-7de1683fa2ad"},
]

DEMO_USERS = [
    {"name": "Kamala Rao", "email": "kamala@demo.com", "age": 68, "city": "Bengaluru", "interests": ["Gardening", "Bhajans"], "bio": "Retired teacher. Love my rose garden and evening bhajans."},
    {"name": "Ramesh Kulkarni", "email": "ramesh@demo.com", "age": 72, "city": "Pune", "interests": ["Reading", "Music"], "bio": "Ex-army. Reading is my daily prayer."},
    {"name": "Lakshmi Iyer", "email": "lakshmi@demo.com", "age": 65, "city": "Chennai", "interests": ["Cooking", "Yoga"], "bio": "Grandmother of three. Kitchen is my temple."},
    {"name": "Harbhajan Singh", "email": "harbhajan@demo.com", "age": 70, "city": "Chandigarh", "interests": ["Walking", "Music"], "bio": "Morning walker. Old Bollywood is life."},
]

SYSTEM_POSTS = [
    {"content": "Health tip 🩺: Drink a warm glass of water first thing in the morning. It helps digestion and starts the day right. (This is a general tip — please check with your doctor for personal advice.)"},
    {"content": "Nostalgia 🎶: Did you know Kishore Kumar recorded over 2,700 songs? Which is your favourite? Share in the comments!"},
    {"content": "Festival ✨: Makar Sankranti is round the corner. Time for til-gud, kites and pongal. What are your plans this year?"},
    {"content": "Simple tech 📱: To make a WhatsApp video call — open the chat, tap the camera icon at the top-right. That's it! Try it with your grandchildren today."},
    {"content": "Health tip 🚶: A 20-minute walk after dinner improves sleep and lowers blood sugar. Slow, comfortable pace is best. (Consult your doctor for what suits you.)"},
]

NOSTALGIA_ITEMS = [
    {"title": "Mere Sapno Ki Rani", "artist": "Kishore Kumar", "year": 1969, "category": "song",
     "description": "Rajesh Khanna's dreamy jeep ride in Aradhana — pure Bollywood magic.",
     "image": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745",
     "youtube": "https://www.youtube.com/results?search_query=Mere+Sapno+Ki+Rani"},
    {"title": "Lag Jaa Gale", "artist": "Lata Mangeshkar", "year": 1964, "category": "song",
     "description": "Timeless Lata — from Woh Kaun Thi. A song that still gives goosebumps.",
     "image": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745",
     "youtube": "https://www.youtube.com/results?search_query=Lag+Jaa+Gale"},
    {"title": "Yeh Shaam Mastani", "artist": "Kishore Kumar", "year": 1970, "category": "song",
     "description": "Rajesh Khanna and Asha Parekh in Kati Patang — evening romance defined.",
     "image": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745",
     "youtube": "https://www.youtube.com/results?search_query=Yeh+Shaam+Mastani"},
    {"title": "Kuhu Kuhu Bole Koyaliya", "artist": "M.S. Subbulakshmi", "year": 1958, "category": "song",
     "description": "Classical brilliance from Suvarna Sundari — melody across ragas.",
     "image": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745",
     "youtube": "https://www.youtube.com/results?search_query=Kuhu+Kuhu+Bole+Koyaliya"},
    {"title": "Independence Day, 1947", "year": 1947, "category": "event",
     "description": "At the stroke of the midnight hour, India awakens to freedom. Do you remember stories from your parents?",
     "image": "https://images.unsplash.com/photo-1532375810709-75b1da00537c"},
    {"title": "First Man on the Moon", "year": 1969, "category": "event",
     "description": "Neil Armstrong walks on the moon. Where were you when you heard the news on the radio?",
     "image": "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4"},
    {"title": "Doordarshan Ramayana", "year": 1987, "category": "event",
     "description": "Sundays used to stop when Ramanand Sagar's Ramayan aired on DD. Whole families gathered.",
     "image": "https://images.unsplash.com/photo-1509281373149-e957c6296406"},
    {"title": "Diwali", "year": 0, "category": "festival",
     "description": "Diyas, rangolis, sweets, and family gatherings. The festival of lights that unites every home.",
     "image": "https://images.unsplash.com/photo-1604608672516-f1b9b1d1fdb2"},
    {"title": "Holi", "year": 0, "category": "festival",
     "description": "Colours, gujiya, thandai, and the joy of forgiving and starting fresh.",
     "image": "https://images.unsplash.com/photo-1583211237437-d31d33e2fefe"},
    {"title": "Onam", "year": 0, "category": "festival",
     "description": "Sadya on banana leaf, pookalam, vallam kali — Kerala's grandest celebration.",
     "image": "https://images.unsplash.com/photo-1604608672516-f1b9b1d1fdb2"},
]


def _future_date(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).date().isoformat()


EVENT_ITEMS = [
    {"title": "Morning Bhajans at Ulsoor Temple", "city": "Bengaluru", "venue": "Ulsoor Someshwara Temple", "category": "Satsang",
     "description": "Community bhajans followed by prasadam. All are welcome.",
     "image": "https://images.unsplash.com/photo-1604608672516-f1b9b1d1fdb2"},
    {"title": "Cubbon Park Walking Group", "city": "Bengaluru", "venue": "Cubbon Park, Gate 4", "category": "Walk",
     "description": "Daily walking group for seniors. Gentle pace, lots of conversation.",
     "image": "https://images.unsplash.com/photo-1519162808019-7de1683fa2ad"},
    {"title": "Kannada Book Club", "city": "Bengaluru", "venue": "Indiranagar Library", "category": "Reading",
     "description": "Discussing Kuvempu's poetry this week.",
     "image": "https://images.unsplash.com/photo-1758691031958-29541f3207a5"},
    {"title": "Marathi Natya Sandhya", "city": "Pune", "venue": "Balgandharva Rang Mandir", "category": "Culture",
     "description": "Evening of Marathi plays and old film songs.",
     "image": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745"},
    {"title": "Yoga in the Park", "city": "Pune", "venue": "Saras Baug", "category": "Yoga",
     "description": "Free morning yoga for seniors, guided by a certified instructor.",
     "image": "https://images.unsplash.com/photo-1782389084089-33dcf931da98"},
    {"title": "Carnatic Music Concert", "city": "Chennai", "venue": "Music Academy", "category": "Music",
     "description": "Rising vocalists perform. Free entry for seniors above 60.",
     "image": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745"},
    {"title": "Marina Beach Walk", "city": "Chennai", "venue": "Marina Beach", "category": "Walk",
     "description": "Sunrise walking group. Meet near lighthouse.",
     "image": "https://images.unsplash.com/photo-1519162808019-7de1683fa2ad"},
    {"title": "Gurudwara Community Kirtan", "city": "Chandigarh", "venue": "Gurudwara Sector 34", "category": "Satsang",
     "description": "Evening kirtan and langar for all.",
     "image": "https://images.unsplash.com/photo-1604608672516-f1b9b1d1fdb2"},
    {"title": "Rose Garden Walk", "city": "Chandigarh", "venue": "Zakir Hussain Rose Garden", "category": "Walk",
     "description": "Weekend walking meet in India's largest rose garden.",
     "image": "https://images.unsplash.com/photo-1519162808019-7de1683fa2ad"},
]


@app.on_event("startup")
async def seed():
    # Seed groups
    if await db.groups.count_documents({}) == 0:
        for c in DEMO_GROUPS:
            await db.groups.insert_one({"id": str(uuid.uuid4()), **c, "created_by": "system",
                                        "created_at": now_iso(), "members": []})
    # Seed demo users (all with password "demo1234")
    if await db.users.count_documents({"email": {"$in": [u["email"] for u in DEMO_USERS]}}) == 0:
        for u in DEMO_USERS:
            uid = str(uuid.uuid4())
            await db.users.insert_one({
                "id": uid,
                "name": u["name"],
                "email": u["email"],
                "password": hash_password("demo1234"),
                "profile": {"name": u["name"], "age": u["age"], "city": u["city"],
                            "language": "English", "interests": u["interests"],
                            "bio": u["bio"], "avatar": None},
                "joined_groups": [],
                "friends": [],
                "friend_requests_in": [],
                "friend_requests_out": [],
                "created_at": now_iso(),
            })
    # Seed system posts
    if await db.posts.count_documents({"author_id": "system"}) == 0:
        for p in SYSTEM_POSTS:
            await db.posts.insert_one({
                "id": str(uuid.uuid4()),
                "group_id": None,
                "content": p["content"],
                "image": None,
                "video": None,
                "author_id": "system",
                "author_name": "Sahaaya Daily",
                "likes": [],
                "comments": [],
                "created_at": now_iso(),
            })
    # Seed nostalgia
    if await db.nostalgia.count_documents({}) == 0:
        for n in NOSTALGIA_ITEMS:
            await db.nostalgia.insert_one({"id": str(uuid.uuid4()), **n, "created_at": now_iso()})
    # Seed events (with future dates)
    if await db.events.count_documents({}) == 0:
        for i, e in enumerate(EVENT_ITEMS):
            await db.events.insert_one({
                "id": str(uuid.uuid4()),
                **e,
                "date": _future_date(3 + (i * 2) % 25),
                "time": ["07:00", "17:30", "18:00"][i % 3],
                "created_at": now_iso(),
            })
    logging.info("Seed complete")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
