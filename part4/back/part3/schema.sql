CREATE TABLE IF NOT EXISTS amenities (
	name VARCHAR(50) NOT NULL,
	description VARCHAR(500),
	id VARCHAR(36) NOT NULL,
	created_at DATETIME,
	updated_at DATETIME,
	PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS users (
	first_name VARCHAR(50) NOT NULL,
	last_name VARCHAR(50) NOT NULL,
	email VARCHAR(120) NOT NULL UNIQUE,
	password VARCHAR(128) NOT NULL,
	is_admin BOOLEAN DEFAULT false,
	id VARCHAR(36) NOT NULL,
	created_at DATETIME,
	updated_at DATETIME,
	PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS reviews (
	text VARCHAR(500) NOT NULL,
	rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
	user_id VARCHAR(36) NOT NULL,
	place_id VARCHAR(36) NOT NULL,
	id VARCHAR(36) NOT NULL,
	created_at DATETIME,
	updated_at DATETIME,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id),
	FOREIGN KEY(place_id) REFERENCES places (id),
	UNIQUE (user_id, place_id)
);

CREATE TABLE IF NOT EXISTS places (
	title VARCHAR(100) NOT NULL,
	description VARCHAR(500),
	price FLOAT NOT NULL,
	latitude FLOAT NOT NULL,
	longitude FLOAT NOT NULL,
	user_id VARCHAR(36) NOT NULL,
	id VARCHAR(36) NOT NULL,
	created_at DATETIME,
	updated_at DATETIME,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS place_amenity (
	place_id VARCHAR(36) NOT NULL,
	amenity_id VARCHAR(36) NOT NULL,
	PRIMARY KEY (place_id, amenity_id),
	FOREIGN KEY(place_id) REFERENCES places (id),
	FOREIGN KEY(amenity_id) REFERENCES amenities (id)
);