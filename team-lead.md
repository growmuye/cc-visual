# Agent Teams 关键工具文档

本文档整理了 Claude Code 中与团队协作（Agent Teams）相关的关键工具。

---

## 1. TeamCreate

**描述**：创建新团队，生成团队配置文件和任务列表目录。

### 入参

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `team_name` | string | 是 | 团队名称，用于创建 `~/.claude/teams/{team-name}/` 目录 |
| `description` | string | 否 | 团队描述/目的 |
| `agent_type` | string | 否 | 团队负责人（team lead）的类型/角色，如 "researcher"、"test-runner" |

### 出参

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `team_name` | string | 创建的团队名称 |
| `team_file_path` | string | 团队配置文件的完整路径 |
| `lead_agent_id` | string | 团队负责人的代理 ID |

---

## 2. TeamDelete

**描述**：删除团队，清理团队配置目录和任务目录。

### 入参

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| （无） | - | - | 自动使用当前会话的团队上下文 |

### 出参

| 字段名 | 类型 | 说明 |
|--------|------|------|
| （无结构化输出） | - | 成功时静默删除，失败时返回错误 |

### 注意事项

- 必须先优雅终止所有团队成员才能删除
- 会删除 `~/.claude/teams/{team-name}/` 目录
- 会删除 `~/.claude/tasks/{team-name}/` 目录

---

## 3. SendMessage

**描述**：向团队成员发送消息或发送协议请求/响应。

### 入参

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `type` | string | 是 | 消息类型：`message`、`broadcast`、`shutdown_request`、`shutdown_response`、`plan_approval_response` |
| `recipient` | string | 条件必填 | 接收消息的团队成员名称（`message`、`shutdown_request`、`plan_approval_response` 类型必填） |
| `content` | string | 条件必填 | 消息文本、原因或反馈内容 |
| `summary` | string | 条件必填 | 5-10 词的消息摘要，显示在 UI 预览中（`message`、`broadcast` 类型必填） |
| `request_id` | string | 条件必填 | 要响应的请求 ID（`shutdown_response`、`plan_approval_response` 类型必填） |
| `approve` | boolean | 条件必填 | 是否批准请求（`shutdown_response`、`plan_approval_response` 类型必填） |

### 出参

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `success` | boolean | 消息是否发送成功 |
| `message` | string | 状态消息 |
| `routing` | object | 路由信息，包含发送者、目标、摘要等 |

---

## 4. Agent

**描述**：启动专用子代理（subagent）自主处理复杂任务，可通过 `team_name` 参数将代理加入指定团队。

### 入参

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `description` | string | 是 | 任务的简短描述（3-5 词） |
| `prompt` | string | 是 | 要代理执行的任务详细说明 |
| `subagent_type` | string | 是 | 子代理类型：`general-purpose`、`Explore`、`Plan`、`statusline-setup`、`claude-code-guide` |
| `name` | string | 否 | 代理名称（用于团队中标识） |
| `team_name` | string | 否 | 团队名称，将代理加入指定团队 |
| `model` | string | 否 | 使用的模型：`sonnet`、`opus`、`haiku` |
| `run_in_background` | boolean | 否 | 是否在后台运行 |
| `max_turns` | integer | 否 | 最大代理轮数 |
| `mode` | string | 否 | 权限模式：`default`、`plan`、`acceptEdits`、`bypassPermissions`、`dontAsk` |
| `isolation` | string | 否 | 隔离模式：`worktree` 在临时 git worktree 中运行 |
| `resume` | string | 否 | 恢复之前代理的执行（传入代理 ID） |

### 出参

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `agent_id` | string | 生成的代理 ID |
| `name` | string | 代理名称 |
| `team_name` | string | 所属团队名称 |
| 任务结果 | string | 代理完成后的任务结果 |

---

## 5. TaskCreate

**描述**：创建结构化任务列表中的新任务，用于跟踪团队协作进度。

### 入参

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `subject` | string | 是 | 任务标题（祈使句形式，如 "Fix authentication bug"） |
| `description` | string | 是 | 任务详细描述，包含上下文和验收标准 |
| `activeForm` | string | 是 | 进行时形式，用于 in_progress 状态的加载提示（如 "Fixing authentication bug"） |
| `metadata` | object | 否 | 附加元数据 |

### 出参

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `taskId` | string | 生成的任务 ID |
| `subject` | string | 任务标题 |
| `status` | string | 初始状态（`pending`） |

---

## 6. TaskList

**描述**：列出团队任务列表中的所有任务摘要。

### 入参

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| （无） | - | - | 自动使用当前团队的任务列表 |

### 出参

每个任务包含：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | string | 任务标识符 |
| `subject` | string | 任务简要描述 |
| `status` | string | 任务状态：`pending`、`in_progress`、`completed` |
| `owner` | string | 负责人（代理名称），未分配时为空 |
| `blockedBy` | array | 阻塞此任务的未完成任务 ID 列表 |

---

## 7. TaskGet

**描述**：通过任务 ID 检索任务的完整详情。

### 入参

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `taskId` | string | 是 | 要检索的任务 ID |

### 出参

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `subject` | string | 任务标题 |
| `description` | string | 详细需求和上下文 |
| `status` | string | 任务状态 |
| `blocks` | array | 等待此任务完成的任务列表 |
| `blockedBy` | array | 必须先完成的任务列表 |
| `owner` | string | 任务负责人 |
| `activeForm` | string | 进行时显示文本 |

---

## 8. TaskUpdate

**描述**：更新任务列表中的任务信息。

### 入参

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `taskId` | string | 是 | 要更新的任务 ID |
| `status` | string | 否 | 新状态：`pending`、`in_progress`、`completed`、`deleted` |
| `subject` | string | 否 | 新任务标题 |
| `description` | string | 否 | 新任务描述 |
| `activeForm` | string | 否 | 进行时显示文本 |
| `owner` | string | 否 | 新负责人（代理名称） |
| `metadata` | object | 否 | 合并的元数据（设为 null 可删除键） |
| `addBlocks` | array | 否 | 等待此任务完成的任务 ID 列表 |
| `addBlockedBy` | array | 否 | 必须先完成的任务 ID 列表 |

### 出参

| 字段名 | 类型 | 说明 |
|--------|------|------|
| （更新操作） | - | 成功时静默更新，失败时返回错误 |

---

## 9. TaskStop

**描述**：停止运行中的后台任务。

### 入参

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `task_id` | string | 是 | 要停止的后台任务 ID |
| `shell_id` | string | 否 | 已废弃，使用 task_id 代替 |

### 出参

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `success` | boolean | 是否成功停止 |
| `status` | string | 状态消息 |

---

## 10. TaskOutput

**描述**：从运行中或已完成的任务（后台 shell、代理或远程会话）获取输出。

### 入参

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `task_id` | string | 是 | 任务 ID |
| `block` | boolean | 是 | 是否等待任务完成 |
| `timeout` | number | 是 | 最大等待时间（毫秒），默认 30000 |

### 出参

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `output` | string | 任务输出内容 |
| `status` | string | 任务状态 |
| `exit_code` | number | 退出码（如果已完成） |

---

## 团队协作流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    Team Lead (协调员)                        │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │  成员 A     │     │  成员 B     │     │  成员 C     │
   │ (blue)      │     │ (green)     │     │  (...)      │
   └─────────────┘     └─────────────┘     └─────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Task List     │
                    │  (共享任务列表)  │
                    └─────────────────┘
```

---

## 最佳实践

1. **任务分配**：使用 `TaskUpdate` 的 `owner` 参数将任务分配给空闲成员
2. **消息通信**：优先使用 `SendMessage` 的 `message` 类型进行一对一通信，避免滥用 `broadcast`
3. **任务依赖**：使用 `addBlocks` 和 `addBlockedBy` 设置任务依赖关系
4. **优雅终止**：使用 `shutdown_request` 和 `shutdown_response` 优雅终止团队成员
5. **后台运行**：长时间任务使用 `run_in_background: true` 启动子代理

---

*文档生成时间：2026-03-02*
*团队示例：demo-team（成员 A、成员 B）*
