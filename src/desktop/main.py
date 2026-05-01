import webview
import threading
import time
import sys
import os
import subprocess

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

if __name__ == '__main__':
    build_frontend()
    
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    time.sleep(2)
    
    webview.create_window('地图工具', 'http://localhost:5000', debug=True)
    webview.start()