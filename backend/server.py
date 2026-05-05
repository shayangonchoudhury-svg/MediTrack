from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import secrets
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# ---------- Database ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


# ---------- App & Router ----------
app = FastAPI(title="MediTrack API")
api = APIRouter(prefix="/api")

JWT_ALG = "HS256"
ACCESS_MIN = 60 * 24  # 1 day
REFRESH_DAYS = 30


# ---------- Models ----------
class UserPublic(BaseModel):
    id: str
    email: str
    name: str


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    relation: Optional[str] = Field(default="self", max_length=40)
    color: Optional[str] = Field(default="#34D399")


class ProfileOut(ProfileIn):
    id: str
    user_id: str
    created_at: str


class MedicineIn(BaseModel):
    profile_id: str
    name: str = Field(min_length=1, max_length=120)
    dosage: str = Field(min_length=1, max_length=80)  # e.g. "500 mg"
    form: Optional[str] = Field(default="tablet", max_length=40)  # tablet/capsule/syrup
    times: List[str] = Field(default_factory=list)  # ["08:00", "20:00"]
    frequency: Literal["daily", "weekly", "custom"] = "daily"
    days_of_week: List[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6])  # 0=Mon
    notes: Optional[str] = Field(default="", max_length=500)
    color: Optional[str] = "#34D399"
    start_date: Optional[str] = None  # ISO date
    end_date: Optional[str] = None


class MedicineOut(MedicineIn):
    id: str
    user_id: str
    created_at: str


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    form: Optional[str] = None
    times: Optional[List[str]] = None
    frequency: Optional[Literal["daily", "weekly", "custom"]] = None
    days_of_week: Optional[List[int]] = None
    notes: Optional[str] = None
    color: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class DoseStatusIn(BaseModel):
    medicine_id: str
    profile_id: str
    scheduled_time: str  # "HH:MM"
    date: str  # ISO date YYYY-MM-DD
    status: Literal["taken", "skipped", "pending"]


class DoseLogOut(BaseModel):
    id: str
    user_id: str
    profile_id: str
    medicine_id: str
    date: str
    scheduled_time: str
    status: str
    updated_at: str


# ---------- Helpers ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode("utf-8"), h.encode("utf-8"))
    except Exception:
        return False


def jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def make_access(uid: str, email: str) -> str:
    return jwt.encode(
        {
            "sub": uid,
            "email": email,
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN),
        },
        jwt_secret(),
        algorithm=JWT_ALG,
    )


def make_refresh(uid: str) -> str:
    return jwt.encode(
        {
            "sub": uid,
            "type": "refresh",
            "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS),
        },
        jwt_secret(),
        algorithm=JWT_ALG,
    )


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie(
        "access_token", access, httponly=True, secure=False, samesite="lax",
        max_age=ACCESS_MIN * 60, path="/",
    )
    response.set_cookie(
        "refresh_token", refresh, httponly=True, secure=False, samesite="lax",
        max_age=REFRESH_DAYS * 86400, path="/",
    )


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        ah = request.headers.get("Authorization", "")
        if ah.startswith("Bearer "):
            token = ah[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def public_user(u: dict) -> dict:
    return {"id": u["id"], "email": u["email"], "name": u.get("name", "")}


# ---------- Brute-force ----------
async def check_lockout(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("count", 0) >= 5:
        last = rec.get("last_attempt")
        if last:
            last_dt = datetime.fromisoformat(last)
            if datetime.now(timezone.utc) - last_dt < timedelta(minutes=15):
                raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")


async def record_failure(identifier: str):
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {"$inc": {"count": 1}, "$set": {"last_attempt": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )


async def clear_failures(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


# ---------- Auth routes ----------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    user_doc = {
        "id": uid,
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    # Create default "Self" profile
    await db.profiles.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "name": payload.name.strip(),
        "relation": "self",
        "color": "#34D399",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    set_auth_cookies(response, make_access(uid, email), make_refresh(uid))
    return public_user(user_doc)


@api.post("/auth/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    await check_lockout(identifier)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        await record_failure(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await clear_failures(identifier)
    set_auth_cookies(response, make_access(user["id"], email), make_refresh(user["id"]))
    return public_user(user)


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    tok = request.cookies.get("refresh_token")
    if not tok:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(tok, jwt_secret(), algorithms=[JWT_ALG])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        uid = payload["sub"]
        user = await db.users.find_one({"id": uid}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = make_access(uid, user["email"])
        response.set_cookie(
            "access_token", access, httponly=True, secure=False, samesite="lax",
            max_age=ACCESS_MIN * 60, path="/",
        )
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- Profiles ----------
@api.get("/profiles")
async def list_profiles(user: dict = Depends(get_current_user)):
    docs = await db.profiles.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return docs


@api.post("/profiles")
async def create_profile(payload: ProfileIn, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": payload.name.strip(),
        "relation": payload.relation,
        "color": payload.color or "#34D399",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.profiles.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/profiles/{pid}")
async def update_profile(pid: str, payload: ProfileIn, user: dict = Depends(get_current_user)):
    res = await db.profiles.update_one(
        {"id": pid, "user_id": user["id"]},
        {"$set": {"name": payload.name.strip(), "relation": payload.relation, "color": payload.color}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    doc = await db.profiles.find_one({"id": pid}, {"_id": 0})
    return doc


@api.delete("/profiles/{pid}")
async def delete_profile(pid: str, user: dict = Depends(get_current_user)):
    res = await db.profiles.delete_one({"id": pid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    await db.medicines.delete_many({"profile_id": pid, "user_id": user["id"]})
    await db.dose_logs.delete_many({"profile_id": pid, "user_id": user["id"]})
    return {"ok": True}


# ---------- Medicines ----------
@api.get("/medicines")
async def list_medicines(profile_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"user_id": user["id"]}
    if profile_id:
        q["profile_id"] = profile_id
    docs = await db.medicines.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.post("/medicines")
async def create_medicine(payload: MedicineIn, user: dict = Depends(get_current_user)):
    # ensure profile belongs to user
    prof = await db.profiles.find_one({"id": payload.profile_id, "user_id": user["id"]})
    if not prof:
        raise HTTPException(status_code=404, detail="Profile not found")
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.medicines.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/medicines/{mid}")
async def update_medicine(mid: str, payload: MedicineUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.medicines.update_one({"id": mid, "user_id": user["id"]}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    doc = await db.medicines.find_one({"id": mid}, {"_id": 0})
    return doc


@api.delete("/medicines/{mid}")
async def delete_medicine(mid: str, user: dict = Depends(get_current_user)):
    res = await db.medicines.delete_one({"id": mid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    await db.dose_logs.delete_many({"medicine_id": mid, "user_id": user["id"]})
    return {"ok": True}


# ---------- Schedule (today / by date) ----------
def medicine_active_on(med: dict, target: date) -> bool:
    sd = med.get("start_date")
    ed = med.get("end_date")
    if sd:
        try:
            if target < date.fromisoformat(sd):
                return False
        except Exception:
            pass
    if ed:
        try:
            if target > date.fromisoformat(ed):
                return False
        except Exception:
            pass
    freq = med.get("frequency", "daily")
    if freq == "daily":
        return True
    if freq in ("weekly", "custom"):
        dow = target.weekday()  # 0=Mon
        return dow in (med.get("days_of_week") or [])
    return True


@api.get("/schedule")
async def get_schedule(
    profile_id: str,
    target_date: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    if target_date:
        try:
            d = date.fromisoformat(target_date)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid date")
    else:
        d = date.today()
    iso_d = d.isoformat()

    meds = await db.medicines.find(
        {"user_id": user["id"], "profile_id": profile_id}, {"_id": 0}
    ).to_list(500)

    logs = await db.dose_logs.find(
        {"user_id": user["id"], "profile_id": profile_id, "date": iso_d}, {"_id": 0}
    ).to_list(2000)
    log_map = {(l["medicine_id"], l["scheduled_time"]): l for l in logs}

    items = []
    for m in meds:
        if not medicine_active_on(m, d):
            continue
        for t in m.get("times", []):
            log = log_map.get((m["id"], t))
            items.append({
                "medicine_id": m["id"],
                "medicine_name": m["name"],
                "dosage": m["dosage"],
                "form": m.get("form", "tablet"),
                "color": m.get("color", "#34D399"),
                "notes": m.get("notes", ""),
                "scheduled_time": t,
                "date": iso_d,
                "status": log["status"] if log else "pending",
            })
    items.sort(key=lambda x: x["scheduled_time"])
    return {"date": iso_d, "items": items}


@api.post("/schedule/status")
async def set_dose_status(payload: DoseStatusIn, user: dict = Depends(get_current_user)):
    med = await db.medicines.find_one({"id": payload.medicine_id, "user_id": user["id"]})
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    now = datetime.now(timezone.utc).isoformat()
    key = {
        "user_id": user["id"],
        "profile_id": payload.profile_id,
        "medicine_id": payload.medicine_id,
        "date": payload.date,
        "scheduled_time": payload.scheduled_time,
    }
    await db.dose_logs.update_one(
        key,
        {"$set": {**key, "status": payload.status, "updated_at": now},
         "$setOnInsert": {"id": str(uuid.uuid4())}},
        upsert=True,
    )
    return {"ok": True, "status": payload.status}


# ---------- Stats ----------
@api.get("/stats")
async def get_stats(profile_id: str, days: int = 7, user: dict = Depends(get_current_user)):
    days = max(1, min(days, 90))
    today = date.today()
    start = today - timedelta(days=days - 1)

    meds = await db.medicines.find(
        {"user_id": user["id"], "profile_id": profile_id}, {"_id": 0}
    ).to_list(500)

    iso_start = start.isoformat()
    logs = await db.dose_logs.find(
        {"user_id": user["id"], "profile_id": profile_id, "date": {"$gte": iso_start}},
        {"_id": 0},
    ).to_list(5000)
    log_map = {(l["date"], l["medicine_id"], l["scheduled_time"]): l["status"] for l in logs}

    daily = []
    total_taken = 0
    total_scheduled = 0
    streak = 0
    streak_active = True

    # Walk from today backwards for streak; build daily list ascending
    by_date = []
    for i in range(days):
        d = start + timedelta(days=i)
        iso_d = d.isoformat()
        scheduled = 0
        taken = 0
        skipped = 0
        for m in meds:
            if not medicine_active_on(m, d):
                continue
            for t in m.get("times", []):
                scheduled += 1
                st = log_map.get((iso_d, m["id"], t), "pending")
                if st == "taken":
                    taken += 1
                elif st == "skipped":
                    skipped += 1
        by_date.append({
            "date": iso_d,
            "scheduled": scheduled,
            "taken": taken,
            "skipped": skipped,
            "adherence": round((taken / scheduled) * 100) if scheduled > 0 else 0,
        })
        total_taken += taken
        total_scheduled += scheduled

    # streak: count days from today backwards where adherence >= 100% (all taken) and scheduled>0
    for item in reversed(by_date):
        if item["date"] > today.isoformat():
            continue
        if item["scheduled"] == 0:
            continue
        if item["taken"] >= item["scheduled"]:
            if streak_active:
                streak += 1
        else:
            streak_active = False

    overall = round((total_taken / total_scheduled) * 100) if total_scheduled > 0 else 0
    return {
        "days": days,
        "overall_adherence": overall,
        "current_streak": streak,
        "total_taken": total_taken,
        "total_scheduled": total_scheduled,
        "daily": by_date,
    }


# ---------- Health ----------
@api.get("/")
async def root():
    return {"message": "MediTrack API", "ok": True}


# ---------- Mount ----------
app.include_router(api)

frontend_origin = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Startup ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
log = logging.getLogger("meditrack")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.profiles.create_index([("user_id", 1)])
    await db.medicines.create_index([("user_id", 1), ("profile_id", 1)])
    await db.dose_logs.create_index([("user_id", 1), ("profile_id", 1), ("date", 1)])
    await db.login_attempts.create_index("identifier")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@meditrack.app").lower()
    admin_pwd = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid,
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_pwd),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await db.profiles.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "name": "Admin",
            "relation": "self",
            "color": "#34D399",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        log.info("Seeded admin user %s", admin_email)
    else:
        if not verify_password(admin_pwd, existing["password_hash"]):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_pwd)}},
            )


@app.on_event("shutdown")
async def shutdown():
    client.close()
