from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import sqlite3
import base64
from datetime import datetime

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = './uploads'
DATABASE = './social_media.db'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit to 16MB

# Initialize Database
def init_db():
    """Initialize the SQLite database."""
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nickname TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                avatar TEXT
            )
        ''')
        # Posts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fk_user_id INTEGER NOT NULL,
                image TEXT NOT NULL,
                audio TEXT,
                FOREIGN KEY(fk_user_id) REFERENCES users(id)
            )
        ''')
        # Chat IDs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chat_ids (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_1 INTEGER NOT NULL,
                user_2 INTEGER NOT NULL,
                FOREIGN KEY(user_1) REFERENCES users(id),
                FOREIGN KEY(user_2) REFERENCES users(id)
            )
        ''')
        # Messages table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fk_chat INTEGER NOT NULL,
                fk_author INTEGER NOT NULL,
                fk_img TEXT,
                fk_audio TEXT,
                timestamp DATETIME NOT NULL,
                FOREIGN KEY(fk_chat) REFERENCES chat_ids(id),
                FOREIGN KEY(fk_author) REFERENCES users(id)
            )
        ''')
        conn.commit()

# Static File Serving
@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# User Management
@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.json
    nickname = data['nickname']
    password = data['password']
    avatar = data.get('avatar', '/uploads/default_avatar.png')

    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('INSERT INTO users (nickname, password, avatar) VALUES (?, ?, ?)', 
                           (nickname, password, avatar))
            conn.commit()
            return jsonify({"id": cursor.lastrowid, "nickname": nickname, "avatar": avatar}), 201
        except sqlite3.IntegrityError:
            return jsonify({"error": "Nickname already exists"}), 400

@app.route('/api/users/<id>', methods=['GET'])
def get_user(id):
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, nickname, avatar FROM users WHERE id = ?', (id,))
        user = cursor.fetchone()

    if user:
        return jsonify({"id": user[0], "nickname": user[1], "avatar": user[2]})
    return jsonify({"error": "User not found"}), 404

# Post Management
@app.route('/api/posts', methods=['GET'])
def get_posts():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT posts.id, posts.image, posts.audio, users.nickname, users.avatar 
            FROM posts 
            JOIN users ON posts.fk_user_id = users.id
        ''')
        posts = cursor.fetchall()

    return jsonify([
        {
            "id": post[0],
            "image": post[1],
            "audio": post[2],
            "user": {"nickname": post[3], "avatar": post[4]}
        }
        for post in posts
    ])

@app.route('/api/upload', methods=['POST'])
def upload_post():
    data = request.json
    fk_user_id = data['fk_user_id']
    image = data['image']  # Base64 encoded image
    audio = data.get('audio')  # Optional Base64 encoded audio

    # Decode and save the image
    img_path = save_file(image, fk_user_id, 'image')

    # Decode and save the audio (if provided)
    audio_path = save_file(audio, fk_user_id, 'audio') if audio else None

    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO posts (fk_user_id, image, audio) VALUES (?, ?, ?)',
            (fk_user_id, img_path, audio_path)
        )
        conn.commit()

        return jsonify({
            "id": cursor.lastrowid,
            "fk_user_id": fk_user_id,
            "image": img_path,
            "audio": audio_path
        }), 201

# Chat and Messaging
@app.route('/api/chats', methods=['POST'])
def create_chat():
    data = request.json
    user_1 = data['user_1']
    user_2 = data['user_2']

    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO chat_ids (user_1, user_2) VALUES (?, ?)', (user_1, user_2))
        conn.commit()

        return jsonify({"id": cursor.lastrowid, "user_1": user_1, "user_2": user_2}), 201

@app.route('/api/chats', methods=['GET'])
def get_chats():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM chat_ids')
        chats = cursor.fetchall()
        return jsonify(chats)

@app.errorhandler(404)
def not_found(error):
    print(error)
    return jsonify({"error": "Not Found"}), 404

@app.errorhandler(500)
def server_error(error):
    print(error)
    return jsonify({"error": "Internal Server Error"}), 500

@app.route('/api/messages', methods=['POST'])
def send_message():
    data = request.json
    fk_chat = data['fk_chat']
    fk_author = data['fk_author']
    timestamp = datetime.utcnow()
    fk_img = save_file(data.get('image'), fk_author, 'message_image') if data.get('image') else None
    fk_audio = save_file(data.get('audio'), fk_author, 'message_audio') if data.get('audio') else None

    if not fk_img and not fk_audio:
        return jsonify({"error": "Message must include either an image or audio"}), 400

    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO messages (fk_chat, fk_author, fk_img, fk_audio, timestamp) VALUES (?, ?, ?, ?, ?)',
            (fk_chat, fk_author, fk_img, fk_audio, timestamp)
        )
        conn.commit()

        return jsonify({
            "id": cursor.lastrowid,
            "fk_chat": fk_chat,
            "fk_author": fk_author,
            "fk_img": fk_img,
            "fk_audio": fk_audio,
            "timestamp": timestamp.isoformat()
        }), 201

@app.route('/api/messages/<chat_id>', methods=['GET'])
def get_messages(chat_id):
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, fk_author, fk_img, fk_audio, timestamp
            FROM messages
            WHERE fk_chat = ?
        ''', (chat_id,))
        messages = cursor.fetchall()

    return jsonify([
        {
            "id": message[0],
            "fk_author": message[1],
            "fk_img": message[2],
            "fk_audio": message[3],
            "timestamp": message[4]
        }
        for message in messages
    ])

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    avatar = data.get('avatar')  # Base64-encoded avatar

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    hashed_password = password  # Hash the password for security
    avatar_path = save_file(avatar, username, 'avatar') if avatar else '/uploads/default_avatar.png'

    try:
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO users (nickname, password, avatar) VALUES (?, ?, ?)',
                (username, hashed_password, avatar_path),
            )
            conn.commit()
        return jsonify({'message': 'User registered successfully', 'avatar': avatar_path}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 400

# Helper Functions
def save_file(base64_data, user_id, file_type):
    if not base64_data:
        return None

    try:
        # Decode Base64 file
        metadata, encoded_data = base64_data.split(',', 1)
        mime_type = metadata.split(';')[0].split(':')[1]
        file_extension = mime_type.split('/')[1]

        # Save file
        user_folder = os.path.join(app.config['UPLOAD_FOLDER'], str(user_id))
        os.makedirs(user_folder, exist_ok=True)

        filename = secure_filename(f"{file_type}_{datetime.utcnow().timestamp()}.{file_extension}")
        file_path = os.path.join(user_folder, filename)
        with open(file_path, 'wb') as f:
            f.write(base64.b64decode(encoded_data))

        return f"/uploads/{user_id}/{filename}"
    except Exception as e:
        print(f"Error saving file: {e}")
        return None

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, password, avatar FROM users WHERE nickname = ?', (username,))
        user = cursor.fetchone()

    if user and user[1] == password:
        return jsonify({
            'id': user[0],
            'username': username,
            'avatar': user[2]
        }), 200
    return jsonify({'error': 'Invalid username or password'}), 401

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000)
