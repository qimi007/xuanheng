"""玄衡启动器（PyTauri 桌面端）。

开发/调试：
    uv run python run.py                          # 生产模式（前端需先 npm run build）
    $env:XUANHENG_DEV=1; uv run python run.py     # 开发模式（前端先 npm run dev）
    uv run python run.py --smoke                  # 自检：构建上下文与命令注册

打包（单文件、无控制台）：
    uv run pyinstaller xuanheng.spec --clean --noconfirm

说明：
    不把本仓库打包安装为 Python 包（避免 hatchling 构建与入口脚本在受限环境下
    生成 trampoline exe 的问题），`uv run` 只负责准备依赖环境，本文件负责把
    src/ 加入 import 路径后启动 tauri_app。
    窗口模式下 stdout/stderr 可能为 None，这里替换为 devnull，避免 IPC 命令里的
    print 触发异常；启动失败时把回溯写入 D:/Magic/xuanheng-error.log。
"""

import os
import sys
import traceback

SRC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

ERROR_LOG = "D:/Magic/xuanheng-error.log"


def _ensure_streams():
    """窗口模式（--noconsole）下 stdout/stderr 为 None，替换为 devnull 防止写入崩溃。"""
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w", encoding="utf-8")
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w", encoding="utf-8")


def _write_error_log(exc: BaseException) -> None:
    try:
        os.makedirs(os.path.dirname(ERROR_LOG), exist_ok=True)
        with open(ERROR_LOG, "w", encoding="utf-8") as f:
            f.write("".join(traceback.format_exception(exc)))
    except Exception:
        pass


def main() -> int:
    from tauri_app import main as run_app

    return run_app()


if __name__ == "__main__":
    _ensure_streams()
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except BaseException as exc:  # noqa: BLE001 - 打包后无控制台，必须落盘
        _write_error_log(exc)
        raise
