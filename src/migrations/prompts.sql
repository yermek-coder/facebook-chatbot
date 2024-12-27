CREATE TABLE IF NOT EXISTS prompts (
	id SERIAL PRIMARY KEY,
	userid SERIAL REFERENCES users(id),
	product VARCHAR(20),
	accountid VARCHAR(30),
	text TEXT
)