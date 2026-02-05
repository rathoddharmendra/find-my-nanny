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
- POST /api/login
  body: {"email": "test@example.com", "password": "secret"}
- POST /api/logout
  header: Authorization: Bearer <token>
- GET /api/me
  header: Authorization: Bearer <token>
- POST /api/nanny_profiles
  header: Authorization: Bearer <token>
  body: {
    "full_name": "Jane Doe",
    "city": "Austin",
    "zip": "78701",
    "years_experience": 5,
    "availability": "Weekdays",
    "bio": "CPR certified",
    "services_offered": "Infant care, tutoring",
    "preferred_rate": "25",
    "contact_info": "jane@example.com"
  }
- GET /api/nanny_profiles?city=Austin&zip=78701&min_experience=2&max_rate=30
- GET /api/nanny_profiles/<id>
- POST /api/contact_requests
  header: Authorization: Bearer <token>
  body: {"nanny_id": 1, "message": "Hi, we'd love to chat."}
- GET /api/contact_requests
  header: Authorization: Bearer <token>
- GET /api/messages?contact_request_id=1
  header: Authorization: Bearer <token>
- POST /api/messages
  header: Authorization: Bearer <token>
  body: {"contact_request_id": 1, "body": "Hello!"}
- GET /api/messages/last
  header: Authorization: Bearer <token>
