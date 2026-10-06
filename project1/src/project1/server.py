from flask import Flask, render_template, request, jsonify, redirect, url_for
import psycopg
from markupsafe import escape
import os
from pathlib import Path
from werkzeug.utils import secure_filename

app = Flask(__name__)
UPLOAD_FOLDER = Path(__file__).resolve().parents[2] / 'uploads'     # Help from AI to get correct file path
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

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

@app.post("/create")
def create():    
    title = escape(request.form.get('title', '').strip())
    description = escape(request.form.get('description', '').strip())
    anon = request.form.get('anonOption', '')
    lat = request.form.get('lat')
    long = request.form.get('long')
    
    if title == '' or description == '' or anon == '':
        return redirect(url_for('home_page'))
    
    anon = (anon == 'yes')
    lat = float(lat)
    long = float(long)
    
    file = request.files.get('image')
    filepath = ''
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
    
    conn = psycopg.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # TODO: check if user has account/signed in - zoe

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
                   (anon, location, title, description)
                   VALUES
                   (%s, %s, %s, %s);''', 
                   (anon, location_id, title, description))
    
    if file and allowed_file(file.filename):
        cursor.execute('''
                       INSERT INTO links
                       (post, link)
                       VALUES
                       (%s, %s);''',
                       (1, filepath))
    conn.commit()
    cursor.close()
    conn.close()
    
    return redirect(url_for('home_page'))
    
# Function directly from Flask official documentation
def allowed_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    
@app.get('/api/getAll')
def getAllPosts():
    conn = psycopg.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    cursor.execute('''
                   SELECT post_id, lat, long
                   FROM posts
                   INNER JOIN locations ON posts.location=locations.location_id;
                   ''')

    rows = cursor.fetchall()
    conn.commit()
    cursor.close()
    conn.close()    
    
    body = []
    for row in rows:
        body.append({
            'post_id': row[0],
            'lat': row[1],
            'long': row[2]
        })
    
    return jsonify(body), 200
    
# flask --app project1.server run
# uv run gunicorn project1.server app run (render only)
# psql -U username -d database -f postgres.sql
# psql -U postgres -d postgres -f postgres.sql (example)
