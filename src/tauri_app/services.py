"""玄衡核心服务：配置、激活状态、日志扫描与解析。

这些逻辑从 src/backend/app.py 抽出，供 PyTauri commands 直接调用，
不依赖 Flask。Flask 后端仍保留作为浏览器开发模式的过渡方案。
"""

import glob
import json
import os
import re
import time

CONFIG_DIR = 'D:/Magic'
CONFIG_FILE = os.path.join(CONFIG_DIR, 'settings.json')

PRESET_KEY = '16b30977f48271dd262787f499bd7fe6'
EXPIRY_DAYS = 31


def ensure_config_dir():
    if not os.path.exists(CONFIG_DIR):
        os.makedirs(CONFIG_DIR)


def load_settings():
    ensure_config_dir()
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_settings(data):
    ensure_config_dir()
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_status():
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

    return {
        "isActivated": is_activated,
        "isExpired": is_expired,
        "remainingDays": remaining_days,
        "hasUsedBefore": os.path.exists(CONFIG_FILE) and first_used is not None,
    }


def scan_log_files(directory):
    """扫描目录中的 *.log 和 *.zst 文件"""
    files = []
    for pattern in ['**/*.log', '**/*.zst']:
        files.extend(glob.glob(os.path.join(directory, pattern), recursive=True))
    return sorted(files)


def read_file_lines(file_path, max_lines=None):
    """读取文件内容，支持 .zst 解压"""
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
                lines = [line.rstrip('\n') for line in lines]

        if max_lines:
            lines = lines[:max_lines]
    except Exception as e:
        print(f"读取文件失败 {file_path}: {e}")
    return lines


def parse_field_mapping(field_str):
    """解析字段对齐说明，返回 (required_fields, extra_fields)"""
    if '@' in field_str:
        required_part, extra_part = field_str.split('@', 1)
        required = [f.strip() for f in required_part.split(',') if f.strip()]
        extra = [f.strip() for f in extra_part.split(',') if f.strip()]
    else:
        required = [f.strip() for f in field_str.split(',') if f.strip()]
        extra = []
    return required, extra


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
                cooSys_map = {'W': 'W', 'WGS84': 'W', 'wgs84': 'W', '1': 'W',
                              'G': 'G', 'GCJ02': 'G', 'gcj02': 'G', 'GCJ-02': 'G', '2': 'G'}
                cooSys = cooSys_map.get(cooSys_raw, 'W')

                time_val = point_data.get('time')
                if time_val:
                    try:
                        timestamp = float(time_val)
                        if timestamp < 1e12:
                            timestamp *= 1000
                    except ValueError:
                        try:
                            timestamp = int(time.mktime(time.strptime(time_val, '%Y-%m-%d %H:%M:%S'))) * 1000
                        except Exception:
                            timestamp = int(time.time() * 1000)
                else:
                    timestamp = int(time.time() * 1000)

                tag_name = point_data.get('tagName', 'auto')

                points.append({
                    'lng': lng,
                    'lat': lat,
                    'alt': alt,
                    'head': head,
                    'speed': speed,
                    'cooSys': cooSys,
                    'time': timestamp,
                    'tagName': tag_name,
                    'extra': extra_data if extra_data else {}
                })
            except (ValueError, TypeError):
                continue

    return points, None
