from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from werkzeug.utils import secure_filename
import os
import sqlite3
import base64
from datetime import datetime

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

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
    print(filename)
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
    image = data['image']
    audio = data.get('audio')
    img_path = save_file(image, fk_user_id, 'image')
    audio_path = save_file(audio, fk_user_id, 'audio') if audio else None
    
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO posts (fk_user_id, image, audio) VALUES (?, ?, ?)',
            (fk_user_id, img_path, audio_path)
        )
        new_post_id = cursor.lastrowid
        conn.commit()

        # Fetch the joined post + user info
        cursor.execute('''
            SELECT posts.id, posts.image, posts.audio, users.nickname, users.avatar
            FROM posts
            JOIN users ON posts.fk_user_id = users.id
            WHERE posts.id = ?
        ''', (new_post_id,))
        row = cursor.fetchone()

    return jsonify({
        "id": row[0],
        "image": row[1],
        "audio": row[2],
        "user": {
            "nickname": row[3],
            "avatar": row[4]
        }
    }), 201

@app.route('/api/profile/<username>', methods=['GET'])
def get_profile(username):
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, nickname, avatar FROM users WHERE nickname = ?', (username,))
        user = cursor.fetchone()
        if user:
            cursor.execute('SELECT id, image FROM posts WHERE fk_user_id = ?', (user[0],))
            posts = cursor.fetchall()
            posts_data = [{"id": post[0], "image": post[1]} for post in posts]
            return jsonify({
                "id": user[0],
                "username": user[1],
                "avatar": user[2],
                "posts": posts_data
            })
        return jsonify({"error": "User not found"}), 404

@app.route('/api/profile/<username>/avatar', methods=['POST'])
def update_avatar(username):
    data = request.files['file']
    if not data:
        return jsonify({"error": "No file provided"}), 400

    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM users WHERE nickname = ?', (username,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404

        user_id = user[0]
        avatar_path = save_file(data.read(), user_id, 'avatar')
        if not avatar_path:
            return jsonify({"error": "Failed to save avatar"}), 500

        cursor.execute('UPDATE users SET avatar = ? WHERE id = ?', (avatar_path, user_id))
        conn.commit()

    return jsonify({"avatar": avatar_path}), 200

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

# WebSocket: Join a chat room
@socketio.on("join")
def handle_join(data):
    chat_id = data["chat_id"]
    join_room(chat_id)
    print(f"User joined chat {chat_id}")

# WebSocket: Send Message (Real-time)
@socketio.on("send_message")
def handle_send_message(data):
    print(f"Received message data... ", data.get("image"))
    print(data)
    fk_chat = data["fk_chat"]
    fk_author = data["fk_author"]
    from datetime import datetime, timezone
    timestamp = datetime.now(timezone.utc).isoformat()

    fk_img = save_file(data.get("image"), fk_author, "message_image") if data.get("image") else None
    fk_audio = save_file(data.get("audio"), fk_author, "message_audio") if data.get("audio") else None

    if not fk_img and not fk_audio:
        print("No valid file data received.")
        return

    import sqlite3
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO messages (fk_chat, fk_author, fk_img, fk_audio, timestamp) VALUES (?, ?, ?, ?, ?)",
            (fk_chat, fk_author, fk_img, fk_audio, timestamp)
        )
        conn.commit()
        message_id = cursor.lastrowid

    message_data = {
        "id": message_id,
        "fk_chat": fk_chat,
        "fk_author": fk_author,
        "fk_img": fk_img,
        "fk_audio": fk_audio,
        "timestamp": timestamp,
    }
    emit("new_message", message_data, room=fk_chat)


# API Endpoint: Fetch Chat History
@app.route('/api/messages/<chat_id>', methods=['GET'])
def get_messages(chat_id):
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, fk_author, fk_img, fk_audio, timestamp FROM messages WHERE fk_chat = ?", (chat_id,))
        messages = cursor.fetchall()

    return jsonify([
        {"id": msg[0], "fk_author": msg[1], "fk_img": msg[2], "fk_audio": msg[3], "timestamp": msg[4]}
        for msg in messages
    ])

# @app.route('/api/messages', methods=['POST'])
# def send_message():
#     data = request.json
#     fk_chat = data['fk_chat']
#     fk_author = data['fk_author']
#     timestamp = datetime.utcnow()
#     fk_img = save_file(data.get('image'), fk_author, 'message_image') if data.get('image') else None
#     fk_audio = save_file(data.get('audio'), fk_author, 'message_audio') if data.get('audio') else None

#     if not fk_img and not fk_audio:
#         return jsonify({"error": "Message must include either an image or audio"}), 400

#     with sqlite3.connect(DATABASE) as conn:
#         cursor = conn.cursor()
#         cursor.execute(
#             'INSERT INTO messages (fk_chat, fk_author, fk_img, fk_audio, timestamp) VALUES (?, ?, ?, ?, ?)',
#             (fk_chat, fk_author, fk_img, fk_audio, timestamp)
#         )
#         conn.commit()

#         return jsonify({
#             "id": cursor.lastrowid,
#             "fk_chat": fk_chat,
#             "fk_author": fk_author,
#             "fk_img": fk_img,
#             "fk_audio": fk_audio,
#             "timestamp": timestamp.isoformat()
#         }), 201

# @app.route('/api/messages/<chat_id>', methods=['GET'])
# def get_messages(chat_id):
#     with sqlite3.connect(DATABASE) as conn:
#         cursor = conn.cursor()
#         cursor.execute('''
#             SELECT id, fk_author, fk_img, fk_audio, timestamp
#             FROM messages
#             WHERE fk_chat = ?
#         ''', (chat_id,))
#         messages = cursor.fetchall()

#     return jsonify([
#         {
#             "id": message[0],
#             "fk_author": message[1],
#             "fk_img": message[2],
#             "fk_audio": message[3],
#             "timestamp": message[4]
#         }
#         for message in messages
#     ])

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    nickname = data['username']
    password = data['password']
    base64_avatar = data.get('avatar')

    if not base64_avatar:
        return jsonify({"error": "Avatar is required"}), 400

    avatar_path = save_file(base64_avatar, nickname, 'avatar')

    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO users (nickname, password, avatar) VALUES (?, ?, ?)',
            (nickname, password, avatar_path)
        )
        conn.commit()

    return jsonify({
        "id": cursor.lastrowid,
        "nickname": nickname,
        "avatar": avatar_path
    }), 201

# Helper Functions
def save_file(base64_data, user_id, file_type):
    print(f"Saving file for user {user_id} of type {file_type}")
    if not base64_data:
        return None
    try:
        if ',' in base64_data:
            metadata, encoded_data = base64_data.split(',', 1)
            mime_type = metadata.split(';')[0].split(':')[1]
            file_extension = mime_type.split('/')[1]
        else:
            # Assume raw base64 without metadata; use default extensions
            encoded_data = base64_data
            if file_type.startswith("message_image"):
                file_extension = "png"
            elif file_type.startswith("message_audio"):
                file_extension = "m4a"
            elif file_type == "avatar":
                file_extension = "png"
            else:
                file_extension = "dat"

        # Ensure user upload directory exists
        user_folder = os.path.join(app.config['UPLOAD_FOLDER'], str(user_id))
        os.makedirs(user_folder, exist_ok=True)

        from werkzeug.utils import secure_filename
        from datetime import datetime, timezone
        filename = secure_filename(f"{file_type}_{datetime.now(timezone.utc).timestamp()}.{file_extension}")
        file_path = os.path.join(user_folder, filename)

        import base64
        with open(file_path, 'wb') as f:
            f.write(base64.b64decode(encoded_data))

        # Return URL path for accessing the file
        return f"/uploads/{user_id}/{filename}"
    except Exception as e:
        print(f"Error saving file: {e}")
        return None

# def save_file(base64_data, user_id, file_type):
#     if not base64_data:
#         return None

#     try:
#         # Decode Base64 file
#         metadata, encoded_data = base64_data.split(',', 1)
#         mime_type = metadata.split(';')[0].split(':')[1]
#         file_extension = mime_type.split('/')[1]

#         # Save file
#         user_folder = os.path.join(app.config['UPLOAD_FOLDER'], str(user_id))
#         os.makedirs(user_folder, exist_ok=True)

#         filename = secure_filename(f"{file_type}_{datetime.utcnow().timestamp()}.{file_extension}")
#         file_path = os.path.join(user_folder, filename)
#         with open(file_path, 'wb') as f:
#             f.write(base64.b64decode(encoded_data))

#         return f"/uploads/{user_id}/{filename}"
#     except Exception as e:
#         print(f"Error saving file: {e}")
#         return None

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
    # app.run(host='0.0.0.0', port=5000)
    socketio.run(app, host='0.0.0.0', port=8085)