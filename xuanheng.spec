# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller 打包配置 —— 玄衡 PyTauri 桌面端（单文件，无控制台窗口）。

构建：
    cd frontend && npm run build && cd ..
    uv run pyinstaller xuanheng.spec --clean --noconfirm

产物：dist/xuanheng.exe（单文件）
说明：
    pytauri 通过 importlib.metadata 的 entry point（pytauri:ext_mod）定位
    pytauri_wheel.ext_mod，所以必须 copy_metadata("pytauri-wheel") 并显式
    收集扩展模块；Tauri.toml、capabilities/ 与前端 dist 作为数据文件随包释放。
"""

import os
from pathlib import Path

from PyInstaller.utils.hooks import collect_all, copy_metadata

BASE_DIR = Path(globals().get("SPECPATH", os.getcwd())).resolve()
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
SRC_DIR = BASE_DIR / "src"
TAURI_APP_DIR = SRC_DIR / "tauri_app"

if not FRONTEND_DIST.exists():
    raise SystemExit("frontend/dist 不存在：请先执行 cd frontend && npm run build")

datas = [
    (str(TAURI_APP_DIR / "Tauri.toml"), "tauri_app"),
    (str(TAURI_APP_DIR / "capabilities"), "tauri_app/capabilities"),
    (str(FRONTEND_DIST), "frontend/dist"),
]
binaries = []
hiddenimports = [
    "tauri_app",
    "tauri_app.services",
    "zstandard",
    "anyio._backends._asyncio",
    "pytauri_wheel.ext_mod",
    "importlib_metadata",
]

# pytauri / pytauri_wheel / pytauri_plugins / pytauri_utils：代码、数据与二进制
for package in ("pytauri", "pytauri_wheel", "pytauri_plugins", "pytauri_utils"):
    pkg_datas, pkg_binaries, pkg_hiddenimports = collect_all(package)
    datas += pkg_datas
    binaries += pkg_binaries
    hiddenimports += pkg_hiddenimports

# pytauri 依赖该元数据定位扩展模块（pytauri:ext_mod）
datas += copy_metadata("pytauri-wheel")

a = Analysis(
    [str(BASE_DIR / "run.py")],
    pathex=[str(SRC_DIR)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    # 桌面端不依赖 Flask/PyWebView（它们只用于浏览器开发模式）
    excludes=["flask", "flask_cors", "waitress", "webview", "tkinter"],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="xuanheng",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
