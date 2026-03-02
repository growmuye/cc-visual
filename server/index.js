const express = require('express');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const app = express();
const PORT = 3000;

// .claude 目录路径
const CLAUDE_PATH = process.env.CLAUDE_PATH || '/Users/gmy/.claude';
const TEAMS_PATH = path.join(CLAUDE_PATH, 'teams');
const TASKS_PATH = path.join(CLAUDE_PATH, 'tasks');
const CONFIG_PATH = path.join(CLAUDE_PATH, 'config.json');

// 读取团队数据
function getTeams() {
  const teams = [];
  if (!fs.existsSync(TEAMS_PATH)) {
    return teams;
  }

  const teamDirs = fs.readdirSync(TEAMS_PATH);
  for (const teamDir of teamDirs) {
    const teamConfigPath = path.join(TEAMS_PATH, teamDir, 'config.json');
    if (fs.existsSync(teamConfigPath)) {
      try {
        const content = fs.readFileSync(teamConfigPath, 'utf-8');
        const team = JSON.parse(content);
        // 处理成员颜色，将亮色替换为深色
        if (team.members && Array.isArray(team.members)) {
          team.members.forEach(member => {
            if (member.color) {
              member.color = normalizeColor(member.color);
            }
          });
        }
        teams.push(team);
      } catch (e) {
        console.error(`读取团队 ${teamDir} 失败:`, e);
      }
    }
  }
  return teams;
}

// 将亮色替换为深色，避免与白色背景融合
function normalizeColor(color) {
  if (!color) return '#475569';

  const colorMap = {
    // 白色/浅灰 → 深蓝灰
    '#ffffff': '#475569',
    '#fff': '#475569',
    'white': '#475569',
    '#f8fafc': '#475569',
    '#f1f5f9': '#64748b',
    '#e2e8f0': '#64748b',

    // 黄色 → 深琥珀色
    '#fbbf24': '#b45309',
    '#f59e0b': '#92400e',
    '#fcd34d': '#92400e',
    '#fde68a': '#78350f',
    '#fef3c7': '#78350f',

    // 青色 → 深青色
    '#22d3ee': '#0e7490',
    '#06b6d4': '#0891b2',
    '#67e8f9': '#0e7490',
    '#a5f3fc': '#164e63',
    '#cffafe': '#164e63',

    // 浅灰 → 中灰
    '#9ca3af': '#4b5563',
    '#6b7280': '#374151',
    '#d1d5db': '#6b7280',

    // 浅绿 → 深绿
    '#86efac': '#15803d',
    '#bbf7d0': '#166534',
    '#dcfce7': '#14532d',

    // 浅粉 → 深粉
    '#f9a8d4': '#9d174d',
    '#fbcfe8': '#831843',
    '#fce7f3': '#9d174d'
  };

  if (colorMap[color.toLowerCase()]) {
    return colorMap[color.toLowerCase()];
  }

  // 检查颜色亮度，如果太浅则调暗
  const hex = color.replace('#', '');
  if (hex.length === 6) {
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // 计算亮度
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    // 如果太亮（> 160），返回更深的版本
    if (brightness > 160) {
      const factor = 0.5;
      const newR = Math.round(r * factor);
      const newG = Math.round(g * factor);
      const newB = Math.round(b * factor);
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
  }

  return color;
}

// 读取任务数据
function getTasks() {
  const tasks = [];
  if (!fs.existsSync(TASKS_PATH)) {
    return tasks;
  }

  const taskDirs = fs.readdirSync(TASKS_PATH);
  for (const taskDir of taskDirs) {
    const taskPath = path.join(TASKS_PATH, taskDir);
    const stat = fs.statSync(taskPath);
    if (stat.isFile() && taskPath.endsWith('.json')) {
      try {
        const content = fs.readFileSync(taskPath, 'utf-8');
        const task = JSON.parse(content);
        tasks.push(task);
      } catch (e) {
        console.error(`读取任务 ${taskDir} 失败:`, e);
      }
    }
  }
  return tasks;
}

// 读取配置
function getConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch (e) {
      console.error('读取配置失败:', e);
    }
  }
  return null;
}

// 读取 session 数据
function getSessions() {
  const SESSION_ENV_PATH = path.join(CLAUDE_PATH, 'session-env');
  const sessions = [];
  if (!fs.existsSync(SESSION_ENV_PATH)) {
    return sessions;
  }

  const sessionDirs = fs.readdirSync(SESSION_ENV_PATH);
  for (const sessionDir of sessionDirs) {
    sessions.push({
      sessionId: sessionDir,
      sessionPath: path.join(SESSION_ENV_PATH, sessionDir)
    });
  }
  return sessions;
}

// 获取团队与 session 的关联关系
function getSessionTeamMapping() {
  const teams = getTeams();
  const sessions = getSessions();

  const mapping = {};

  // 初始化所有 session
  sessions.forEach(session => {
    mapping[session.sessionId] = {
      sessionId: session.sessionId,
      teams: []
    };
  });

  // 将团队关联到对应的 session
  teams.forEach(team => {
    const sessionId = team.leadSessionId;
    if (sessionId) {
      if (!mapping[sessionId]) {
        mapping[sessionId] = {
          sessionId: sessionId,
          teams: []
        };
      }
      mapping[sessionId].teams.push({
        name: team.name,
        description: team.description,
        members: team.members?.length || 0,
        createdAt: team.createdAt
      });
    }
  });

  return Object.values(mapping);
}

// 读取团队协作流数据 (inboxes)
function getCollaborationFlow(teamName) {
  const INBOXES_PATH = path.join(TEAMS_PATH, teamName, 'inboxes');
  const messages = [];

  if (!fs.existsSync(INBOXES_PATH)) {
    return messages;
  }

  const inboxFiles = fs.readdirSync(INBOXES_PATH);
  for (const file of inboxFiles) {
    if (file.endsWith('.json')) {
      try {
        const content = fs.readFileSync(path.join(INBOXES_PATH, file), 'utf-8');
        const inboxMessages = JSON.parse(content);
        messages.push(...inboxMessages.map(msg => ({
          ...msg,
          inboxFile: file
        })));
      } catch (e) {
        console.error(`读取收件箱 ${file} 失败:`, e);
      }
    }
  }

  // 按时间戳排序
  return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// 获取所有团队的协作流概要
function getCollaborationSummary() {
  const teams = getTeams();
  const summary = {};

  teams.forEach(team => {
    const messages = getCollaborationFlow(team.name);
    const memberStats = {};

    messages.forEach(msg => {
      const from = msg.from;
      if (!memberStats[from]) {
        memberStats[from] = {
          name: from,
          messageCount: 0,
          color: msg.color || '#888',
          lastMessageTime: msg.timestamp
        };
      }
      memberStats[from].messageCount++;
      if (new Date(msg.timestamp) > new Date(memberStats[from].lastMessageTime)) {
        memberStats[from].lastMessageTime = msg.timestamp;
      }
    });

    summary[team.name] = {
      teamName: team.name,
      totalMessages: messages.length,
      memberStats: Object.values(memberStats),
      recentMessages: messages.slice(-10)
    };
  });

  return summary;
}

// API 路由
app.get('/api/teams', (req, res) => {
  res.json(getTeams());
});

app.get('/api/sessions', (req, res) => {
  res.json(getSessions());
});

app.get('/api/session-team-mapping', (req, res) => {
  res.json(getSessionTeamMapping());
});

app.get('/api/collaboration-summary', (req, res) => {
  res.json(getCollaborationSummary());
});

app.get('/api/collaboration-flow/:teamName', (req, res) => {
  const teamName = req.params.teamName;
  res.json(getCollaborationFlow(teamName));
});

// 获取指定团队的收件箱数据（按成员分组）
app.get('/api/inboxes/:teamName', (req, res) => {
  const teamName = req.params.teamName;
  const INBOXES_PATH = path.join(TEAMS_PATH, teamName, 'inboxes');
  const inboxes = {};

  if (!fs.existsSync(INBOXES_PATH)) {
    return res.json({});
  }

  const inboxFiles = fs.readdirSync(INBOXES_PATH);
  for (const file of inboxFiles) {
    if (file.endsWith('.json')) {
      try {
        const content = fs.readFileSync(path.join(INBOXES_PATH, file), 'utf-8');
        const messages = JSON.parse(content);
        // 从文件名获取收件人（去掉 .json）
        const recipient = file.replace('.json', '');
        inboxes[recipient] = messages;
      } catch (e) {
        console.error(`读取收件箱 ${file} 失败:`, e);
      }
    }
  }

  res.json(inboxes);
});

app.get('/api/tasks', (req, res) => {
  res.json(getTasks());
});

app.get('/api/config', (req, res) => {
  res.json(getConfig());
});

app.get('/api/claude-path', (req, res) => {
  res.json({ path: CLAUDE_PATH });
});

// 静态文件服务（生产环境）
app.use(express.static(path.join(__dirname, '../dist')));

// SPA 回退路由
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('请先运行 npm run build 构建前端');
  }
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`🚀 Agent Teams Visualizer 服务器运行在 http://localhost:${PORT}`);
  console.log(`📁 数据源：${CLAUDE_PATH}`);
});

// 文件监听 - 实时刷新
const watcher = chokidar.watch([TEAMS_PATH, TASKS_PATH], {
  persistent: true,
  ignoreInitial: true,
  depth: 2
});

watcher.on('all', (event, path) => {
  console.log(`📡 文件变化：${event} - ${path}`);
  // 通知连接的客户端刷新
});

// 优雅退出
process.on('SIGTERM', () => {
  console.log('正在关闭服务器...');
  server.close(() => {
    watcher.close();
    process.exit(0);
  });
});
