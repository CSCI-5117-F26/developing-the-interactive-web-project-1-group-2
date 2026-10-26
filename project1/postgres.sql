CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS links;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS icons;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS accounts;

CREATE TABLE accounts (
    account_id serial PRIMARY KEY,
    auth0_sub TEXT UNIQUE NOT NULL, -- "sub" (subject) is Auth0's internal unique account identifier. Use this field to determine authorization
    username TEXT NOT NULL
);

CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    location TEXT,
    geoType TEXT NOT NULL,
    coord GEOMETRY NOT NULL,     -- (long, lat)
    addr TEXT,
    city TEXT,
    state TEXT,
    zip INT
);

-- this table for is uploaded custom icons
CREATE TABLE icons (
    icon_id SERIAL PRIMARY KEY,
    icon_file BYTEA NOT NULL,
    mime_type TEXT NOT NULL
);

CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    default_pin TEXT NOT NULL DEFAULT 'black_pin.png',
    icon TEXT NOT NULL DEFAULT U&'\+01F4CD',
    icon_option TEXT NOT NULL DEFAULT 'pin',
    icon_id INT,
    anon BOOLEAN NOT NULL,
    account INT,
    location INT UNIQUE,
    title TEXT NOT NULL,
    time TIMESTAMP DEFAULT NOW(),
    description TEXT NOT NULL,
    FOREIGN KEY (icon_id) REFERENCES icons(icon_id),
    FOREIGN KEY (account) REFERENCES accounts(account_id),
    FOREIGN KEY (location) REFERENCES locations(location_id)
);

CREATE TABLE links (
    post INT NOT NULL,
    link TEXT NOT NULL,
    image_file BYTEA NOT NULL,
    mime_type TEXT NOT NULL,
    FOREIGN KEY (post) REFERENCES posts(post_id)
);



CREATE TABLE comments (
    post INT NOT NULL,
    author TEXT NOT NULL,
    time TIMESTAMP DEFAULT NOW(),
    comment TEXT NOT NULL,
    FOREIGN KEY (post) REFERENCES posts(post_id)
);
