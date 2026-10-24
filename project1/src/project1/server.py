from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    redirect,
    url_for,
    session,
    Response,
    abort
)
import psycopg
from psycopg.rows import dict_row
import os
from pathlib import Path
from werkzeug.utils import secure_filename
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
from datetime import datetime, timedelta


app = Flask(__name__)
ALLOWED_EXTENSIONS = {"image/png", "image/jpg", "image/jpeg", "image/gif"}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024

load_dotenv()

DEV_LOGIN = os.environ.get("DEV_LOGIN") == "1"  # set to 1 when using dev login

oauth = OAuth(app)
app.secret_key = os.environ["AUTH0_SECRET"] or (
    "dev-only-secret" if DEV_LOGIN else os.environ["AUTH0_SECRET"]
)

if os.environ.get("AUTH0_DOMAIN"):
    oauth.register(
        "auth0",
        client_id=os.environ["AUTH0_CLIENT_ID"],
        client_secret=os.environ["AUTH0_CLIENT_SECRET"],
        client_kwargs={
            "scope": "openid profile email",
        },
        server_metadata_url=f"https://{os.environ['AUTH0_DOMAIN']}/.well-known/openid-configuration",
    )
elif not DEV_LOGIN:
    raise RuntimeError(
        "Set the AUTH0_* variables, or set DEV_LOGIN=1 to use /dev-login"
    )


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
    return render_template("map.html", logged_in=get_account_id() is not None), 200


@app.get("/map")
def map_page():
    if len(request.args) != 0 and request.args.get("search") != None:
        titleQuery = request.args.get("search").strip()
        descriptionQuery = f"%{titleQuery}%"
        if titleQuery != None:
            with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                                SELECT post_id FROM posts
                                WHERE title ILIKE %s or
                                description ILIKE %s;
                                """,
                        (titleQuery, descriptionQuery),
                    )
                    post_ids = [row[0] for row in cursor.fetchall()]
            if len(post_ids) == 0:
                return render_template(
                    "map.html", logged_in=get_account_id() is not None, postIds=[-1]
                ), 200
            return render_template(
                "map.html", logged_in=get_account_id() is not None, postIds=post_ids
            ), 200
        return render_template(
            "map.html", logged_in=get_account_id() is not None, postIds=[]
        ), 400
    return render_template(
        "map.html", logged_in=get_account_id() is not None, postIds=[]
    ), 200


@app.get("/blog")
def blog_page():
    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            filterFlag = False
            
            if len(request.args) == 0 or (
                request.args.get("search").strip() == ""
                and request.args.get("date-range") == "any"
                and request.args.get("location").strip() == ""
                and request.args.get("user").strip() == ""
            ):
                cur.execute("""
                    SELECT 
                        posts.post_id, 
                        posts.title, 
                        posts.description,
                        ST_Y(locations.coord), 
                        ST_X(locations.coord),
                        posts.time,
                        accounts.username AS account,
                        posts.account AS owner_id
                    FROM posts
                    LEFT JOIN locations ON posts.location = locations.location_id
                    LEFT JOIN accounts ON posts.account = accounts.account_id
                """)
            else:
                filterFlag = True
                conditions = []
                values = []

                searchInput = request.args.get("search")
                searchInput = searchInput.strip()

                locationInput = request.args.get("location")
                locationInput = locationInput.strip()

                userInput = request.args.get("user")
                userInput = userInput.strip()

                if not searchInput == "":
                    querySearch = "posts.title ILIKE %s or posts.description ILIKE %s"
                    conditions.append(querySearch)
                    values.extend([searchInput, f"%{searchInput}%"])

                if not locationInput == "":
                    queryLocation = "LOWER(locations.location) = LOWER(%s)"
                    conditions.append(queryLocation)
                    values.append(locationInput)

                # if not request.args.get('radius') == '':
                #     radiusFloat = float(request.args.get('radius'))
                #     queryRadius = 'ST_DWithin(locations.coord::geography, %s::geography)'
                #     conditions.append(queryRadius)
                #     values.append(radiusFloat)

                if not userInput == "":
                    queryUser = "LOWER(accounts.username) = LOWER(%s)"
                    conditions.append(queryUser)
                    values.append(userInput)

                if not request.args.get("date-range") == "any":
                    range = request.args.get("date-range")
                    now = datetime.now()

                    if range == "today":
                        cutoff = now - timedelta(days=1)
                    elif range == "week":
                        cutoff = now - timedelta(weeks=1)
                    else:
                        cutoff = now - timedelta(weeks=4)

                    queryDateRange = "posts.time > %s"
                    conditions.append(queryDateRange)
                    values.append(cutoff)

                where = "WHERE " + " AND ".join(conditions)

                cur.execute(
                    f"""
                            SELECT posts.post_id, posts.title, posts.description, posts.time,
                                ST_Y(locations.coord), ST_X(locations.coord),
                                posts.account AS owner_id,
                                accounts.username AS account
                            FROM posts
                            LEFT JOIN locations ON posts.location = locations.location_id
                            LEFT JOIN accounts ON posts.account = accounts.account_id
                            {where};""",
                    values,
                )
            posts = cur.fetchall()
    return render_template("blog.html", posts=posts, account_id=get_account_id(), filter=filterFlag), 200


@app.get("/account")
def account_page():
    return render_template("account.html"), 200


@app.route("/login")
def login():
    return oauth.auth0.authorize_redirect(
        redirect_uri=url_for("callback", _external=True), prompt="login"
    )


# Both go to the same link, do not need two
# @app.route('/signup')
# def signup():
#     return oauth.auth0.authorize_redirect(
#         redirect_uri=url_for('callback', _external=True),
#         screen_hint='signup',
#         prompt='login'
#     )


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/map")


@app.route("/callback", methods=["GET", "POST"])
def callback():
    token = oauth.auth0.authorize_access_token()
    session["user_token"] = token
    user_info = token.get("userinfo")
    conn = psycopg.connect(os.environ["DATABASE_URL"])
    cursor = conn.cursor()
    cursor.execute(
        """
                INSERT INTO accounts
                (auth0_sub, username)
                VALUES
                (%s, %s)
                ON CONFLICT (auth0_sub)
                DO UPDATE SET username = %s;
                """,
        (user_info["sub"], user_info["nickname"], user_info["nickname"]),
    )
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
        cursor.execute(
            """
                       INSERT INTO accounts (auth0_sub, username)
                       VALUES (%s, %s)
                       ON CONFLICT (auth0_sub)
                       DO UPDATE SET username = %s;
                       """,
            (sub, nickname, nickname),
        )
        conn.commit()
        cursor.close()
        conn.close()
        return redirect("/")


@app.get("/post/<int:post_id>")
def show_post(post_id):
    # show the post with the given id, the id is an integer
    account_id = get_account_id()
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
            SELECT anon, accounts.username, locations.location, ST_X(locations.coord), 
            ST_Y(locations.coord), title, posts.time, description, links.link, posts.account
            FROM POSTS
            LEFT JOIN accounts
                ON posts.account = accounts.account_id
            LEFT JOIN locations
                ON posts.location = locations.location_id
            LEFT JOIN links
                ON posts.post_id = links.post
            WHERE post_id = %s;""",
                (post_id,),
            )
            post_row = (
                cursor.fetchone()
            )  # one row post of the individual post, tuple type (a, b, ...)

            if post_row is None:
                return abort(404)

            cursor.execute(
                """
            SELECT author, time, comment FROM comments
            WHERE post = %s;
            """,
                (post_id,),
            )
            comment_rows = cursor.fetchall()

        comments = []  # the list of dict comments for the post based on its id
        for comment in comment_rows:
            comments.append(
                {"author": comment[0], "time": comment[1], "comment": comment[2]}
            )

        img = None
        if post_row[8] != None:
            img = url_for("post_image", post_id=post_id)

        location = f"{post_row[4]}, {post_row[3]}"
        if post_row[2] is not None:
            location = post_row[2]

    post = {
        "post_id": post_id,
        "anon": post_row[0],
        "account": post_row[1],
        "username": post_row[1],
        "location": location,
        "title": post_row[5],
        "time": post_row[6],
        "description": post_row[7],
        "image": img,
        "can_edit": account_id is not None and account_id == post_row[9],
        "comments": comments,
    }
    if request.args.get("format") == "json":
        return jsonify(post), 200
    return render_template("post.html", post=post), 200


@app.post("/post/<int:post_id>")
def post_comment(post_id):
    id = post_id
    comment = request.form.get("comment").strip()
    if comment == "":
        return redirect(url_for("show_post", post_id=id))

    account_id = get_account_id()
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
            SELECT post_id FROM posts
            WHERE post_id = %s;
            """,
                (post_id,),
            )
            if cursor.fetchone() is None:
                return abort(404)
            
            if account_id is not None:
                cursor.execute(
                    """
                    SELECT username FROM accounts
                    WHERE account_id = %s""",
                    (account_id,),
                )
            account_row = cursor.fetchone()

            author = "Anonymous"
            if account_row:
                author = account_row[0]

            cursor.execute(
                """
                            INSERT INTO comments (post, author, comment)
                            VALUES (%s, %s, %s);
                            """,
                (post_id, author, comment),
            )
    return redirect(url_for("show_post", post_id=id))


@app.get("/post/<int:post_id>/image")
def post_image(post_id):
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                           SELECT image_file, mime_type
                           FROM links
                           WHERE post=%s;""",
                (post_id,),
            )
            row = cursor.fetchone()
            img, type = row
    return Response(bytes(img), mimetype=type)


@app.post("/create")
def create():
    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    anon = request.form.get("anonOption", "")
    lat = request.form.get("lat")
    long = request.form.get("long")
    locationName = request.form.get("locationName")

    if title == "" or description == "" or anon == "":
        return redirect(url_for("home_page"))

    anon = anon == "yes"
    lat = float(lat)
    long = float(long)

    file = request.files.get("image")
    image_binary = None
    mime_type = None
    if file and allowed_file(file):
        filename = secure_filename(file.filename)
        image_binary = file.read()
        mime_type = file.mimetype

    custom_icon_file = request.files.get("customIcon")
    icon_binary = None
    icon_mime_type = None
    if custom_icon_file and allowed_file(custom_icon_file):
        icon_binary = custom_icon_file.read()
        icon_mime_type = custom_icon_file.mimetype

    conn = psycopg.connect(os.environ["DATABASE_URL"])
    cursor = conn.cursor()

    account_id = None
    # If user is signed in, get their associated account_id
    if "user_token" in session:
        sub = session["user_token"].get("userinfo")["sub"]
        if sub:
            cursor.execute(
                """
                            SELECT account_id FROM accounts
                            WHERE auth0_sub = %s;
                            """,
                (sub,),
            )
            row = cursor.fetchone()
            if row:
                account_id = row[0]
    icon_id = None
    if custom_icon_file and icon_binary and icon_mime_type:
        cursor.execute(
            """
                        INSERT INTO icons
                        (icon_file, mime_type)
                        VALUES (%s, %s)
                        RETURNING icon_id;
                        """,
            (icon_binary, icon_mime_type),
        )
        icon_id = cursor.fetchone()[0]
    if locationName == "":
        cursor.execute(
            """
                       INSERT INTO locations (geoType, coord)
                       VALUES
                       (%s, ST_MakePoint(%s, %s));""",
            ("Point", long, lat),
        )
    else:
        cursor.execute(
            """
                       INSERT INTO locations (location, geoType, coord)
                       VALUES
                       (%s, %s, ST_MakePoint(%s, %s));""",
            (locationName, "point", long, lat),
        )
    cursor.execute("""
                   SELECT location_id FROM locations
                   ORDER BY location_id DESC
                   LIMIT 1;""")
    location_id = cursor.fetchone()[0]

    cursor.execute(
        """
                   INSERT INTO posts
                   (icon_id, anon, account, location, title, description)
                   VALUES
                   (%s, %s, %s, %s, %s, %s);""",
        (icon_id, anon, account_id, location_id, title, description),
    )

    cursor.execute("""
                   SELECT post_id FROM posts
                   ORDER BY post_id DESC
                   LIMIT 1;""")
    id = cursor.fetchone()[0]

    if file and image_binary and mime_type:
        cursor.execute(
            """
                       INSERT INTO links
                       (post, link, image_file, mime_type)
                       VALUES
                       (%s, %s, %s, %s);""",
            (id, filename, image_binary, mime_type),
        )

    conn.commit()
    cursor.close()
    conn.close()

    return redirect(url_for("home_page"))


@app.get("/icon/<int:icon_id>")
def get_icon(icon_id):
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                           SELECT icon_file, mime_type
                           FROM icons
                           WHERE icon_id=%s;
                           """,
                (icon_id,),
            )
            row = cursor.fetchone()
            if row is None:
                return abort(404)
            img, type = row
    return Response(bytes(img), mimetype=type)


# Function from Flask official documentation, slight modifications
def allowed_file(file):
    if file.mimetype not in ALLOWED_EXTENSIONS:
        return False
    if (
        request.content_length is not None
        and request.content_length > MAX_CONTENT_LENGTH
    ):
        return False

    return True


@app.get("/api/getAll")
def getAllPosts():
    conn = psycopg.connect(os.environ["DATABASE_URL"])
    cursor = conn.cursor()
    cursor.execute("""
                   SELECT post_id, ST_Y(locations.coord), ST_X(locations.coord), posts.icon_id
                   FROM posts
                   INNER JOIN locations ON posts.location = locations.location_id
                   """)

    rows = cursor.fetchall()
    conn.commit()
    cursor.close()
    conn.close()

    body = []
    if len(rows) > 0:
        for row in rows:
            body.append(
                {"post_id": row[0], "lat": row[1], "long": row[2], "icon_id": row[3]}
            )

    return jsonify(body), 200


@app.get("/api/getNearby")
def get_nearby():
    min_lat = request.args.get("minLat", type=float)
    max_lat = request.args.get("maxLat", type=float)
    min_long = request.args.get("minLong", type=float)
    max_long = request.args.get("maxLong", type=float)
    conn = psycopg.connect(os.environ["DATABASE_URL"])
    cursor = conn.cursor()

    cursor.execute("""
                    SELECT
                        posts.post_id, 
                        posts.title, 
                        posts.description,
                        ST_Y(locations.coord),
                        ST_X(locations.coord),
                        posts.time,
                        accounts.username AS account,
                        posts.account AS owner_id
                    FROM posts
                    LEFT JOIN locations ON posts.location = locations.location_id
                    LEFT JOIN accounts ON posts.account = accounts.account_id
                    WHERE %s < ST_Y(locations.coord) AND ST_Y(locations.coord) < %s AND %s < ST_X(locations.coord) AND ST_X(locations.coord) < %s
                   """,
        (min_lat, max_lat, min_long, max_long),
    )

    rows = cursor.fetchall()
    conn.commit()
    cursor.close()
    conn.close()

    body = []
    if len(rows) > 0:
        for row in rows:
            body.append(
                {
                    "post_id": row[0],
                    "title": row[1],
                    "description": row[2],
                    "lat": row[3],
                    "long": row[4],
                    "time": row[5],
                    "account": row[6],
                    "owner_id": row[7],
                }
            )

    return jsonify(body), 200


@app.post("/delete/<int:post_id>")
def delete_post(post_id):
    account_id = get_account_id()
    conn = psycopg.connect(os.environ["DATABASE_URL"])
    cursor = conn.cursor()

    cursor.execute(
        "SELECT location FROM posts WHERE post_id = %s AND account = %s",
        (post_id, account_id),
    )

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


@app.get("/edit/<int:post_id>")
def edit_page(post_id):
    account_id = get_account_id()
    conn = psycopg.connect(os.environ["DATABASE_URL"])
    cursor = conn.cursor()

    cursor.execute(
        "SELECT title, description FROM posts WHERE post_id = %s AND account = %s",
        (post_id, account_id),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if row is None:
        return abort(404)

    post = {"post_id": post_id, "title": row[0], "description": row[1]}
    return render_template("edit.html", post=post)


@app.post("/edit/<int:post_id>")
def edit_save(post_id):
    account_id = get_account_id()
    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()

    if title and description:
        conn = psycopg.connect(os.environ["DATABASE_URL"])
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE posts SET title = %s, description = %s WHERE post_id = %s AND account = %s",
            (title, description, post_id, account_id),
        )
        conn.commit()
        cursor.close()
        conn.close()
    return redirect(url_for("blog_page"))


@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404


# flask --app project1.server run
# uv run flask --app project1.server run
# uv run gunicorn project1.server app run (render only)
# psql -U username -d database -f postgres.sql
# psql -U postgres -d postgres -f postgres.sql (example)
