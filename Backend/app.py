from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import sqlite3
import base64

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = './uploads'
DATABASE = './database.db'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit to 16MB

def init_db():
    """Initialize the SQLite database with a table for posts."""
    with sqlite3.connect(DATABASE) as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            avatar TEXT,
            image TEXT,
            audio TEXT
        )''')
        conn.commit()

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/posts', methods=['GET'])
def get_posts():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT posts.id, posts.user_id, posts.image, posts.audio,
                   COALESCE(posts.avatar, '/uploads/default_avatar.png') AS avatar
            FROM posts
        """)
        posts = cursor.fetchall()

    return jsonify([
        {
            "id": row[0],
            "user_id": row[1],
            "image": row[2],
            "audio": row[3],
            "avatar": row[4],
        }
        for row in posts
    ])

def get_post_count():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT NULL
            FROM posts
        """)
        posts = len(cursor.fetchall())
        return posts
    return 0

@app.route('/api/upload', methods=['POST'])
def upload_posts():
    """Upload new posts with base64-encoded files."""
    if request.content_type != 'application/json':
        return jsonify({"error": "Invalid Content-Type. Expected 'application/json'"}), 415

    try:
        data = request.get_json()
        if not data or 'file' not in data:
            return jsonify({"error": "No file uploaded"}), 400

        base64_file = data['file']
        user_id = '123'  # Replace with dynamic user logic if needed

        # Decode base64 string
        if not base64_file.startswith('data:image/'):
            return jsonify({"error": "Invalid file format"}), 400

        # Split metadata and data
        metadata, encoded_data = base64_file.split(',', 1)
        mime_type = metadata.split(';')[0].split(':')[1]  # Extract MIME type
        file_extension = mime_type.split('/')[1]  # Extract file extension

        # Generate filename and save path
        filename = secure_filename(f"{get_post_count()}.{file_extension}")
        user_folder = os.path.join(app.config['UPLOAD_FOLDER'], user_id)

        if not os.path.exists(user_folder):
            os.makedirs(user_folder)

        file_path = os.path.join(user_folder, filename)

        # Save the decoded file
        with open(file_path, 'wb') as f:
            f.write(base64.b64decode(encoded_data))

        # Save the post in the database
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO posts (user_id, avatar, image, audio) VALUES (?, ?, ?, ?)",
                (
                    user_id,
                    f"/uploads/{user_id}/{filename}",
                    f"/uploads/{user_id}/{filename}",
                    None,  # Audio placeholder
                ),
            )
            conn.commit()

            uploaded_post = {
                "id": cursor.lastrowid,
                "user_id": user_id,
                "avatar": f"/uploads/{user_id}/{filename}",
                "image": f"/uploads/{user_id}/{filename}",
                "audio": None,
            }

        return jsonify(uploaded_post), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000)