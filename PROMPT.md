Project: Nanny Marketplace MVP

1) Product Summary
Build a minimal marketplace where nannies can register and families can search and contact them.

2) MVP Features (Must-Have)
- User registration & login/logout
- Two roles: Nanny, Family
- Nanny profile creation (name, location, experience, availability, services, rate)
- Family search by location (city or zip) with basic filters
- Public profile view (no login required to browse)
- Basic contact request (message or request form)

3) Non-Goals (Not in MVP)
- Payments
- Background checks
- Scheduling/booking
- Mobile apps
- Ratings/reviews
- In-app chat

4) Core User Flows
- Nanny registers -> creates profile -> appears in search
- Family searches by location -> views nanny profile -> sends contact request

5) Data Model (High-Level)
- User (role, auth)
- NannyProfile (user_id, full_name, city, zip, years_experience, availability, bio,
  services_offered, preferred_rate, contact_info)
- ContactRequest (family_id, nanny_id, message, status)

6) Constraints
- Must be simple and fast to build
- MVP only, no complex workflows
- Emphasis on clean UI and basic auth
- Location search limited to city or zip (not GPS)
- Profiles are publicly viewable without login

7) Success Criteria
- A nanny can register and appear in search
- A family can find and send a request
- Auth works reliably for registration/login/logout

8) Open Questions
- What exact filters beyond location (experience, rate)?
- Should contact info be shown or only via request?
- Any moderation needed for profiles?
