import os
import sys
import json
import re
import time
import glob
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from waitress import serve

if getattr(sys, 'frozen', False):
    DIST_DIR = os.path.join(sys._MEIPASS, 'frontend', 'dist')
else:
    PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DIST_DIR = os.path.join(PROJECT_DIR, 'frontend', 'dist')

CONFIG_DIR = 'D:/Magic'
CONFIG_FILE = os.path.join(CONFIG_DIR, 'settings.json')

app = Flask(__name__, static_folder=DIST_DIR, static_url_path='')
CORS(app)

def ensure_config_dir():
    if not os.path.exists(CONFIG_DIR):
        os.makedirs(CONFIG_DIR)

REQUIRED_FIELDS = ['lng', 'lat', 'alt', 'head', 'speed', 'cooSys', 'time', 'tagName']

def parse_field_mapping(field_str):
    """解析字段对齐说明，返回(required_fields, extra_fields)"""
    if '@' in field_str:
        req_part, extra_part = field_str.split('@', 1)
        required = [f.strip() for f in req_part.split(',') if f.strip()]
        extra = [f.strip() for f in extra_part.split(',') if f.strip()]
    else:
        required = [f.strip() for f in field_str.split(',') if f.strip()]
        extra = []
    return required, extra

def scan_log_files(directory):
    """扫描目录中的*.log和*.zst文件"""
    files = []
    for pattern in ['**/*.log', '**/*.zst']:
        files.extend(glob.glob(os.path.join(directory, pattern), recursive=True))
    return sorted(files)

def read_file_lines(file_path, max_lines=None):
    """读取文件内容，支持.zst解压"""
    lines = []
    try:
        if file_path.endswith('.zst'):
            import zstandard
            with open(file_path, 'rb') as f:
                dctx = zstandard.ZstdDecompressor()
                data = dctx.decompress(f.read())
                text = data.decode('utf-8', errors='ignore')
                lines = text.splitlines()
        else:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                lines = [l.rstrip('\n') for l in lines]
        
        if max_lines:
            lines = lines[:max_lines]
    except Exception as e:
        print(f"读取文件失败 {file_path}: {e}")
    return lines

def extract_value_from_match(match, field_name):
    """从正则匹配中提取字段值"""
    if match.groupdict() and field_name in match.groupdict():
        return match.group(field_name)
    return None

def parse_points_from_lines(lines, pattern_str, field_mapping_str):
    """从日志行中解析位置点"""
    try:
        pattern = re.compile(pattern_str)
    except re.error as e:
        return [], f"正则表达式错误: {e}"
    
    required_fields, extra_fields = parse_field_mapping(field_mapping_str)
    points = []
    
    for line in lines:
        match = pattern.search(line)
        if not match:
            continue
        
        point_data = {}
        extra_data = {}
        
        if match.groupdict():
            for field in required_fields:
                if field in match.groupdict():
                    point_data[field] = match.group(field)
            for field in extra_fields:
                if field in match.groupdict():
                    extra_data[field] = match.group(field)
        else:
            groups = match.groups()
            for i, field in enumerate(required_fields):
                if i < len(groups):
                    point_data[field] = groups[i]
            for i, field in enumerate(extra_fields):
                if i + len(required_fields) < len(groups):
                    extra_data[field] = groups[i + len(required_fields)]
        
        if 'lng' in point_data and 'lat' in point_data:
            try:
                lng = float(point_data['lng'])
                lat = float(point_data['lat'])
                
                alt = float(point_data.get('alt', 0)) if point_data.get('alt') else 0
                head = float(point_data.get('head', 0)) if point_data.get('head') else 0
                speed = float(point_data.get('speed', 0)) if point_data.get('speed') else 0
                
                cooSys_raw = point_data.get('cooSys', 'W')
                cooSysMap = {'W': 'W', 'WGS84': 'W', 'wgs84': 'W', '1': 'W', 'G': 'G', 'GCJ02': 'G', 'gcj02': 'G', 'GCJ-02': 'G', '2': 'G'}
                cooSys = cooSysMap.get(cooSys_raw, 'W')
                
                time_val = point_data.get('time')
                if time_val:
                    try:
                        timestamp = float(time_val)
                        if timestamp < 1e12:
                            timestamp *= 1000
                    except ValueError:
                        try:
                            timestamp = int(time.mktime(time.strptime(time_val, '%Y-%m-%d %H:%M:%S'))) * 1000
                        except:
                            timestamp = int(time.time() * 1000)
                else:
                    timestamp = int(time.time() * 1000)
                
                tagName = point_data.get('tagName', 'auto')
                
                points.append({
                    'lng': lng,
                    'lat': lat,
                    'alt': alt,
                    'head': head,
                    'speed': speed,
                    'cooSys': cooSys,
                    'time': timestamp,
                    'tagName': tagName,
                    'extra': extra_data if extra_data else {}
                })
            except (ValueError, TypeError) as e:
                continue
    
    return points, None

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

@app.route('/api/log/scan', methods=['POST'])
def scan_log_directory():
    data = request.get_json()
    directory = data.get('directory', '')
    
    if not directory or not os.path.isdir(directory):
        return jsonify({"error": "无效目录"}), 400
    
    files = scan_log_files(directory)
    total_files = len(files)
    total_size = sum(os.path.getsize(f) for f in files if os.path.exists(f))
    
    return jsonify({
        "files": files,
        "totalFiles": total_files,
        "totalSize": total_size
    })

@app.route('/api/log/parse', methods=['POST'])
def parse_log_files():
    data = request.get_json()
    directory = data.get('directory', '')
    pattern = data.get('pattern', '')
    field_mapping = data.get('fieldMapping', '')
    max_lines = data.get('maxLines', 100000)
    
    if not directory or not os.path.isdir(directory):
        return jsonify({"error": "无效目录"}), 400
    
    if not pattern:
        return jsonify({"error": "请提供搜索关键字"}), 400
    
    files = scan_log_files(directory)
    if not files:
        return jsonify({"points": [], "message": "未找到日志文件"})
    
    all_points = []
    error = None
    
    for file_path in files:
        lines = read_file_lines(file_path, max_lines)
        points, err = parse_points_from_lines(lines, pattern, field_mapping)
        if err:
            error = err
            break
        all_points.extend(points)
    
    if error:
        return jsonify({"error": error}), 400
    
    return jsonify({
        "points": all_points,
        "totalPoints": len(all_points),
        "filesScanned": len(files)
    })

@app.route('/')
def index():
    return send_from_directory(DIST_DIR, 'index.html')

if __name__ == '__main__':
    if os.environ.get('FLASK_ENV') == 'production':
        serve(app, host='0.0.0.0', port=5000)
    else:
        app.run(host='0.0.0.0', port=5000, debug=True)