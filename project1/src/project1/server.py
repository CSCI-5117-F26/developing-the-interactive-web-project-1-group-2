from flask import Flask, render_template
import psycopg2
# from markupsafe import escape

app = Flask(__name__)

# change if your info differs
# conn = psycopg2.connect(database="postgres", 
#                         user="postgres",
#                         password="root", 
#                         host="localhost", 
#                         port="5432")
# cursor = conn.cursor()
# cursor.execute('DROP TABLE IF EXISTS comments;')
# cursor.execute('DROP TABLE IF EXISTS links;')
# cursor.execute('DROP TABLE IF EXISTS map_blog;')
# cursor.execute('CREATE TABLE map_blog ('
#                'id SERIAL PRIMARY KEY,'
#                'author TEXT,'
#                'username TEXT NOT NULL,'
#                'time TIMESTAMP DEFAULT NOW(),'
#                'description TEXT NOT NULL,'
#                'links INT UNIQUE,'
#                'comments INT UNIQUE);')
# cursor.execute('CREATE TABLE links ('
#                'link_id SERIAL PRIMARY KEY,'
#                'link TEXT NOT NULL,'
#                'FOREIGN KEY (link_id) REFERENCES map_blog(links));')
# cursor.execute('CREATE TABLE comments ('
#                'comment_id SERIAL PRIMARY KEY,'
#                'author TEXT,'
#                'time TIMESTAMP DEFAULT NOW(),'
#                'FOREIGN KEY (comment_id) REFERENCES map_blog(comments));')
# conn.commit()
# cursor.close()
# conn.close()

@app.get("/")
def home_page():
    return render_template("map.html"), 200

@app.get("/map")
def map_page():
    return render_template("map.html"), 200

@app.get("/blog")
def blog_page():
    return render_template("blog.html"), 200

@app.get("/account")
def account_page():
    return render_template("account.html"), 200

@app.get("/aboutus")
def about_us_page():
    return render_template("aboutus.html"), 200

# flask --app project1.server run
