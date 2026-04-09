# HBnB - Part 4: Backend + Frontend Integration

This folder contains the full HBnB web application split into:
- a Flask REST API backend (with SQLAlchemy persistence)
- a static frontend (HTML, CSS, JavaScript) connected to the API

## Folder Structure

```text
part4/
├── back/
│   └── part3/                # Flask API (users, places, reviews, amenities, auth)
└── front/
    ├── base_files/           # Static pages and browser-side scripts
    ├── src/input.css         # Tailwind source CSS
    └── package.json          # Frontend build scripts
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- SQLite3

## Backend Setup (Flask API)

From the project root:

```bash
cd part4/back/part3
python3 -m venv venv
source venv/bin/activate
pip install -r requirement.txt
```

Initialize the local SQLite database:

```bash
mkdir -p instance
cat schema.sql | sqlite3 instance/development.db
cat seed.sql | sqlite3 instance/development.db
```

Run the API server:

```bash
python run.py
```

Default API base URL:
- `http://127.0.0.1:5000/api/v1`

Swagger UI:
- `http://127.0.0.1:5000/`

## Frontend Setup

In a second terminal:

```bash
cd part4/front
npm install
npm run build:css
```

For live CSS rebuild while editing styles:

```bash
npm run dev:css
```

## Run the Frontend

### Option 1: Open static files directly
Open `part4/front/base_files/index.html` in your browser.

When loaded via `file://`, the frontend uses `http://127.0.0.1:5000/api/v1` by default.

### Option 2: Serve static files locally (recommended)

```bash
cd part4/front/base_files
python3 -m http.server 8080
```

Then open:

`http://127.0.0.1:8080/index.html?api_base=http://127.0.0.1:5000/api/v1`

The `api_base` query parameter tells the frontend where the backend API is running.

## API and Functional Tests

From `part4/back/part3`:

```bash
python3 -m doctest app/models/tests.txt
python3 -m doctest app/services/tests_facade.txt
python3 -m doctest app/api/v1/tests.txt
```

## Notes

- Authentication uses JWT tokens.
- The backend listens on port 5000 by default.
- If backend and frontend run on different hosts or ports, pass a custom `api_base` URL in the frontend page query string.
