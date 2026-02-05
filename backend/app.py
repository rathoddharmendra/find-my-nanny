from __future__ import annotations

import os
import secrets
import sqlite3
from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(APP_DIR, "app.db")

app = Flask(__name__)
CORS(app)


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS nanny_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                full_name TEXT NOT NULL,
                city TEXT NOT NULL,
                zip TEXT NOT NULL,
                years_experience INTEGER NOT NULL,
                availability TEXT NOT NULL,
                bio TEXT NOT NULL,
                services_offered TEXT NOT NULL,
                preferred_rate REAL NOT NULL,
                contact_info TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS contact_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                family_id INTEGER NOT NULL,
                nanny_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (family_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (nanny_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        conn.commit()


def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def get_bearer_token() -> str | None:
    auth = request.headers.get("Authorization") or ""
    if not auth.startswith("Bearer "):
        return None
    return auth.replace("Bearer ", "", 1).strip()


def get_user_from_token() -> sqlite3.Row | None:
    token = get_bearer_token()
    if not token:
        return None
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT users.*
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
            """,
            (token,),
        ).fetchone()
    return row


@app.get("/health")
def health() -> tuple[dict, int]:
    return {"status": "ok"}, 200


@app.post("/api/register")
def register() -> tuple[dict, int]:
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    role = (payload.get("role") or "").strip().lower()

    if not email or not password or not role:
        return {"error": "email, password, and role are required"}, 400

    if role not in {"nanny", "family"}:
        return {"error": "role must be nanny or family"}, 400

    password_hash = generate_password_hash(password)
    created_at = now_iso()

    try:
        with get_db() as conn:
            cursor = conn.execute(
                "INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
                (email, password_hash, role, created_at),
            )
            conn.commit()
    except sqlite3.IntegrityError:
        return {"error": "email already registered"}, 409

    return {"id": cursor.lastrowid, "email": email, "role": role}, 201


@app.post("/api/login")
def login() -> tuple[dict, int]:
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        return {"error": "email and password are required"}, 400

    with get_db() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,),
        ).fetchone()

        if not user or not check_password_hash(user["password_hash"], password):
            return {"error": "invalid credentials"}, 401

        token = secrets.token_urlsafe(32)
        conn.execute(
            "INSERT INTO sessions (user_id, token, created_at) VALUES (?, ?, ?)",
            (user["id"], token, now_iso()),
        )
        conn.commit()

    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "role": user["role"]},
    }, 200


@app.post("/api/logout")
def logout() -> tuple[dict, int]:
    token = get_bearer_token()
    if not token:
        return {"error": "missing token"}, 401

    with get_db() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()

    return {"ok": True}, 200


@app.get("/api/me")
def me() -> tuple[dict, int]:
    user = get_user_from_token()
    if not user:
        return {"error": "unauthorized"}, 401

    return {"id": user["id"], "email": user["email"], "role": user["role"]}, 200


@app.post("/api/nanny_profiles")
def upsert_nanny_profile() -> tuple[dict, int]:
    user = get_user_from_token()
    if not user:
        return {"error": "unauthorized"}, 401
    if user["role"] != "nanny":
        return {"error": "only nannies can create profiles"}, 403

    payload = request.get_json(silent=True) or {}
    required_fields = [
        "full_name",
        "city",
        "zip",
        "years_experience",
        "availability",
        "bio",
        "services_offered",
        "preferred_rate",
        "contact_info",
    ]
    missing = [field for field in required_fields if not str(payload.get(field) or "").strip()]
    if missing:
        return {"error": f"missing fields: {', '.join(missing)}"}, 400
    try:
        years_experience = int(payload["years_experience"])
        preferred_rate = float(payload["preferred_rate"])
    except (TypeError, ValueError):
        return {"error": "years_experience must be an integer and preferred_rate must be a number"}, 400

    created_at = now_iso()
    updated_at = created_at

    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM nanny_profiles WHERE user_id = ?",
            (user["id"],),
        ).fetchone()

        if existing:
            conn.execute(
                """
                UPDATE nanny_profiles
                SET full_name = ?, city = ?, zip = ?, years_experience = ?,
                    availability = ?, bio = ?, services_offered = ?,
                    preferred_rate = ?, contact_info = ?, updated_at = ?
                WHERE user_id = ?
                """,
                (
                    payload["full_name"].strip(),
                    payload["city"].strip(),
                    payload["zip"].strip(),
                    years_experience,
                    payload["availability"].strip(),
                    payload["bio"].strip(),
                    payload["services_offered"].strip(),
                    preferred_rate,
                    payload["contact_info"].strip(),
                    updated_at,
                    user["id"],
                ),
            )
        else:
            conn.execute(
                """
                INSERT INTO nanny_profiles
                    (user_id, full_name, city, zip, years_experience, availability,
                     bio, services_offered, preferred_rate, contact_info, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user["id"],
                    payload["full_name"].strip(),
                    payload["city"].strip(),
                    payload["zip"].strip(),
                    years_experience,
                    payload["availability"].strip(),
                    payload["bio"].strip(),
                    payload["services_offered"].strip(),
                    preferred_rate,
                    payload["contact_info"].strip(),
                    created_at,
                    updated_at,
                ),
            )
        conn.commit()

        profile = conn.execute(
            "SELECT * FROM nanny_profiles WHERE user_id = ?",
            (user["id"],),
        ).fetchone()

    return dict(profile), 200


@app.get("/api/nanny_profiles")
def list_nanny_profiles() -> tuple[dict, int]:
    city = (request.args.get("city") or "").strip()
    zip_code = (request.args.get("zip") or "").strip()
    min_experience = (request.args.get("min_experience") or "").strip()
    max_rate = (request.args.get("max_rate") or "").strip()

    filters = []
    params: list[str | int] = []

    if city:
        filters.append("LOWER(city) = LOWER(?)")
        params.append(city)
    if zip_code:
        filters.append("zip = ?")
        params.append(zip_code)
    if min_experience:
        filters.append("years_experience >= ?")
        params.append(int(min_experience))
    if max_rate:
        filters.append("CAST(preferred_rate AS REAL) <= ?")
        params.append(float(max_rate))

    where_clause = ""
    if filters:
        where_clause = "WHERE " + " AND ".join(filters)

    with get_db() as conn:
        rows = conn.execute(
            f"SELECT * FROM nanny_profiles {where_clause} ORDER BY updated_at DESC",
            params,
        ).fetchall()

    return {"results": [dict(row) for row in rows]}, 200


@app.get("/api/nanny_profiles/<int:profile_id>")
def get_nanny_profile(profile_id: int) -> tuple[dict, int]:
    with get_db() as conn:
        profile = conn.execute(
            "SELECT * FROM nanny_profiles WHERE id = ?",
            (profile_id,),
        ).fetchone()

    if not profile:
        return {"error": "not found"}, 404

    return dict(profile), 200


@app.post("/api/contact_requests")
def create_contact_request() -> tuple[dict, int]:
    user = get_user_from_token()
    if not user:
        return {"error": "unauthorized"}, 401
    if user["role"] != "family":
        return {"error": "only families can contact"}, 403

    payload = request.get_json(silent=True) or {}
    nanny_id = payload.get("nanny_id")
    message = (payload.get("message") or "").strip()

    if not nanny_id or not message:
        return {"error": "nanny_id and message are required"}, 400

    with get_db() as conn:
        nanny = conn.execute(
            "SELECT id FROM users WHERE id = ? AND role = 'nanny'",
            (nanny_id,),
        ).fetchone()
        if not nanny:
            return {"error": "nanny not found"}, 404

        created_at = now_iso()
        cursor = conn.execute(
            """
            INSERT INTO contact_requests (family_id, nanny_id, message, status, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user["id"], nanny_id, message, "pending", created_at),
        )
        conn.commit()

    return {"id": cursor.lastrowid, "status": "pending"}, 201


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
