from flask import Flask, render_template
import psycopg2
# from markupsafe import escape

app = Flask(__name__)

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
# psql -U username -d database -f postgres.sql
# psql -U postgres -d postgres -f postgres.sql (example)
