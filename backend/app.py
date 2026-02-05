from __future__ import annotations

import os
import sqlite3
from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(APP_DIR, "app.db")

app = Flask(__name__)
CORS(app)


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
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
        conn.commit()


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
    created_at = datetime.utcnow().isoformat() + "Z"

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


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
