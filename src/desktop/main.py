import webview
import threading
import time
import sys
import os
import subprocess
import urllib.request

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FRONTEND_DIR = os.path.join(PROJECT_DIR, 'frontend')
DIST_DIR = os.path.join(FRONTEND_DIR, 'dist')

def build_frontend():
    if not os.path.exists(DIST_DIR):
        print("前端未构建，正在构建...")
        subprocess.run('npm run build', cwd=FRONTEND_DIR, shell=True, check=True)
    else:
        print("前端已构建")

def run_server():
    sys.path.insert(0, os.path.join(PROJECT_DIR, 'src', 'backend'))
    from app import app
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

def get_window_title():
    try:
        response = urllib.request.urlopen('http://localhost:5000/api/status', timeout=3)
        data = response.read().decode('utf-8')
        import json
        status = json.loads(data)
        
        if not status.get('isActivated'):
            days = status.get('remainingDays', 31)
            if status.get('isExpired'):
                return '地图工具(未激活，已过期，请填写API Key)'
            else:
                return f'地图工具(未激活，体验剩余{days}天)'
        else:
            return '地图工具'
    except Exception as e:
        print(f"获取状态失败: {e}")
        return '地图工具'

if __name__ == '__main__':
    build_frontend()
    
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    time.sleep(2)
    
    title = get_window_title()
    print(f"窗口标题: {title}")
    
    window = webview.create_window(title, 'http://localhost:5000')
    webview.start(debug=True)