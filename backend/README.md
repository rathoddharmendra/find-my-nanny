Backend (Flask)

Run locally:
1) python3 -m venv .venv
2) source .venv/bin/activate
3) pip install -r requirements.txt
4) python app.py

API:
- POST /api/register
  body: {"email": "test@example.com", "password": "secret", "role": "nanny"}
- GET /health
