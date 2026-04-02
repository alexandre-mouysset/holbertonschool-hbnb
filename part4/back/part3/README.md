# HBnB - Part 3 : SQLAlchemy Persistence

REST API for the HBnB application built with Flask and Flask-RESTx.
This part persists entities with SQLAlchemy instead of keeping everything in memory.

## Architecture

```
part3/
├── app/
│   ├── api/v1/          # Endpoints (users, amenities, places, reviews, auth)
│   ├── models/          # SQLAlchemy models + validation
│   ├── persistence/     # SQLAlchemy repositories
│   └── services/        # Facade pattern
├── instance/            # SQLite database files
├── config.py            # Configuration settings
├── run.py               # Entry point
├── schema.sql           # SQL script to create tables
├── seed.sql             # SQL script to populate database
└── requirement.txt      # Dependencies
```

## Installation

```bash
git clone https://github.com/ylabate/holbertonschool-hbnb.git
cd holbertonschool-hbnb/part3
pip install -r requirement.txt
```

## Initialise the database with admin
```bash
mkdir instance
cat schema.sql | sqlite3 instance/development.db
cat seed.sql | sqlite3 instance/development.db
```

## Run the server

```bash
python run.py
```

API available at: `http://localhost:5000/api/v1/`
Swagger UI available at: `http://localhost:5000/`

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/` | Authenticate user and return a JWT token |
| GET | `/api/v1/auth/protected` | A protected endpoint that requires a valid JWT token |
| GET/POST | `/api/v1/users/` | List all users / Create a user (Admin only) |
| GET/PUT | `/api/v1/users/<id>` | Get / Update a user |
| GET/POST | `/api/v1/amenities/` | List all amenities / Create an amenity (Admin only) |
| GET/PUT | `/api/v1/amenities/<id>` | Get / Update an amenity (Admin only) |
| GET/POST | `/api/v1/places/` | List all places / Create a place |
| GET/PUT/DELETE | `/api/v1/places/<id>` | Get / Update / Delete a place |
| GET/POST | `/api/v1/reviews/` | List all reviews / Create a review |
| GET/PUT/DELETE | `/api/v1/reviews/<id>` | Get / Update / Delete a review |
| GET | `/api/v1/reviews/by_place/<id>` | Get all reviews for a place |

## Tests

All tests use Python's `doctest` module and must be run from the `part3/` directory.

```bash
# Models
python3 -m doctest app/models/tests.txt

# Facade (business logic)
python3 -m doctest app/services/tests_facade.txt

# API endpoints
python3 -m doctest app/api/v1/tests.txt
```


> **Note:** User, Place, Review and Amenity are now stored in the SQLite database configured in [config.py](config.py).


```mermaid
erDiagram
	direction TB
	User {
		string id  "PK"  
		string first_name  ""  
		string last_name  ""  
		string email  ""  
		string password  ""  
		boolean is_admin  ""  
	}

	Place {
		string id  "PK"  
		string title  ""  
		string description  ""  
		float price  ""  
		float latitude  ""  
		float longitude  ""  
		string user_id  "FK"  
	}

	Review {
		string id  "PK"  
		string text  ""  
		int rating  ""  
		string user_id  "FK"  
		string place_id  "FK"  
	}

	Amenity {
		string id  "PK"  
		string name  ""  
		string description  ""  
	}

	Place_Amenity {
		string place_id  "PK, FK"  
		string amenity_id  "PK, FK"  
	}

	User||--o{Place:"Has"
	User||--o{Review:"Post"
	Review}o--||Place:"About"
	Place||--o{Place_Amenity:"has"
	Amenity||--o{Place_Amenity:"is_linked_to"
```
