CREATE TABLE IF NOT EXISTS instagram_media (
	id VARCHAR(200) PRIMARY KEY,
	type VARCHAR(50),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instagram_users (
	id VARCHAR(50) PRIMARY KEY,
	username VARCHAR(50),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instagram_comments (
	id VARCHAR(200) PRIMARY KEY,
	media_id VARCHAR(50) REFERENCES instagram_media(id),
	parent_id VARCHAR(200) REFERENCES instagram_comments(id),
	sender_id VARCHAR(50) REFERENCES instagram_users(id),
	text TEXT,
	timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);