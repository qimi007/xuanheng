# 地图工具开发指南

## 项目技术栈

- **主框架**：Python + uv
- **前端**：Vue 3 + Vite
- **后端**：Flask
- **桌面端**：PyWebView
- **地图服务**：高德地图 API / 百度地图 API / Google Maps

## 项目结构

```
├── frontend/          # Vue 3 前端资源
│   ├── src/
│   ├── public/
│   └── vite.config.ts
├── src/               # Python 源码
│   ├── backend/      # Flask 后端服务
│   └── desktop/       # PyWebView 桌面端入口
├── pyproject.toml     # uv 项目配置
└── uv.lock            # 依赖锁文件
```

## 开发命令

### 项目初始化（首次克隆后）
```bash
uv sync        # 安装所有依赖（Python + 前端）
```

### 前端开发
```bash
cd frontend
npm install
npm run dev      # 开发服务器
npm run build   # 生产构建
```

### 后端开发
```bash
python src/backend/app.py  # 启动Flask服务
```

### 桌面端运行
```bash
python src/desktop/main.py  # 启动PyWebView应用
```

## 地图API配置

- 高德地图：需要在 `frontend` 或 `backend` 中配置高德 Web API Key
- 百度地图：需要在 `frontend` 或 `backend` 中配置百度地图 API Key
- Google Maps：需要配置 Google Maps JavaScript API Key

API Key 应存储在环境变量或配置文件中，**不要提交到代码仓库**。

## 重要约束

1. **前后端通信**：Flask 后端默认运行在 `http://localhost:5000`，前端通过代理或 CORS 访问
2. **PyWebView 加载地址**：需要确保 Flask 服务已启动，PyWebView 才能正确加载页面
3. **地图服务商选择**：根据中国大陆使用习惯，推荐优先考虑高德地图或百度地图（Google Maps 在国内访问受限）
4. **环境变量**：敏感配置（如 API Key）使用 `.env` 文件管理，并加入 `.gitignore`

## 测试与验证

- 前端单元测试：`npm run test`（如配置了 Vitest/Jest）
- 后端单元测试：`pytest`（如配置了 pytest）
- 完整桌面端测试：需要先启动 Flask 后端，再运行 PyWebView