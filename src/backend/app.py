import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from waitress import serve

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIST_DIR = os.path.join(PROJECT_DIR, 'frontend', 'dist')

app = Flask(__name__, static_folder=DIST_DIR, static_url_path='')
CORS(app)

@app.route('/api/health')
def health():
    return jsonify({"status": "ok"})

@app.route('/')
def index():
    return send_from_directory(DIST_DIR, 'index.html')

if __name__ == '__main__':
    if os.environ.get('FLASK_ENV') == 'production':
        serve(app, host='0.0.0.0', port=5000)
    else:
        app.run(host='0.0.0.0', port=5000, debug=True)