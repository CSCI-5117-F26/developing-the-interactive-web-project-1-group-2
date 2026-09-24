DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS links;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS accounts;

CREATE TABLE accounts (
    account_id serial PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    author TEXT,    -- author can be username or NULL (anonymous)
    account INT NOT NULL,
    lat FLOAT,      -- Is location optional input? If so, then NULL values possible
    long FLOAT,
    title TEXT NOT NULL,
    time TIMESTAMP DEFAULT NOW(),
    description TEXT NOT NULL,
    links INT UNIQUE,
    comments INT UNIQUE,
    FOREIGN KEY (account) REFERENCES accounts(account_id)
);

CREATE TABLE links (
    link_id SERIAL PRIMARY KEY,
    link TEXT NOT NULL,
    FOREIGN KEY (link_id) REFERENCES posts(links)
);

CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    author TEXT NOT NULL,
    time TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (comment_id) REFERENCES posts(comments)
);
