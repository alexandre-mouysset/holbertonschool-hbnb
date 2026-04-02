# holbertonschool-hbnb

HBnB fullstack school project (Flask REST API + static frontend) for Holberton School.

## Live Demo

- https://holbertonschool-hbnb.onrender.com/

This repository contains multiple milestones (`part1` to `part4`) and the most complete runnable stack in `part4`:
- Backend API: `part4/back/part3`
- Frontend: `part4/front/base_files`

## What Is Implemented (Current State)

- JWT authentication (login + protected endpoints)
- CRUD flows for places/reviews/users/amenities (API side)
- Dynamic frontend pages:
	- places list with filters
	- place details with reviews and stars
	- add review page
	- create/update place
	- my places page (list own places + modify/delete)
- Token expiration handling on frontend
- Amenity picker by name (IDs filled automatically)

## Repository Layout

```text
.
├── part1/                  # UML / architecture diagrams
├── part2/                  # earlier backend milestone
├── part3/                  # intermediate backend milestone
└── part4/
		├── back/part3/         # Flask + SQLAlchemy backend (main API to run)
		└── front/              # frontend sources + built static files
```

## Prerequisites

- Python 3.10+
- Node.js 20+ (recommended for Tailwind CLI v4)
- pip

## Quick Start

### 1) Start backend API

```bash
cd part4/back/part3
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirement.txt

mkdir -p instance
python3 - <<'PY'
import sqlite3
from pathlib import Path

db = Path("instance/development.db")
schema = Path("schema.sql").read_text()
seed = Path("seed.sql").read_text()

con = sqlite3.connect(db)
con.executescript(schema)
con.executescript(seed)
con.commit()
con.close()
print("Database initialized:", db)
PY

python3 run.py
```

Backend URLs:
- Swagger UI: `http://127.0.0.1:5000/`
- API base: `http://127.0.0.1:5000/api/v1/`

### 2) Build frontend CSS

```bash
cd part4/front
npm install
npm run build:css
```

Optional dev mode:

```bash
npm run dev:css
```

### 3) Open frontend pages

Open files from `part4/front/base_files/` in your browser (or via local static server):
- `index.html`
- `place.html`
- `add_review.html`
- `my_places.html`
- `login.html`
- `signup.html`

## API Main Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/auth/` | Login and get JWT token |
| GET/POST | `/api/v1/places/` | List / create places |
| GET/PUT/DELETE | `/api/v1/places/<place_id>` | Read / update / delete place |
| GET/POST | `/api/v1/reviews/` | List / create reviews |
| GET | `/api/v1/reviews/by_place/<place_id>` | Reviews for one place |
| GET/POST | `/api/v1/amenities/` | List / create amenities |
| GET/PUT | `/api/v1/amenities/<amenity_id>` | Read / update amenity |
| GET/POST | `/api/v1/users/` | List / create users |
| GET/PUT | `/api/v1/users/<user_id>` | Read / update user |

## Auth Notes

- Frontend sends `Authorization: Bearer <token>` when token exists.
- If token expires, frontend clears stale auth data and asks user to login again.
- Current backend does not set custom access token duration in config, so Flask-JWT-Extended default applies.

## Tests (Backend)

From `part4/back/part3`:

```bash
python3 -m doctest app/models/tests.txt
python3 -m doctest app/services/tests_facade.txt
python3 -m doctest app/api/v1/tests.txt
```

## Common Workflow

1. Login from `login.html`
2. Browse places in `index.html`
3. Open details from `place.html?id=<place_id>`
4. Add review when authenticated
5. Manage own places in `my_places.html`

## Troubleshooting

- Styles not updating:
	- Rebuild CSS with `npm run build:css`.
- Review fails with `Place not found`:
	- Use a real place ID from API (not `demo-*` fallback IDs).
- Unauthorized/expired behavior:
	- Login again to refresh JWT token.