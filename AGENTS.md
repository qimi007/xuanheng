# 玄衡地图工具开发指南

## 工具信息

- **名称**：玄衡
- **版本**：v1.0.0

## 项目技术栈

- **主框架**：Python + uv
- **前端**：Vue 3 + Vite + Pinia
- **后端**：Flask + Waitress
- **桌面端**：PyWebView
- **地图服务**：高德地图 API（已完成）/ 百度地图 / Google Maps（暂不支持）

## 项目结构

```
├── frontend/                    # Vue 3 前端项目
│   ├── src/
│   │   ├── components/         # Vue组件
│   │   │   ├── AddLocation.vue # 添加位置对话框
│   │   │   ├── LocationList.vue# 位置列表悬浮卡片
│   │   │   ├── MapView.vue     # 地图组件
│   │   │   └── Settings.vue    # 设置对话框
│   │   ├── stores/             # Pinia状态管理
│   │   │   ├── locations.js    # 位置数据管理
│   │   │   └── settings.js     # 设置管理
│   │   ├── App.vue             # 主组件
│   │   └── main.js             # 入口文件
│   ├── dist/                   # 构建产物（由桌面端自动调用）
│   ├── package.json
│   └── vite.config.ts
├── src/                        # Python 源码
│   ├── backend/
│   │   └── app.py             # Flask后端服务
│   └── desktop/
│       └── main.py            # PyWebView桌面端入口
├── pyproject.toml              # uv项目配置
└── uv.lock                     # 依赖锁文件
```

## 开发命令

### 项目初始化（首次克隆后）
```bash
uv sync        # 安装Python依赖
```

### 前端开发
```bash
cd frontend
npm install    # 安装前端依赖
npm run dev    # 开发服务器 (http://localhost:5173)
npm run build  # 生产构建 (输出到 dist/)
```

### 后端开发
```bash
python src/backend/app.py  # 启动Flask服务 (端口5000)
```

### 桌面端运行（推荐）
```bash
python src/desktop/main.py  # 自动构建前端 + 启动Flask + 打开桌面窗口
```

## UI布局说明

### 整体布局
- **左侧功能栏**（56px宽，浅紫色渐变背景）
  - 上方：添加位置、位置列表图标（SVG）
  - 下方：设置图标（SVG）
- **右侧地图区域**：全屏显示地图

### 交互方式
1. 点击左侧添加位置/设置图标 → 右侧弹出对话框 → 点击对话框外关闭
2. 点击左侧位置列表图标 → 左侧悬浮卡片显示位置点信息 → 再次点击图标关闭卡片

## 功能实现状态

### 前端功能 ✅
1. **添加位置**
   - 坐标系选择：WGS84 / GCJ-02
   - 输入方式：手动输入（已完成）、POS文件/日志（待实现）
   - 坐标格式：不区分经纬度顺序，多个点用 `;` 分割
   - **默认选中**：添加的点自动设置为选中状态（显示在地图上）

2. **位置清单**
   - 树状结构展示分组和点
   - 分组可展开/折叠
   - 勾选控制点的显示/隐藏
   - 标题显示"位置列表(xx个分组)"，无分组时不显示分组数量
   - **分组名称**：双击可编辑，失焦自动保存
   - **分组头标识**：右对齐显示分组颜色和形状图标
   - **分组右键菜单**：全选/取消、选择颜色、标记形状（圆形/箭头）、显示轨迹、添加点、删除选中、导出、重命名、删除分组
   - **位置点显示**：左侧复选框（控制地图显示/隐藏），右侧双行显示
     - 第一行：位置点名称（双击可编辑），右侧单选框控制是否显示详细信息（打桩实现）
     - 第二行：坐标系标识[W/G] + 经纬度（点击复制，无空格）+ 时间（格式：日-时:分:秒，右对齐）
     - 单选框在位置点未选中时置灰不可点击
   - **轨迹按钮**：选中少于2个点时置灰不可点击
   - **样式**：分组标题边距 9px 10px，位置点边距 4px 9px
   - **位置点数据结构**：
     ```js
     {
       id: 'xxx',
       tagName: '点1',    // 名称
       cooSys: 'W',      // W=WGS84, G=GCJ-02
       lng: 116.397428,  // 经度
       lat: 39.90923,    // 纬度
       alt: 0,           // 海拔（默认0）
       time: 1715000000000, // 时间戳
       extra: {},        // 扩展信息（从POS/日志文件获取）
       showDetail: true, // 是否显示详细信息
       head: 0,          // 航向角度（用于箭头标记）
       speed: 0          // 速度
     }
     ```
   - **分组数据结构**：
     ```js
     {
       id: 'xxx',
       name: '分组名称',
       points: [...],
       cooSys: 'W',
       visible: true,
       color: '#5c6bc0', // 分组颜色
       shape: 'circle',  // 标记形状：circle/arrow
       showTrack: false // 是否显示轨迹
     }
     ```
   - **轨迹显示**：右键菜单选择显示轨迹后，连接分组中已勾选的位置点绘制轨迹线，颜色与分组一致，宽度6px，显示方向箭头
- **地图标记**：复选框选中时显示标记点，分组折叠不影响标记显示
      - 圆形：AMap.Marker + SVG图标，尺寸12px，anchor: center
      - 箭头：AMap.Marker + SVG箭头，尺寸16px，方向由head字段决定
    - **标记点击**：左键点击标记点放大动效（动态更换图标大小），位置列表自动滚动高亮对应点，1.5秒后自动取消高亮
   - **标记右键**：右键点击标记点弹出信息窗体（DOM实现），再次右键可关闭
     - 信息窗体内容：名称、时间、经纬度、海拔、航向角、速度、扩展信息
     - 信息窗体可拖动
     - 地图移动/缩放时信息窗体自动跟随位置
     - 右上角关闭按钮
     - 支持同时显示多个信息窗体
     - 右键不触发地图右键菜单
   - **双击定位**：双击位置列表中的位置点，地图自动居中并触发标记点放大动效
     - 双击名称：编辑名称
     - 双击坐标行：地图居中 + 放大动效

 3. **设置**
   - 地图服务商选择（高德已实现，百度/Google 暂不支持）
   - API Key 密文输入和显示切换
   - 用户配置存储到本地文件 `D:/Magic/settings.json`
   - 过期提示（剩余天数低于 10 天显示提醒，过期后强制要求填写）

5. **预置 API Key 与过期机制**
   - 预置高德地图 API Key（硬编码在 settings.js）
   - 首次使用记录时间到本地文件
   - 31 天后过期，过期后需填写用户 API Key
   - localStorage 标记防止删除配置文件绕过
   - 窗口标题显示激活状态和剩余天数

4. **地图显示**
   - 高德地图集成
   - 根据位置数据自动显示标记点
   - 自动缩放到合适的视图范围
   - 地图控件：比例尺、鹰眼（右下角）、控制栏（右上角）、地图类型切换

### 后端功能
- `/api/health` - 健康检查接口
- `/api/settings` - 读取/保存用户配置（存储到 D:/Magic/settings.json）
- `/api/status` - 获取激活状态和剩余天数
- `/` - 提供前端静态页面（Flask 托管 frontend/dist）

## 配色风格

- **主色调**：浅紫色系 (#e8eaf6 → #c5cae9)
- **强调色**：蓝紫色 (#7986cb, #5c6bc0)
- **侧边栏**：浅紫色渐变背景 + 白色半透明图标按钮
- **对话框**：圆角卡片 + 渐变阴影
- **按钮**：蓝紫色渐变 + 悬停效果

## 高德地图 JS API 2.0 注意事项

### 地图初始化
- 加载脚本：`https://webapi.amap.com/maps?v=2.0&key=${key}`
- 创建地图：`new AMap.Map(container, options)`
- 地图样式：使用 `map.setMapStyle('amap://styles/normal')` 在 `complete` 事件中设置，不在构造函数中设置 `mapStyle`

### 图层系统
JS API 2.0 中使用 TileLayer 子类管理图层，**不使用**以下写法：
- `AMap.NormalLayer`、`AMap.SatelliteLayer`、`AMap.RoadNet` — 这些不是构造函数
- `AMap.TrafficLayer` — 不存在

**正确写法**（均在 `AMap.TileLayer` 命名空间下）：
- 标准图层：`new AMap.TileLayer()`
- 卫星图层：`new AMap.TileLayer.Satellite()`
- 路网图层：`new AMap.TileLayer.RoadNet({ zIndex: 10 })`
- 路况图层：`new AMap.TileLayer.Traffic({ zIndex: 11 })`

### 图层管理方法
- `map.add(layer)` — 添加图层
- `map.remove(layer)` — 移除图层
- `map.remove([layer1, layer2])` — 批量移除
- 不推荐使用 `map.setLayers()` 管理图层，改用 add/remove

### 已实现右键菜单功能
- **地图类型**：标准地图 / 卫星地图（两种切换，normal样式通过 setMapStyle 实现）
- **路网**：点击切换显示/隐藏（合并为一个选项）
- **路况**：点击切换显示/隐藏（合并为一个选项）

## 重要约束

1. **前后端通信**：Flask 后端默认运行在 `http://localhost:5000`
2. **PyWebView 加载**：桌面端自动启动 Flask 服务后再加载页面
3. **地图服务商**：推荐高德地图（国内访问稳定）
4. **API Key 管理**：存储在本地文件 `D:/Magic/settings.json`，不提交到代码仓库
5. **地图控件**：Scale（比例尺）、HawkEye（鹰眼，右下角）、ControlBar（控制栏，右上角）

## 常见错误速查

| 错误 | 原因 | 解决 |
|------|------|------|
| `AMap.RoadNet is not a constructor` | JS API 2.0 中类名变更 | 使用 `AMap.TileLayer.RoadNet()` |
| `AMap.TrafficLayer is not a constructor` | 类名不存在 | 使用 `AMap.TileLayer.Traffic()` |
| `setMapType is not a function` | 旧版 API 方法 | 改用 TileLayer + add/remove |
| `mapStyle` 不生效 | 构造函数中设置无效 | 在 `complete` 事件中调用 `setMapStyle()` |

## 环境配置

### Windows 开发环境
- Python 3.11+
- Node.js 18+
- uv 包管理器

### 依赖说明
- Flask + Flask-CORS：后端服务
- Waitress：生产级 WSGI 服务器
- PyWebView：桌面端窗口
- Pinia：前端状态管理
- Vite：前端构建工具