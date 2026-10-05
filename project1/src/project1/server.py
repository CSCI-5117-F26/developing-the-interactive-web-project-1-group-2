from flask import Flask, render_template, request, jsonify, make_response
import psycopg
from markupsafe import escape
import os

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

@app.post("/api/create")
def create():
    data = request.get_json()
    
    title = escape(data['title'].strip())
    description = escape(data['description'].strip())
    
    if title == '' or description == '' or data['anon'] == None:
        return make_response(data, 400)
    
    # image = escape(data['image'].strip())   # TODO: uploading files - zoe
    location = data['location']
    
    anon = False
    if data['anon'] == 'yes':
        anon = True
    
    conn = psycopg.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # TODO: check if user has account/signed in - zoe
    cursor.execute('''
                   INSERT INTO locations
                   (lat, long)
                   VALUES
                   (%s, %s);''',
                   (location['lat'], location['lng']))
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
    cursor.execute('''
                   SELECT post_id FROM posts
                   ORDER BY post_id DESC
                   LIMIT 1;''')
    post_id = cursor.fetchone()[0]
    
    # if not image == '':
    #     cursor.execute('''
    #                    INSERT INTO links
    #                    (post, link)
    #                    VALUES
    #                    (%s, %s);''',
    #                    (1, image))
    conn.commit()
    cursor.close()
    conn.close()

    res = jsonify({
        'title': title,
        'description': description,
        # 'image': image,     # TODO: may need to modify, work on file uploads in flask - zoe
        'anon': anon,
        'location': location,
        'id': post_id
    })
    return res, 201
    
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
