# Agent Teams Visualizer

可视化 Claude Code Agent Teams 运行机制的工具。

## 功能特性

- 👥 **团队展示** - 显示所有运行中的 Agent 团队
- 📋 **任务管理** - 查看各团队的任务列表和状态
- 🔄 **实时刷新** - 自动监测 `.claude` 目录变化
- 📊 **系统概览** - 统计团队、成员、任务数量
- 🎨 **颜色标识** - 每个团队成员有独特的颜色标识

## 项目结构

```
cc-visual/
├── src/              # 前端 Vue 源码
│   ├── App.vue       # 主应用组件
│   └── main.js       # 入口文件
├── server/           # 后端 Express 服务器
│   └── index.js      # API 服务器
├── index.html        # HTML 模板
├── vite.config.js    # Vite 配置
└── package.json      # 项目配置
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动前端开发服务器
npm run dev

# 启动后端 API 服务器（新终端）
npm run server
```

### 生产构建

```bash
npm run build
npm run preview
```

## 数据源

本工具读取 `~/.claude` 目录下的数据：

- `teams/` - 团队配置
- `tasks/` - 任务数据
- `config.json` - 全局配置

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `CLAUDE_PATH` | `/Users/gmy/.claude` | .claude 目录路径 |

## API 接口

| 端点 | 说明 |
|------|------|
| `GET /api/teams` | 获取所有团队数据 |
| `GET /api/tasks` | 获取所有任务数据 |
| `GET /api/config` | 获取配置信息 |
| `GET /api/claude-path` | 获取数据源路径 |

## 技术栈

- **前端**: Vue 3 + Vite
- **后端**: Express.js
- **文件监听**: Chokidar
