DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS links;
DROP TABLE IF EXISTS map_blog;

CREATE TABLE map_blog (
    id SERIAL PRIMARY KEY,
    author TEXT,
    username TEXT NOT NULL,
    title TEXT NOT NULL,
    time TIMESTAMP DEFAULT NOW(),
    description TEXT NOT NULL,
    links INT UNIQUE,
    comments INT UNIQUE
);

CREATE TABLE links (
    link_id SERIAL PRIMARY KEY,
    link TEXT NOT NULL,
    FOREIGN KEY (link_id) REFERENCES map_blog(links)
);

CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    author TEXT NOT NULL,
    time TIMESTAMP DEFAULT NOT(),
    FOREIGN KEY (comment_id) REFERENCES map_blog(comments)
);
