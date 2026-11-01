"""玄衡桌面端 —— PyTauri（pytauri-wheel）实现。

运行方式（在项目根目录执行）：
    uv run python run.py                          # 生产模式：加载 frontend/dist
    $env:XUANHENG_DEV=1; uv run python run.py     # 开发模式：前端走 Vite (http://localhost:5173)
    uv run python run.py --smoke                  # 自检：构建 Tauri 上下文与命令注册

前端通过 `window.__TAURI__.pytauri.pyInvoke("命令名", 参数)` 调用这里的命令；
浏览器开发模式则回退到 Flask 的 /api/* 接口（见 frontend/src/api/client.js）。
"""

import os
import sys
import time
from pathlib import Path

from anyio.from_thread import start_blocking_portal
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from pytauri import Commands
from pytauri.webview import WebviewWindow
from pytauri_plugins import dialog
from pytauri_wheel.lib import builder_factory, context_factory

from . import services

SRC_TAURI_DIR = Path(__file__).parent.absolute()
DEV_SERVER = 'http://localhost:5173'

commands = Commands()


class _BaseModel(BaseModel):
    """接受前端 camelCase 字段，对应 Python 的 snake_case 字段。"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class SettingsBody(_BaseModel):
    map_provider: str = 'amap'
    map_key: str = ''
    first_used_time: int | None = None


class LogScanBody(_BaseModel):
    directory: str


class LogParseBody(_BaseModel):
    directory: str
    pattern: str = ''
    field_mapping: str = ''
    max_lines: int = 100000


class WriteFileBody(_BaseModel):
    path: str
    content: str


class TitleBody(_BaseModel):
    title: str


@commands.command()
async def get_settings() -> dict:
    """读取 D:/Magic/settings.json（不存在时返回空对象）。"""
    return services.load_settings()


@commands.command()
async def save_settings(body: SettingsBody) -> dict:
    """写入设置文件，字段与旧版 /api/settings 保持一致。"""
    services.save_settings(body.model_dump(by_alias=True))
    return {"status": "ok"}


@commands.command()
async def get_status() -> dict:
    """激活/过期状态（替代旧版 /api/status）。"""
    return services.get_status()


def _ipc_log(message: str) -> None:
    """冻结态启动诊断：记录前端是否成功经 IPC 调用了命令。"""
    if not getattr(sys, 'frozen', False):
        return
    try:
        os.makedirs('D:/Magic', exist_ok=True)
        with open('D:/Magic/xuanheng-ipc.log', 'a', encoding='utf-8') as f:
            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} {message}\n")
    except Exception:
        pass


@commands.command()
async def set_title(body: TitleBody, webview_window: WebviewWindow) -> None:
    """由前端在启动后设置原生窗口标题。"""
    _ipc_log(f'set_title: {body.title}')
    print(f"[ipc] set_title: {body.title}", flush=True)
    webview_window.set_title(body.title)


@commands.command()
async def scan_log_dir(body: LogScanBody) -> dict:
    """扫描日志目录中的 *.log / *.zst 文件。"""
    if not body.directory or not os.path.isdir(body.directory):
        raise ValueError('无效目录')

    files = services.scan_log_files(body.directory)
    total_size = sum(os.path.getsize(f) for f in files if os.path.exists(f))
    return {
        "files": files,
        "totalFiles": len(files),
        "totalSize": total_size,
    }


@commands.command()
async def parse_log_files(body: LogParseBody) -> dict:
    """按正则解析日志文件，返回位置点数组（替代旧版 /api/log/parse）。"""
    if not body.directory or not os.path.isdir(body.directory):
        raise ValueError('无效目录')
    if not body.pattern:
        raise ValueError('请提供搜索关键字')

    files = services.scan_log_files(body.directory)
    if not files:
        return {"points": [], "message": "未找到日志文件"}

    all_points = []
    for file_path in files:
        lines = services.read_file_lines(file_path, body.max_lines)
        points, err = services.parse_points_from_lines(lines, body.pattern, body.field_mapping)
        if err:
            raise ValueError(err)
        all_points.extend(points)

    return {
        "points": all_points,
        "totalPoints": len(all_points),
        "filesScanned": len(files),
    }


@commands.command()
async def write_text_file(body: WriteFileBody) -> dict:
    """写入文本文件。

    保存对话框由前端调用 tauri-plugin-dialog（返回字符串路径）完成，
    Python 侧只负责写盘，避免阻塞事件循环。
    """
    with open(body.path, 'w', encoding='utf-8') as f:
        f.write(body.content)
    return {"status": "ok", "path": body.path}


def _build_app(portal):
    tauri_config = None
    if os.environ.get('XUANHENG_DEV') == '1':
        # 开发模式：直接加载 Vite dev server
        tauri_config = {"build": {"frontendDist": DEV_SERVER}}
    elif getattr(sys, 'frozen', False):
        # 单文件打包后，前端资源释放到 sys._MEIPASS/frontend/dist。
        # 仓库里的 Tauri.toml 使用 ../../frontend/dist（开发布局），这里改为
        # 相对 tauri_app 目录的运行时路径。
        meipass = getattr(sys, '_MEIPASS', None)
        if meipass:
            frontend_dist = Path(meipass) / 'frontend' / 'dist'
            rel = os.path.relpath(frontend_dist, SRC_TAURI_DIR).replace('\\', '/')
            tauri_config = {"build": {"frontendDist": rel}}

    return builder_factory().build(
        context=context_factory(SRC_TAURI_DIR, tauri_config=tauri_config),
        invoke_handler=commands.generate_handler(portal),
        plugins=(dialog.init(),),
    )


def main() -> int:
    """启动 PyTauri 应用。"""
    with start_blocking_portal('asyncio') as portal:
        app = _build_app(portal)

        if '--smoke' in sys.argv:
            print('SMOKE OK: tauri context and commands built')
            return 0

        exit_code = app.run_return()
        return exit_code
