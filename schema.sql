CREATE TABLE IF NOT EXISTS verified_users (
    user_id INTEGER NOT NULL,
    chat_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    verified_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, chat_id)
);

CREATE TABLE IF NOT EXISTS pending_otps (
    user_id INTEGER PRIMARY KEY,
    group_chat_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS group_state (
    chat_id INTEGER PRIMARY KEY,
    last_welcome_message_id INTEGER
);