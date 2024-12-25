CREATE TABLE IF NOT EXISTS instagram_stories (
	id VARCHAR(200) PRIMARY KEY,
	url TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instagram_messages (
	id VARCHAR(200) PRIMARY KEY,
	sender VARCHAR(50) REFERENCES instagram_users(id),
	recipient VARCHAR(50) REFERENCES instagram_users(id),
	text TEXT,
	reply_to_message VARCHAR(200) REFERENCES instagram_messages(id),
	reply_to_story VARCHAR(200) REFERENCES instagram_stories(id),
	is_echo BOOLEAN DEFAULT FALSE,
	quick_reply TEXT,
	timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);