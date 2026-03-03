# Agent Teams 团队成员工具文档

本文档整理了 Claude Code 中团队成员（Agent Team Members）使用的团队协作工具。

---

## 1. SendMessage

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

## 2. TaskCreate

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

## 3. TaskList

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

## 4. TaskGet

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

## 5. TaskUpdate

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

## 6. Agent

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

## 团队成员工作流程

```
┌─────────────────────────────────────────────────────────────┐
│                    Team Lead (协调员)                        │
│              使用 TaskCreate/TaskUpdate 分配任务              │
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

成员典型操作流程：
1. TaskList → 查看可用任务
2. TaskGet → 获取任务详情
3. TaskUpdate → 认领任务 (设置 owner 和 status=in_progress)
4. 执行任务...
5. TaskUpdate → 完成任务 (设置 status=completed)
6. SendMessage → 向协调员汇报
```

---

## 成员最佳实践

1. **任务认领**：从 TaskList 找到无 owner 且无 blockedBy 的任务，使用 TaskUpdate 设置 owner 为自己
2. **任务顺序**：优先处理 ID 较小的任务，因为早期任务通常为后续任务设置上下文
3. **任务更新**：开始工作前设置 `status: in_progress`，完成后设置 `status: completed`
4. **消息通信**：使用 SendMessage 与队友协调，一对一用 `message`，紧急全员通知用 `broadcast`
5. **处理阻塞**：如果任务被 blockedBy，先处理依赖任务或通知依赖任务的负责人
6. **优雅退出**：收到 shutdown_request 时，如果完成任务则 approve，否则说明原因 reject
7. **避免重复**：使用 TaskList 检查是否有其他成员已在处理类似任务

---

## 状态流转

```
pending → in_progress → completed
                      → deleted (任务不再相关)
```

---

*文档生成时间：2026-03-02*
*团队成员示例：成员 A (blue)、成员 B (green)*
