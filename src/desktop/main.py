import webview
import threading
import time
import sys
import os
import socket
import random
import subprocess
import urllib.request

IS_FROZEN = getattr(sys, 'frozen', False)

if IS_FROZEN:
    PROJECT_DIR = sys._MEIPASS
else:
    PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

FRONTEND_DIR = os.path.join(PROJECT_DIR, 'frontend')
DIST_DIR = os.path.join(FRONTEND_DIR, 'dist')
VERSION = 'v1.0.0'

SERVER_PORT = None

def find_available_port(start=10000, end=11000):
    """在指定范围内查找可用端口"""
    ports = list(range(start, end + 1))
    random.shuffle(ports)
    for port in ports:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            continue
    raise RuntimeError(f"无法在 {start}-{end} 范围内找到可用端口")

class Api:
    def save_file(self, content, filename, file_types):
        """弹出保存对话框并写入文件"""
        result = webview.windows[0].create_file_dialog(
            dialog_type=webview.FileDialog.SAVE,
            save_filename=filename,
            file_types=file_types
        )
        if result and len(result) > 0:
            path = result[0]
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            return {'status': 'ok', 'path': path}
        return {'status': 'cancelled'}

def build_frontend():
    if IS_FROZEN:
        return
    if not os.path.exists(DIST_DIR):
        print("前端未构建，正在构建...")
        subprocess.run('npm run build', cwd=FRONTEND_DIR, shell=True, check=True)
    else:
        print("前端已构建")

def run_server(port):
    global SERVER_PORT
    SERVER_PORT = port
    if IS_FROZEN:
        from app import app
    else:
        sys.path.insert(0, os.path.join(PROJECT_DIR, 'src', 'backend'))
        from app import app
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)

def get_window_title(port):
    try:
        response = urllib.request.urlopen(f'http://localhost:{port}/api/status', timeout=3)
        data = response.read().decode('utf-8')
        import json
        status = json.loads(data)
        
        base_title = f'玄衡 {VERSION}'
        
        if not status.get('isActivated'):
            days = status.get('remainingDays', 31)
            if status.get('isExpired'):
                return f'{base_title}(未激活，已过期，请填写API Key)'
            else:
                return f'{base_title}(未激活，体验剩余{days}天)'
        else:
            return base_title
    except Exception as e:
        print(f"获取状态失败: {e}")
        return f'玄衡 {VERSION}'

if __name__ == '__main__':
    build_frontend()
    
    port = find_available_port()
    print(f"使用端口: {port}")
    
    server_thread = threading.Thread(target=run_server, args=(port,), daemon=True)
    server_thread.start()
    
    time.sleep(2)
    
    title = get_window_title(port)
    print(f"窗口标题: {title}")
    
    window = webview.create_window(title, f'http://localhost:{port}', js_api=Api())
    
    debug_mode = os.path.exists('D:\\Magic\\debugtool')
    print(f"Debug模式: {debug_mode}")
    
    webview.start(debug=debug_mode)