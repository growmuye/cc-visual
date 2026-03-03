# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**Agent Teams Visualizer** - 可视化 Claude Code Agent Teams 运行机制的工具。

展示多 Agent 协作系统的团队结构、任务分配和成员交互关系。

## Tech Stack

- **Frontend**: Vue 3.5 + Vite 6 + vue-router 4.6
- **Backend**: Express.js 4.18
- **Visualization**: D3.js 7.9
- **File Watching**: Chokidar 3.6

## Getting Started

### Install dependencies
```bash
npm install
```

### Development
```bash
# Terminal 1: Frontend dev server
npm run dev

# Terminal 2: Backend API server
npm run server
```

### Production
```bash
npm run build
npm run preview
```

## Project Structure

```
cc-visual/
├── src/                      # Frontend Vue source
│   ├── main.js               # App entry point
│   ├── App.vue               # Root component
│   ├── views/
│   │   ├── GraphView.vue     # Team graph visualization
│   │   └── ChatLargeView.vue # Chat view
│   └── components/
│       └── CollaborationGraph.vue  # D3 collaboration graph
├── server/
│   └── index.js              # Express API server
├── index.html                # HTML template
├── vite.config.js            # Vite configuration
├── package.json              # Dependencies & scripts
├── PRD.md                    # Product requirements
└── README.md                 # User documentation
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run server` | Start Express API server |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/teams` | Get all team configurations |
| `GET /api/tasks` | Get all task data |
| `GET /api/config` | Get global config |
| `GET /api/claude-path` | Get data source path |

## Data Source

Reads from `~/.claude` directory:
- `teams/*.json` - Team configurations
- `tasks/*/task.json` - Task data per team
- `config.json` - Global settings

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_PATH` | `/Users/gmy/.claude` | Path to .claude directory |

## Development Notes

- Default branch for PRs: `master`
- Current working branch: `dev-03`
- UI includes team visualization with color-coded members
- Real-time file watching via Chokidar
