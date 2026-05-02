import os
import json
import time
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from waitress import serve

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIST_DIR = os.path.join(PROJECT_DIR, 'frontend', 'dist')

CONFIG_DIR = 'D:/Magic'
CONFIG_FILE = os.path.join(CONFIG_DIR, 'settings.json')

app = Flask(__name__, static_folder=DIST_DIR, static_url_path='')
CORS(app)

def ensure_config_dir():
    if not os.path.exists(CONFIG_DIR):
        os.makedirs(CONFIG_DIR)

@app.route('/api/health')
def health():
    return jsonify({"status": "ok"})

@app.route('/api/settings', methods=['GET'])
def get_settings():
    ensure_config_dir()
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    return jsonify({})

@app.route('/api/settings', methods=['POST'])
def save_settings():
    ensure_config_dir()
    data = request.get_json()
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return jsonify({"status": "ok"})

@app.route('/api/status')
def get_status():
    PRESET_KEY = '16b30977f48271dd262787f499bd7fe6'
    EXPIRY_DAYS = 31
    
    data = {}
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    
    user_key = data.get('mapKey', '')
    first_used = data.get('firstUsedTime')
    is_activated = bool(user_key)
    
    remaining_days = EXPIRY_DAYS
    is_expired = False
    
    if first_used:
        days = (time.time() * 1000 - first_used) / (1000 * 60 * 60 * 24)
        remaining_days = max(0, EXPIRY_DAYS - int(days))
        is_expired = days > EXPIRY_DAYS
    
    return jsonify({
        "isActivated": is_activated,
        "isExpired": is_expired,
        "remainingDays": remaining_days,
        "hasUsedBefore": os.path.exists(CONFIG_FILE) and first_used is not None
    })

@app.route('/')
def index():
    return send_from_directory(DIST_DIR, 'index.html')

if __name__ == '__main__':
    if os.environ.get('FLASK_ENV') == 'production':
        serve(app, host='0.0.0.0', port=5000)
    else:
        app.run(host='0.0.0.0', port=5000, debug=True)