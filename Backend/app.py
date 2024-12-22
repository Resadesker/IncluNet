from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Simulated data
posts = [
    {
        "id": 1,
        "user_id": "123",
        "avatar": "/uploads/123/avatar.jpeg",
        "image": "/uploads/123/post1.jpg",
        "audio": None,
    },
    {
        "id": 2,
        "user_id": "456",
        "avatar": "/uploads/456/avatar.jpg",
        "image": "/uploads/456/post2.jpeg",
        "audio": "uploads/456/noise.wav",
    },
]

@app.route("/api/posts", methods=["GET"])
def get_posts():
    return jsonify(posts)

@app.route("/uploads/<user_id>/<filename>")
def serve_file(user_id, filename):
    return send_from_directory("static/uploads", f"{user_id}/{filename}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)