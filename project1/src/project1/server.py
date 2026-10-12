from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory, session
import psycopg
from psycopg.rows import dict_row
from markupsafe import escape
import os
from pathlib import Path
from werkzeug.utils import secure_filename
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv


app = Flask(__name__)
UPLOAD_FOLDER = Path(__file__).resolve().parents[2] / 'uploads'     # Help from AI to get correct file path
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

load_dotenv()
 
DEV_LOGIN = os.environ.get("DEV_LOGIN") == "1" # set to 1 when using dev login

oauth = OAuth(app)
app.secret_key = os.environ["AUTH0_SECRET"] or ("dev-only-secret" if DEV_LOGIN else os.environ["AUTH0_SECRET"])

if os.environ.get("AUTH0_DOMAIN"):
    oauth.register(
        "auth0",
        client_id=os.environ["AUTH0_CLIENT_ID"],
        client_secret=os.environ["AUTH0_CLIENT_SECRET"],
        client_kwargs={
            "scope": "openid profile email",
        },
        server_metadata_url=f"https://{os.environ["AUTH0_DOMAIN"]}/.well-known/openid-configuration",
    )
elif not DEV_LOGIN:
    raise RuntimeError("Set the AUTH0_* variables, or set DEV_LOGIN=1 to use /dev-login")

def get_account_id():
    if "user_token" not in session:
        return None
    sub = session["user_token"]["userinfo"]["sub"]
    conn = psycopg.connect(os.environ["DATABASE_URL"])
    cursor = conn.cursor()
    cursor.execute("SELECT account_id FROM accounts WHERE auth0_sub = %s", (sub,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        return row[0]
    return None

@app.get("/")
def home_page():
    return render_template("map.html"), 200

@app.get("/map")
def map_page():
    return render_template("map.html"), 200

@app.get("/blog")
def blog_page():
    with psycopg.connect(
        os.environ["DATABASE_URL"], row_factory=dict_row
    ) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    posts.post_id, 
                    posts.title, 
                    posts.description, 
                    locations.lat, 
                    locations.long,
                    posts.time,
                    accounts.username AS account
                FROM posts
                LEFT JOIN locations ON posts.location = locations.location_id
                LEFT JOIN accounts ON posts.account = accounts.account_id
            """)
            posts = cur.fetchall()

    return render_template("blog.html", posts=posts), 200

@app.get("/account")
def account_page():
    return render_template("account.html"), 200

@app.route("/login")
def login():
    return oauth.auth0.authorize_redirect(
        redirect_uri=url_for("callback", _external=True)
    )

@app.route("/signup")
def signup():
    return oauth.auth0.authorize_redirect(
        redirect_uri=url_for("callback", _external=True),
        screen_hint="signup"
    )

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/map")

@app.route("/callback", methods=["GET", "POST"])
def callback():
    token = oauth.auth0.authorize_access_token()
    session["user_token"] = token
    user_info = token.get("userinfo")
    conn = psycopg.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    cursor.execute('''
                INSERT INTO accounts
                (auth0_sub, username)
                VALUES
                (%s, %s)
                ON CONFLICT (auth0_sub)
                DO UPDATE SET username = %s;
                ''',
                (user_info["sub"], user_info["nickname"], user_info["nickname"]))
    conn.commit()
    cursor.close()
    conn.close()
    return redirect("/")


if DEV_LOGIN:
    @app.get("/dev-login")
    def dev_login():
        number = request.args.get("user", "1")
        sub = f"dev|{number}"
        nickname = f"dev{number}"

        session["user_token"] = {"userinfo": {"sub": sub, "nickname": nickname}}

        conn = psycopg.connect(os.environ["DATABASE_URL"])
        cursor = conn.cursor()
        cursor.execute('''
                       INSERT INTO accounts (auth0_sub, username)
                       VALUES (%s, %s)
                       ON CONFLICT (auth0_sub)
                       DO UPDATE SET username = %s;
                       ''', (sub, nickname, nickname))
        conn.commit()
        cursor.close()
        conn.close()
        return redirect("/")

@app.get("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.get('/post/<int:post_id>')
def show_post(post_id):
    # show the post with the given id, the id is an integer
    conn = psycopg.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    account_id = get_account_id()
    cursor.execute('''
        SELECT anon, accounts.username, locations.location, locations.lat, 
        locations.long, title, posts.time, description, links.link, comments.author, 
        comments.time, comments.comment, posts.account
        FROM POSTS
        LEFT JOIN accounts
            ON posts.account = accounts.account_id
        LEFT JOIN locations
            ON posts.location = locations.location_id
        LEFT JOIN links
            ON posts.post_id = links.post
        LEFT JOIN comments
            ON posts.post_id = comments.post
        WHERE post_id = %s;
        ''', (post_id,)
    )

    post_row = cursor.fetchone() # one row post of the individual post, tuple type
    conn.commit()
    cursor.close()
    conn.close()

    if post_row is None:
        return redirect(url_for('PageNotFound'))  # TODO: we need a 404 page?


    img = None
    if post_row[8] != None:
        img = url_for('uploaded_file', filename=post_row[8])

    post = {
        "post_id": post_id,
        "anon": post_row[0],
        "account": post_row[1],
        "username": post_row[1],
        "location": {
            'name': post_row[2],
            'lat': post_row[3],
            'long': post_row[4]
        },
        "title": post_row[5],
        "time": post_row[6],
        "description": post_row[7],
        'image': img,
        'can_edit' : account_id is not None and account_id == post_row[12]
        # "author": "Anonymous" if post_row[0] else post_row[1]
    }
    
    return jsonify(post), 200
    # return render_template("post.html", post=post), 200

@app.post("/create")
def create():
    title = escape(request.form.get("title", "").strip())
    description = escape(request.form.get("description", "").strip())
    anon = request.form.get("anonOption", "")
    lat = request.form.get("lat")
    long = request.form.get("long")

    if title == "" or description == "" or anon == "":
        return redirect(url_for("home_page"))

    anon = anon == "yes"
    lat = float(lat)
    long = float(long)

    file = request.files.get("image")
    filepath = ""
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)

    conn = psycopg.connect(os.environ["DATABASE_URL"])
    cursor = conn.cursor()
    
    account_id = None
    # If user is signed in, get their associated account_id
    if ("user_token" in session):
        sub = session["user_token"].get("userinfo")["sub"]
        if sub:
            cursor.execute('''
                            SELECT account_id FROM accounts
                            WHERE auth0_sub = %s;
                            ''', (sub,))
            row = cursor.fetchone()
            if row:
                account_id = row[0]

    cursor.execute('''
                   INSERT INTO locations
                   (lat, long)
                   VALUES
                   (%s, %s);''',
                   (lat, long))
    cursor.execute('''
                   SELECT location_id FROM locations
                   ORDER BY location_id DESC
                   LIMIT 1;''')
    location_id = cursor.fetchone()[0]
    
    cursor.execute('''
                   INSERT INTO posts
                   (anon, account, location, title, description)
                   VALUES
                   (%s, %s, %s, %s, %s);''', 
                   (anon, account_id, location_id, title, description))

    cursor.execute('''
                   SELECT post_id FROM posts
                   ORDER BY post_id DESC
                   LIMIT 1;''')
    id = cursor.fetchone()[0]

    
    if file and allowed_file(file.filename):
        cursor.execute('''
                       INSERT INTO links
                       (post, link)
                       VALUES
                       (%s, %s);''',
                       (id, filename))
    conn.commit()
    cursor.close()
    conn.close()
    
    return redirect(url_for('home_page'))
    
# Function directly from Flask official documentation
def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


@app.get("/api/getAll")
def getAllPosts():
    conn = psycopg.connect(os.environ["DATABASE_URL"])
    cursor = conn.cursor()
    cursor.execute("""
                   SELECT post_id, lat, long
                   FROM posts
                   INNER JOIN locations ON posts.location=locations.location_id;
                   """)

    rows = cursor.fetchall()
    conn.commit()
    cursor.close()
    conn.close()

    body = []
    if len(rows) > 0:
        for row in rows:
            body.append({
                'post_id': row[0],
                'lat': row[1],
                'long': row[2]
            })
    
    return jsonify(body), 200


@app.post("/delete/<int:post_id>")
def delete_post(post_id):
    account_id = get_account_id()
    conn = psycopg.connect(os.environ["DATABASE_URL"])
    cursor = conn.cursor()

    cursor.execute("SELECT location FROM posts WHERE post_id = %s AND account = %s",
                   (post_id, account_id))
    
    row = cursor.fetchone()

    if row:
        cursor.execute("DELETE FROM links WHERE post = %s", (post_id,))
        cursor.execute("DELETE FROM comments WHERE post = %s", (post_id,))
        cursor.execute("DELETE FROM posts WHERE post_id = %s", (post_id,))
        cursor.execute("DELETE FROM locations WHERE location_id = %s", (row[0],))

    conn.commit()
    cursor.close()
    conn.close()
    return redirect(request.referrer or url_for("blog_page"))


@app.route('/404')
def PageNotFound():
    return render_template('404.html'), 404
    
# flask --app project1.server run
# uv run gunicorn project1.server app run (render only)
# psql -U username -d database -f postgres.sql
# psql -U postgres -d postgres -f postgres.sql (example)