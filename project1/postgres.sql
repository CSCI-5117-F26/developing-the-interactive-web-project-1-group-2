DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS links;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS accounts;

CREATE TABLE accounts (
    account_id serial PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    location TEXT,
    lat FLOAT NOT NULL,
    long FLOAT NOT NULL
);

CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    anon INT NOT NULL,
    account INT,
    location INT UNIQUE,
    title TEXT NOT NULL,
    time TIMESTAMP DEFAULT NOW(),
    description TEXT NOT NULL,
    FOREIGN KEY (account) REFERENCES accounts(account_id),
    FOREIGN KEY (place) REFERENCES locations(location_id)
);

CREATE TABLE links (
    post INT NOT NULL,
    link TEXT NOT NULL,
    FOREIGN KEY (post) REFERENCES posts(post_id)
);

CREATE TABLE comments (
    post INT NOT NULL,
    author TEXT NOT NULL,
    time TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (post) REFERENCES posts(post_id)
);
