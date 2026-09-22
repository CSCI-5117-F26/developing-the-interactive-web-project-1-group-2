from flask import Flask, render_template
# import psycopg2
# from markupsafe import escape

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("home.html"), 200


# flask --app project1.server run
