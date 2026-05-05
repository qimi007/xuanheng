# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller 打包配置 - 单文件exe，无控制台窗口"""

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# 前端静态文件
base_dir = os.getcwd()
frontend_dist = os.path.join(base_dir, 'frontend', 'dist')
added_files = []
if os.path.exists(frontend_dist):
    added_files.append((frontend_dist, 'frontend/dist'))

block_cipher = None

a = Analysis(
    [os.path.join(base_dir, 'src', 'desktop', 'main.py')],
    pathex=[os.path.join(base_dir, 'src', 'backend')],
    binaries=[],
    datas=added_files,
    hiddenimports=[
        'flask',
        'flask_cors',
        'waitress',
        'webview',
        'app',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    cipher=block_cipher,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='xuanheng',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
