<template>
  <div class="visualizer">
    <!-- 顶部导航栏 -->
    <header class="header">
      <div class="header-left">
        <div class="logo">
          <span class="logo-icon">👥</span>
          <h1>Agent Teams <span class="highlight">Visualizer</span></h1>
        </div>
      </div>
      <div class="header-actions">
        <div class="auto-refresh" :class="{ active: autoRefresh }">
          <span class="status-indicator"></span>
          <label>
            <input type="checkbox" v-model="autoRefresh" />
            自动刷新
          </label>
          <span class="countdown" v-if="autoRefresh">{{ countdown }}s</span>
        </div>
        <button @click="refreshData" class="btn-refresh" :class="{ spinning: isRefreshing }">
          <span class="btn-icon">⟳</span>
          <span>刷新</span>
        </button>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 左侧：团队列表 -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>
            <span class="header-icon">💼</span>
            运行中的团队
          </h2>
          <span class="total-count">{{ teams.length }}</span>
        </div>
        <div class="team-list">
          <div
            v-for="team in teams"
            :key="team.name"
            :class="['team-card', { active: selectedTeam === team.name }]"
            @click="selectTeam(team.name)"
          >
            <div class="team-card-header">
              <div class="team-title">
                <span class="team-icon">🚀</span>
                <span class="team-name">{{ team.name }}</span>
              </div>
              <span class="team-status" :class="getTeamStatusClass(team)">
                {{ getTeamStatus(team) }}
              </span>
            </div>
            <p class="team-description">{{ team.description }}</p>
            <div class="team-meta">
              <div class="meta-item">
                <span class="meta-icon">👤</span>
                <span>{{ team.members?.length || 0 }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">📋</span>
                <span>{{ getTeamTaskCount(team.name) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">⚡</span>
                <span>{{ team.members?.filter(m => m.isActive).length || 0 }}</span>
              </div>
            </div>
          </div>
          <div v-if="teams.length === 0" class="empty-list">
            <span class="empty-icon">📭</span>
            <p>暂无运行中的团队</p>
          </div>
        </div>
      </aside>

      <!-- 中间：团队详情 -->
      <section class="team-detail">
        <div v-if="selectedTeamData" class="detail-content">
          <div class="detail-header">
            <div class="detail-title-section">
              <span class="team-icon-large">🚀</span>
              <div>
                <h2>{{ selectedTeamData.name }}</h2>
                <p class="detail-description">{{ selectedTeamData.description }}</p>
              </div>
            </div>
            <div class="detail-stats">
              <div class="mini-stat">
                <span class="mini-stat-value">{{ selectedTeamData.members?.length || 0 }}</span>
                <span class="mini-stat-label">成员</span>
              </div>
              <div class="mini-stat">
                <span class="mini-stat-value">{{ selectedTeamTasks.length }}</span>
                <span class="mini-stat-label">任务</span>
              </div>
              <div class="mini-stat">
                <span class="mini-stat-value">{{ totalInboxMessages }}</span>
                <span class="mini-stat-label">消息</span>
              </div>
            </div>
          </div>

          <!-- 团队成员 -->
          <div class="members-section">
            <div class="section-header" @click="toggleSection('members')">
              <div class="section-title">
                <span class="section-icon">👥</span>
                <h3>团队成员</h3>
                <span class="count-badge">{{ selectedTeamData.members?.length || 0 }}</span>
              </div>
              <button class="collapse-btn" :class="{ collapsed: collapsedSections.members }">
                <span class="chevron"></span>
              </button>
            </div>
            <transition name="expand">
              <div v-show="!collapsedSections.members" class="members-list">
                <div
                  v-for="member in selectedTeamData.members"
                  :key="member.agentId"
                  class="member-item"
                  :style="{ '--member-color': member.color }"
                >
                  <div class="member-left">
                    <div class="member-avatar" :style="{ backgroundColor: member.color }">
                      {{ getInitials(member.name) }}
                    </div>
                    <div class="member-info">
                      <div class="member-info-top">
                        <span class="member-name" :style="{ color: member.color }">{{ member.name }}</span>
                        <span class="member-type">{{ member.agentType }}</span>
                      </div>
                      <div class="member-info-bottom">
                        <span class="model-badge" :style="{ borderColor: member.color + '40', color: member.color }">{{ member.model }}</span>
                        <span v-if="member.tmuxPaneId" class="pane-badge">Pane: {{ member.tmuxPaneId }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="member-status-wrapper" :class="{ active: member.isActive }">
                    <div class="status-indicator">
                      <span class="status-dot"></span>
                      <span class="status-pulse"></span>
                    </div>
                    <span class="status-text">{{ member.isActive ? '工作中' : '空闲' }}</span>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- 协作消息 -->
          <div class="inboxes-section">
            <div class="section-header" @click="toggleSection('inboxes')">
              <div class="section-title">
                <span class="section-icon">💬</span>
                <h3>协作消息</h3>
                <span class="count-badge" :class="{ 'has-items': totalInboxMessages > 0 }">{{ totalInboxMessages }}</span>
              </div>
              <div class="section-actions-group">
                <button
                  v-if="totalInboxMessages > 0"
                  class="btn-play-graph"
                  @click.stop="openGraph"
                  title="播放协作图">
                  <span class="btn-icon">📊</span>
                  <span>协作图</span>
                </button>
                <button class="collapse-btn" :class="{ collapsed: collapsedSections.inboxes }">
                  <span class="chevron"></span>
                </button>
              </div>
            </div>
            <transition name="expand">
              <div v-show="!collapsedSections.inboxes" class="chat-window" ref="chatWindow">
                <div v-if="chatMessages.length === 0" class="empty-state-lg">
                  <span class="empty-state-icon">💭</span>
                  <p>暂无协作消息</p>
                  <span class="empty-state-hint">团队成员之间的消息将显示在这里</span>
                </div>
                <div v-else class="chat-messages">
                  <div
                    v-for="(msg, idx) in chatMessages"
                    :key="idx"
                    class="chat-message"
                    :class="['chat-from-' + getMemberId(msg.from), { unread: !msg.read }]"
                  >
                    <div class="chat-avatar" :style="{ backgroundColor: msg.color }">
                      {{ getInitials(msg.from) }}
                    </div>
                    <div class="chat-bubble">
                      <div class="chat-header-row">
                        <div class="chat-meta-left">
                          <span class="chat-sender" :style="{ color: msg.color }">{{ msg.from }}</span>
                          <span v-if="msg.to" class="chat-to">
                            <span class="to-arrow">→</span>
                            <span class="recipient-name" :style="{ color: getMemberColor(msg.to) }">{{ msg.to }}</span>
                          </span>
                          <span v-if="msg.toolName" class="tool-badge" :style="{ borderColor: msg.color + '40' }">
                            <span class="tool-icon">🔧</span>
                            {{ msg.toolName }}
                          </span>
                        </div>
                        <div class="chat-meta-right">
                          <span class="chat-time">{{ formatTime(msg.timestamp) }}</span>
                          <button
                            v-if="msg.text && msg.text.length > 100"
                            class="collapse-msg-btn"
                            @click="toggleMessageExpand(idx)"
                          >
                            {{ expandedMessages[idx] ? '收起' : '展开' }}
                          </button>
                        </div>
                      </div>
                      <div class="chat-text" :class="{ collapsed: !expandedMessages[idx] && msg.text && msg.text.length > 100 }">
                        {{ formatChatMessage(msg) }}
                      </div>
                      <div v-if="msg.summary" class="chat-summary">
                        <span class="summary-icon">📌</span>
                        {{ msg.summary }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- 团队任务 -->
          <div class="tasks-section">
            <div class="section-header" @click="toggleSection('tasks')">
              <div class="section-title">
                <span class="section-icon">✅</span>
                <h3>任务列表</h3>
                <span class="count-badge" :class="{ 'has-items': selectedTeamTasks.length > 0 }">{{ selectedTeamTasks.length }}</span>
              </div>
              <div class="section-actions">
                <span class="task-status-indicators">
                  <span class="task-dot pending" title="等待中"></span>
                  <span class="task-dot in_progress" title="进行中"></span>
                  <span class="task-dot completed" title="已完成"></span>
                </span>
                <button class="collapse-btn" :class="{ collapsed: collapsedSections.tasks }">
                  <span class="chevron"></span>
                </button>
              </div>
            </div>
            <transition name="expand">
              <div v-show="!collapsedSections.tasks" class="tasks-list">
                <div
                  v-for="task in selectedTeamTasks"
                  :key="task.id"
                  class="task-card"
                  :class="task.status"
                >
                  <div class="task-card-left">
                    <div class="task-status-indicator" :class="task.status"></div>
                    <div class="task-content">
                      <div class="task-header">
                        <span class="task-id">#{{ task.id }}</span>
                        <span class="task-status-badge" :class="task.status">{{ formatTaskStatus(task.status) }}</span>
                      </div>
                      <h4 class="task-subject">{{ task.subject }}</h4>
                      <p class="task-description">{{ task.description }}</p>
                    </div>
                  </div>
                  <div class="task-card-right">
                    <div class="task-meta">
                      <span v-if="task.owner" class="meta-tag owner">
                        <span class="meta-tag-icon">👤</span>
                        {{ task.owner }}
                      </span>
                      <span v-if="task.blocks?.length" class="meta-tag blocks">
                        <span class="meta-tag-icon">🔗</span>
                        {{ task.blocks.length }}
                      </span>
                      <span v-if="task.blockedBy?.length" class="meta-tag blocked-by" :title="'被阻塞：' + task.blockedBy.join(', ')">
                        <span class="meta-tag-icon">⛔</span>
                        {{ task.blockedBy.length }}
                      </span>
                    </div>
                  </div>
                </div>
                <div v-if="selectedTeamTasks.length === 0" class="empty-list">
                  <span class="empty-icon">📝</span>
                  <p>暂无相关任务</p>
                </div>
              </div>
            </transition>
          </div>
        </div>
        <div v-else class="empty-state-lg">
          <div class="empty-state-content">
            <span class="empty-state-icon-large">👈</span>
            <h3>选择团队查看详情</h3>
            <p>从左侧列表中选择一个运行中的团队</p>
          </div>
        </div>
      </section>

      <!-- 右侧：系统信息 -->
      <aside class="info-panel">
        <div class="panel-section">
          <div class="panel-header">
            <h3>
              <span class="panel-icon">📊</span>
              系统概览
            </h3>
          </div>
          <div class="stats-card">
            <div class="stat">
              <div class="stat-icon teams">👥</div>
              <span class="stat-value">{{ teams.length }}</span>
              <span class="stat-label">团队</span>
            </div>
            <div class="stat">
              <div class="stat-icon members">👤</div>
              <span class="stat-value">{{ totalMembers }}</span>
              <span class="stat-label">成员</span>
            </div>
            <div class="stat">
              <div class="stat-icon tasks">📋</div>
              <span class="stat-value">{{ totalTasks }}</span>
              <span class="stat-label">任务</span>
            </div>
            <div class="stat">
              <div class="stat-icon active">⚡</div>
              <span class="stat-value">{{ activeMembers }}</span>
              <span class="stat-label">活跃</span>
            </div>
          </div>
          <!-- 活跃度条 -->
          <div class="activity-bar">
            <div class="activity-label">
              <span>整体活跃度</span>
              <span class="activity-percent">{{ Math.round((activeMembers / Math.max(totalMembers, 1)) * 100) }}%</span>
            </div>
            <div class="activity-track">
              <div
                class="activity-fill"
                :style="{ width: Math.min((activeMembers / Math.max(totalMembers, 1)) * 100, 100) + '%' }"
                :class="{ low: (activeMembers / Math.max(totalMembers, 1)) < 0.33, medium: (activeMembers / Math.max(totalMembers, 1)) >= 0.33 && (activeMembers / Math.max(totalMembers, 1)) < 0.66 }"
              ></div>
            </div>
          </div>
          <!-- 数据源路径 -->
          <div class="data-source-section">
            <div class="data-source-label">
              <span class="source-icon">📁</span>
              <span>数据源路径</span>
            </div>
            <div class="data-source-input-wrapper" :class="{ editing: isEditingPath }">
              <input
                v-if="isEditingPath"
                ref="pathInput"
                v-model="editPath"
                type="text"
                class="data-source-input"
                placeholder="输入 .claude 目录路径"
                @keyup.enter="savePath"
                @keyup.escape="cancelEdit"
              />
              <div
                v-else
                class="data-source-display"
                @click="startEdit"
                title="点击编辑路径"
              >
                <span class="data-source-path">{{ claudePath || '未设置' }}</span>
                <span class="edit-icon">✏️</span>
              </div>
              <div v-if="isEditingPath" class="data-source-actions">
                <button class="btn-cancel-small" @click="cancelEdit">取消</button>
                <button class="btn-save-small" @click="savePath">保存</button>
              </div>
            </div>
            <p class="data-source-hint">点击路径可修改数据源目录</p>
          </div>
        </div>

        <div class="panel-section">
          <div class="panel-header">
            <h3>
              <span class="panel-icon">⚙️</span>
              配置信息
            </h3>
          </div>
          <div class="config-section">
            <div class="config-item" v-if="config">
              <div class="config-label">
                <span class="config-icon">🔹</span>
                teammateMode
              </div>
              <code class="config-value">{{ config.teammateMode || 'N/A' }}</code>
            </div>
            <div class="config-item" v-if="config?.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS">
              <div class="config-label">
                <span class="config-icon">🔸</span>
                实验性功能
              </div>
              <code class="config-value small">{{ config.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS }}</code>
            </div>
            <div v-if="!config" class="config-empty">
              <span>暂无配置信息</span>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <div class="panel-header">
            <h3>
              <span class="panel-icon">📁</span>
              数据源
            </h3>
          </div>
          <div class="data-source">
            <div class="path-display">
              <span class="path-icon">📂</span>
              <code>{{ claudePath }}</code>
            </div>
            <div class="path-status">
              <span class="status-dot online"></span>
              <span>已连接</span>
            </div>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      teams: [],
      tasks: [],
      config: null,
      sessions: [],
      sessionMapping: [],
      inboxes: {},
      selectedTeam: null,
      autoRefresh: false,
      countdown: 5,
      claudePath: '',
      isEditingPath: false,
      editPath: '',
      collapsedSections: {
        members: false,
        tasks: false,
        inboxes: false
      },
      expandedMessages: {},
      isRefreshing: false,
      Math: Math // 用于模板中的计算
    }
  },
  computed: {
    selectedTeamData() {
      return this.teams.find(t => t.name === this.selectedTeam)
    },
    selectedTeamTasks() {
      return this.tasks.filter(t => t.teamName === this.selectedTeam)
    },
    totalMembers() {
      return this.teams.reduce((sum, t) => sum + (t.members?.length || 0), 0)
    },
    totalTasks() {
      return this.tasks.length
    },
    activeMembers() {
      return this.teams.reduce((sum, t) => sum + (t.members?.filter(m => m.isActive).length || 0), 0)
    },
    totalInboxMessages() {
      return Object.values(this.inboxes).reduce((sum, messages) => sum + messages.length, 0)
    },
    chatMessages() {
      // 将所有收件箱的消息合并并按时间排序
      const allMessages = []
      const teamMembers = this.selectedTeamData?.members || []
      const memberNames = teamMembers.map(m => m.name)

      for (const [recipient, messages] of Object.entries(this.inboxes)) {
        for (const msg of messages) {
          // 推断接收者（根据文件inbox 或消息内容）
          let to = recipient
          // 如果是发给全组的或者是广播消息，to 为空
          if (!to || to === 'all') to = ''

          allMessages.push({
            ...msg,
            to: to !== msg.from ? to : ''
          })
        }
      }

      // 按时间戳正序排序（旧的在前，新的在后）
      return allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    }
  },
  methods: {
    async fetchTeams() {
      try {
        const response = await fetch('/api/teams')
        this.teams = await response.json()
      } catch (error) {
        console.error('获取团队数据失败:', error)
      }
    },
    async fetchTasks() {
      try {
        const response = await fetch('/api/tasks')
        this.tasks = await response.json()
      } catch (error) {
        console.error('获取任务数据失败:', error)
      }
    },
    async fetchTasksForTeam(teamName) {
      try {
        const response = await fetch(`/api/tasks/${teamName}`)
        const teamTasks = await response.json()
        // 更新 tasks 数组中属于该团队的任务
        const otherTeamTasks = this.tasks.filter(t => t.teamName !== teamName)
        this.tasks = [...otherTeamTasks, ...teamTasks]
      } catch (error) {
        console.error('获取团队任务数据失败:', error)
      }
    },
    async fetchConfig() {
      try {
        const response = await fetch('/api/config')
        this.config = await response.json()
      } catch (error) {
        console.error('获取配置失败:', error)
      }
    },
    async fetchClaudePath() {
      try {
        const response = await fetch('/api/claude-path')
        const data = await response.json()
        this.claudePath = data.path
      } catch (error) {
        console.error('获取数据源路径失败:', error)
      }
    },
    onPathSaved(newPath) {
      this.claudePath = newPath
      this.refreshData()
    },
    startEdit() {
      this.isEditingPath = true
      this.editPath = this.claudePath
      this.$nextTick(() => {
        this.$refs.pathInput?.focus()
      })
    },
    cancelEdit() {
      this.isEditingPath = false
      this.editPath = ''
    },
    async savePath() {
      const path = this.editPath.trim()
      if (!path) {
        alert('请输入路径')
        return
      }
      try {
        const response = await fetch('/api/claude-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path })
        })
        const result = await response.json()
        if (response.ok && result.success) {
          this.claudePath = path
          this.isEditingPath = false
          this.editPath = ''
          this.refreshData()
        } else {
          alert(result.error || '保存失败')
        }
      } catch (error) {
        alert('保存失败：' + error.message)
      }
    },
    async fetchSessions() {
      try {
        const response = await fetch('/api/session-team-mapping')
        this.sessionMapping = await response.json()
      } catch (error) {
        console.error('获取 session 数据失败:', error)
      }
    },
    async fetchInboxes() {
      if (!this.selectedTeam) return
      try {
        const response = await fetch(`/api/inboxes/${this.selectedTeam}`)
        this.inboxes = await response.json()
      } catch (error) {
        console.error('获取收件箱数据失败:', error)
      }
    },
    refreshData() {
      this.isRefreshing = true
      Promise.all([this.fetchTeams(), this.fetchTasks(), this.fetchConfig(), this.fetchSessions(), this.fetchInboxes()])
        .finally(() => {
          setTimeout(() => {
            this.isRefreshing = false
          }, 300)
        })
    },
    openGraph() {
      this.$router.push({ path: '/graph', query: { team: this.selectedTeam } })
    },
    selectTeam(name) {
      this.selectedTeam = name
      this.fetchInboxes()
      this.fetchTasksForTeam(name)
    },
    toggleSection(section) {
      this.collapsedSections[section] = !this.collapsedSections[section]
    },
    toggleMessageExpand(index) {
      this.expandedMessages[index] = !this.expandedMessages[index]
    },
    getTeamStatus(team) {
      const activeCount = team.members?.filter(m => m.isActive).length || 0
      if (activeCount === 0) return '空闲'
      if (activeCount < team.members.length / 2) return '部分活跃'
      return '活跃'
    },
    getTeamStatusClass(team) {
      const activeCount = team.members?.filter(m => m.isActive).length || 0
      if (activeCount === 0) return 'idle'
      if (activeCount < team.members.length / 2) return 'partial'
      return 'active'
    },
    getTeamTaskCount(teamName) {
      return this.tasks.filter(t => t.teamName === teamName).length
    },
    truncate(str, len) {
      if (!str) return ''
      return str.length > len ? str.slice(0, len) + '...' : str
    },
    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now - date

      // 如果是今天，显示时分秒
      if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }
      // 否则显示月 - 日 时分秒
      return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    },
    formatMessageText(text) {
      if (!text) return ''
      // 尝试解析 JSON 文本
      try {
        const parsed = JSON.parse(text)
        if (parsed.type === 'idle_notification') {
          return `[空闲通知] ${parsed.from} - ${parsed.idleReason || '可用'}`
        }
        if (parsed.type === 'permission_request') {
          return `[权限请求] ${parsed.agent_id} 请求使用 ${parsed.tool_name}`
        }
        return JSON.stringify(parsed).slice(0, 150)
      } catch {
        return text.slice(0, 200)
      }
    },
    formatChatMessage(msg) {
      if (!msg.text) return ''
      try {
        const parsed = JSON.parse(msg.text)
        if (parsed.type === 'idle_notification') {
          return `🟢 ${parsed.from} 变为${parsed.idleReason === 'available' ? '可用' : parsed.idleReason || '空闲'}状态`
        }
        if (parsed.type === 'permission_request') {
          return `🔐 ${parsed.agent_id} 请求使用 ${parsed.tool_name}${parsed.description ? ': ' + parsed.description : ''}`
        }
        if (parsed.summary) {
          return parsed.summary
        }
        return this.formatMessageText(msg.text)
      } catch {
        return msg.text
      }
    },
    getInitials(name) {
      if (!name) return '?'
      return name.charAt(0).toUpperCase()
    },
    getMemberId(name) {
      // 将中文名转换为 ID（用于 CSS 类名）
      if (!name) return 'unknown'
      return name.replace(/[\u4e00-\u9fa5]/g, (c) => {
        // 简单映射：取拼音首字母（近似）
        const pinyinMap = {
          '产': 'p', '品': 'p', '经': 'j', '理': 'l',
          '架': 'j', '构': 'g', '师': 's',
          '测': 'c', '试': 's', '工': 'g', '程': 'c',
          '全': 'q', '栈': 'z', '工': 'g', '程': 'c',
          '交': 'j', '互': 'h', '设': 's', '计': 'j',
          '评': 'p', '审': 's', '人': 'r',
          '需': 'x', '求': 'q', '调': 'd', '研': 'y', '员': 'y',
          '团': 't', '队': 'd', '领': 'l', '导': 'd',
          '用': 'y', '户': 'h'
        }
        return pinyinMap[c] || 'm'
      })
    },
    getMemberColor(name) {
      const member = this.selectedTeamData?.members?.find(m => m.name === name)
      return member?.color || '#888'
    },
    formatTaskStatus(status) {
      const statusMap = {
        'pending': '等待中',
        'in_progress': '进行中',
        'completed': '已完成'
      }
      return statusMap[status] || status
    }
  },
  mounted() {
    this.fetchClaudePath()
    this.refreshData()

    setInterval(() => {
      if (this.autoRefresh) {
        this.countdown--
        if (this.countdown <= 0) {
          this.refreshData()
          this.countdown = 5
        }
      }
    }, 1000)
  },
  watch: {
    selectedTeam() {
      this.fetchInboxes()
      this.fetchTasksForTeam(this.selectedTeam)
    },
    chatMessages() {
      // 滚动到底部（因为消息按正序排列，新消息在后面）
      this.$nextTick(() => {
        const chatWindow = this.$refs.chatWindow
        if (chatWindow) {
          chatWindow.scrollTop = chatWindow.scrollHeight
        }
      })
    }
  }
}
</script>

<style>
/* ==================== 全局变量 ==================== */
:root {
  /* 主色调 - 低调高区分度 */
  --primary: #3b82f6;
  --primary-light: #2563eb;
  --primary-dark: #1d4ed8;
  --primary-bg: rgba(59, 130, 246, 0.1);

  /* 状态色 */
  --success: #16a34a;
  --success-bg: rgba(22, 163, 74, 0.1);
  --warning: #ca8a04;
  --warning-bg: rgba(202, 138, 4, 0.1);
  --info: #3b82f6;
  --info-bg: rgba(59, 130, 246, 0.1);
  --danger: #dc2626;
  --danger-bg: rgba(220, 38, 38, 0.1);

  /* 背景色 - 白色主题 */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --bg-card: #ffffff;
  --bg-hover: #f1f5f9;

  /* 边框 */
  --border-light: #e2e8f0;
  --border-medium: #cbd5e1;

  /* 文字 */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;

  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.1);
  --shadow-glow: 0 0 20px rgba(59, 130, 246, 0.15);

  /* 圆角 */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  /* 成员颜色 - 深色高对比度，适合白色背景 */
  --member-red: #dc2626;
  --member-orange: #ea580c;
  --member-amber: #ca8a04;
  --member-green: #16a34a;
  --member-teal: #0d9488;
  --member-cyan: #0891b2;
  --member-blue: #2563eb;
  --member-indigo: #4f46e5;
  --member-purple: #7c3aed;
  --member-pink: #db2777;
}

/* ==================== 基础样式 ==================== */
.visualizer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-secondary);
  overflow: hidden;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--border-medium);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ==================== 顶部导航栏 ==================== */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  height: 64px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 2rem;
  filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.5));
}

.logo h1 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.logo .highlight {
  background: linear-gradient(135deg, var(--primary-light), var(--primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.auto-refresh {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
}

.auto-refresh.active {
  border-color: var(--success);
  background: var(--success-bg);
}

.auto-refresh .status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: background 0.3s ease;
}

.auto-refresh.active .status-indicator {
  background: var(--success);
  box-shadow: 0 0 8px var(--success);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.auto-refresh label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.auto-refresh input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--success);
}

.auto-refresh .countdown {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--success);
  background: rgba(16, 185, 129, 0.2);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.btn-refresh {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-refresh:hover {
  background: var(--bg-hover);
  border-color: var(--border-medium);
  color: var(--text-primary);
}

.btn-refresh:active {
  transform: scale(0.98);
}

.btn-refresh.spinning .btn-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.btn-icon {
  font-size: 1.1rem;
}

/* ==================== 主内容区 ==================== */
.main-content {
  display: grid;
  grid-template-columns: 300px 1fr 260px;
  flex: 1;
  overflow: hidden;
  gap: 1px;
  background: var(--border-light);
}

/* ==================== 左侧边栏 ==================== */
.sidebar {
  background: var(--bg-primary);
  border-right: 1px solid var(--border-light);
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0.5rem;
  margin-bottom: 0.75rem;
}

.sidebar-header h2 {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-icon {
  font-size: 1rem;
}

.total-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary-light);
  background: rgba(99, 102, 241, 0.15);
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
}

.team-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.team-card {
  padding: 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.team-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(180deg, var(--primary), var(--primary-dark));
  opacity: 0;
  transition: opacity 0.25s ease;
}

.team-card:hover {
  background: var(--bg-hover);
  border-color: var(--border-medium);
  transform: translateX(2px);
  box-shadow: var(--shadow-md);
}

.team-card:hover::before {
  opacity: 1;
}

.team-card.active {
  background: var(--primary-bg);
  border-color: var(--primary);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.15);
}

.team-card.active::before {
  opacity: 1;
}

.team-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}

.team-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.team-icon {
  font-size: 1.1rem;
}

.team-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.team-status {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.team-status.idle {
  background: rgba(113, 113, 122, 0.2);
  color: var(--text-muted);
}

.team-status.partial {
  background: var(--warning-bg);
  color: var(--warning);
}

.team-status.active {
  background: var(--success-bg);
  color: var(--success);
}

.team-description {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.team-meta {
  display: flex;
  gap: 0.75rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.meta-icon {
  font-size: 0.85rem;
}

.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  opacity: 0.6;
}

.empty-list p {
  font-size: 0.9rem;
}

/* ==================== 中间详情区 ==================== */
.team-detail {
  background: var(--bg-primary);
  padding: 1.5rem;
  overflow-y: auto;
}

.detail-content {
  max-width: 900px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  margin-bottom: 1.5rem;
}

.detail-title-section {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.team-icon-large {
  font-size: 2.5rem;
  filter: drop-shadow(0 4px 12px rgba(99, 102, 241, 0.3));
}

.detail-title-section h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.35rem;
  letter-spacing: -0.02em;
}

.detail-description {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.detail-stats {
  display: flex;
  gap: 1.25rem;
}

.mini-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  min-width: 70px;
}

.mini-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-light);
  line-height: 1;
}

.mini-stat-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ==================== 区块通用样式 ==================== */
.members-section,
.inboxes-section,
.tasks-section {
  margin-bottom: 1.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1.25rem;
  background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%);
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background 0.2s ease;
}

.section-header:hover {
  background: var(--bg-hover);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.section-icon {
  font-size: 1.1rem;
}

.section-title h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.count-badge {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  border: 1px solid var(--border-light);
  transition: all 0.2s ease;
}

.count-badge.has-items {
  color: var(--primary-light);
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.2);
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-actions-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-play-graph {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
}

.btn-play-graph:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
}

.btn-play-graph .btn-icon {
  font-size: 14px;
}

.task-status-indicators {
  display: flex;
  gap: 0.35rem;
}

.task-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
}

.task-dot.pending {
  background: var(--warning);
  box-shadow: 0 0 6px var(--warning);
}

.task-dot.in_progress {
  background: var(--info);
  box-shadow: 0 0 6px var(--info);
}

.task-dot.completed {
  background: var(--success);
  box-shadow: 0 0 6px var(--success);
}

.collapse-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.collapse-btn:hover {
  background: var(--bg-hover);
  transform: scale(1.05);
}

.chevron {
  width: 10px;
  height: 10px;
  border-right: 2px solid var(--text-muted);
  border-bottom: 2px solid var(--text-muted);
  transform: rotate(45deg);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.collapse-btn.collapsed .chevron {
  transform: rotate(-45deg);
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

/* ==================== 成员列表 ==================== */
.members-list {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}

.member-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background: var(--member-color);
}

.member-item:hover {
  background: var(--bg-hover);
  border-color: var(--member-color);
  transform: translateX(4px);
  box-shadow: var(--shadow-md);
}

.member-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.95rem;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-info-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.member-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.member-type {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.member-info-bottom {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.model-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  background: rgba(59, 130, 246, 0.08);
  border-radius: 4px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  font-weight: 500;
  color: var(--primary-light);
}

.pane-badge {
  font-size: 0.65rem;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--border-light);
}

.member-status-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  background: var(--bg-tertiary);
  border-radius: 20px;
  transition: all 0.25s ease;
}

.member-status-wrapper.active {
  background: var(--success-bg);
}

.status-indicator {
  position: relative;
  display: flex;
  align-items: center;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: background 0.25s ease;
}

.member-status-wrapper.active .status-dot {
  background: var(--success);
}

.status-pulse {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  animation: statusPulse 2s infinite;
  opacity: 0;
}

.member-status-wrapper.active .status-pulse {
  animation: statusPulse 2s infinite;
}

@keyframes statusPulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(3);
    opacity: 0;
  }
}

.status-text {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.member-status-wrapper.active .status-text {
  color: var(--success);
}

/* ==================== 聊天窗口 ==================== */
.chat-window {
  max-height: 450px;
  overflow-y: auto;
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: var(--radius-md);
}

.chat-messages {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chat-message {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  animation: slideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.chat-message.unread {
  background: rgba(99, 102, 241, 0.08);
  border-radius: var(--radius-md);
  padding: 0.5rem;
  margin: -0.5rem;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.chat-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.chat-bubble {
  flex: 1;
  min-width: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 0 var(--radius-lg) var(--radius-lg) var(--radius-lg);
  padding: 0.75rem 1rem;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.chat-message:hover .chat-bubble {
  border-color: var(--border-medium);
  background: var(--bg-hover);
  box-shadow: var(--shadow-md);
}

.chat-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chat-meta-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chat-sender {
  font-weight: 600;
  font-size: 0.9rem;
}

.chat-to {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.to-arrow {
  color: var(--text-muted);
  font-weight: 600;
}

.tool-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.65rem;
  padding: 0.15rem 0.5rem;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 4px;
  color: var(--primary-light);
  font-weight: 500;
}

.tool-icon {
  font-size: 0.75rem;
}

.chat-meta-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.chat-time {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.collapse-msg-btn {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.collapse-msg-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border-medium);
}

.chat-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-text.collapsed {
  max-height: 4.5rem;
  overflow: hidden;
  position: relative;
}

.chat-text.collapsed::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2.5rem;
  background: linear-gradient(transparent, var(--bg-card));
}

.chat-summary {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--warning);
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--border-light);
}

.summary-icon {
  font-size: 0.85rem;
}

/* 空状态 */
.empty-state-lg {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  color: var(--text-muted);
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.empty-state-icon-large {
  font-size: 3.5rem;
  margin-bottom: 0.5rem;
  filter: grayscale(0.5);
}

.empty-state-lg h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0;
}

.empty-state-lg p {
  font-size: 0.85rem;
  margin: 0;
}

.empty-state-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
}

.empty-state-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  opacity: 0.6;
}

/* ==================== 任务列表 ==================== */
.tasks-list {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.task-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.task-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  transition: width 0.25s ease;
}

.task-card.pending::before {
  background: var(--warning);
}

.task-card.in_progress::before {
  background: var(--info);
}

.task-card.completed::before {
  background: var(--success);
}

.task-card:hover {
  background: var(--bg-hover);
  border-color: var(--border-medium);
  transform: translateX(4px);
  box-shadow: var(--shadow-md);
}

.task-card-left {
  display: flex;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.task-status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 0.25rem;
  box-shadow: 0 0 8px currentColor;
}

.task-status-indicator.pending {
  background: var(--warning);
  color: var(--warning);
}

.task-status-indicator.in_progress {
  background: var(--info);
  color: var(--info);
}

.task-status-indicator.completed {
  background: var(--success);
  color: var(--success);
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.task-id {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 600;
}

.task-status-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.task-status-badge.pending {
  background: var(--warning-bg);
  color: var(--warning);
}

.task-status-badge.in_progress {
  background: var(--info-bg);
  color: var(--info);
}

.task-status-badge.completed {
  background: var(--success-bg);
  color: var(--success);
}

.task-subject {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.35rem;
  line-height: 1.4;
}

.task-description {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.task-card-right {
  flex-shrink: 0;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.meta-tag {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  background: var(--bg-tertiary);
  border-radius: 4px;
  color: var(--text-secondary);
}

.meta-tag-icon {
  font-size: 0.75rem;
}

.meta-tag.owner {
  color: var(--primary-light);
  background: rgba(99, 102, 241, 0.15);
}

.meta-tag.blocks {
  color: var(--info);
  background: rgba(59, 130, 246, 0.15);
}

.meta-tag.blocked-by {
  color: var(--danger);
  background: var(--danger-bg);
}

/* ==================== 右侧信息面板 ==================== */
.info-panel {
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-light);
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.panel-section {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.panel-header {
  margin-bottom: 0.75rem;
}

.panel-header h3 {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.panel-icon {
  font-size: 1rem;
}

/* 统计卡片 */
.stats-card {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 0.5rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  transition: transform 0.2s ease;
  border: 1px solid var(--border-light);
}

.stat:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-md);
}

.stat-icon {
  font-size: 1.25rem;
  margin-bottom: 0.35rem;
}

.stat-icon.teams { filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.4)); }
.stat-icon.members { filter: drop-shadow(0 0 6px rgba(22, 163, 74, 0.4)); }
.stat-icon.tasks { filter: drop-shadow(0 0 6px rgba(202, 138, 4, 0.4)); }
.stat-icon.active { filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.4)); }

.stat-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.stat-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* 活跃度条 */
.activity-bar {
  margin-top: 0.75rem;
}

.activity-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.activity-percent {
  font-weight: 700;
  color: var(--primary-light);
}

.activity-track {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.activity-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--success), var(--success));
  border-radius: 4px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.activity-fill.low {
  background: linear-gradient(90deg, var(--danger), var(--warning));
}

.activity-fill.medium {
  background: linear-gradient(90deg, var(--warning), var(--info));
}

/* 数据源路径 */
.data-source-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-light);
}

.data-source-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.source-icon {
  font-size: 1rem;
}

.data-source-input-wrapper {
  position: relative;
}

.data-source-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.data-source-display:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
}

.data-source-path {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.75rem;
  color: var(--text-secondary);
  word-break: break-all;
  flex: 1;
  margin-right: 0.5rem;
}

.edit-icon {
  font-size: 0.9rem;
  opacity: 0.7;
  flex-shrink: 0;
}

.data-source-input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.75rem;
  border: 2px solid var(--primary);
  border-radius: var(--radius-md);
  background: white;
  color: var(--text-primary);
  outline: none;
  box-sizing: border-box;
}

.data-source-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  justify-content: flex-end;
}

.btn-cancel-small,
.btn-save-small {
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.btn-cancel-small {
  background: white;
  border-color: var(--border-medium);
  color: var(--text-secondary);
}

.btn-cancel-small:hover {
  background: var(--bg-tertiary);
}

.btn-save-small {
  background: var(--primary);
  color: white;
}

.btn-save-small:hover {
  background: var(--primary-dark);
}

.data-source-hint {
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* 配置信息 */
.config-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.config-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 500;
}

.config-icon {
  font-size: 0.75rem;
}

.config-value {
  font-size: 0.7rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--radius-sm);
  color: var(--primary-light);
  font-family: 'SF Mono', Monaco, monospace;
  word-break: break-all;
}

.config-value.small {
  font-size: 0.65rem;
}

.config-empty {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
  padding: 0.5rem;
}

/* 数据源 */
.data-source {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.path-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--radius-sm);
}

.path-icon {
  font-size: 0.9rem;
}

.path-display code {
  font-size: 0.7rem;
  color: var(--primary-light);
  font-family: 'SF Mono', Monaco, monospace;
  word-break: break-all;
}

.path-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--success);
}

.path-status .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 6px var(--success);
}
</style>
