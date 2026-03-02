<template>
  <div class="chat-large-view">
    <!-- 顶部导航栏 -->
    <header class="chat-header">
      <div class="header-left">
        <button class="btn-back" @click="goBack" title="返回">
          <span>←</span>
          <span>返回团队</span>
        </button>
        <h1 v-if="teamData">
          <span class="team-icon">💬</span>
          {{ teamData.name }} - 协作消息
        </h1>
      </div>
      <div class="header-actions">
        <button @click="scrollToBottom" class="btn-scroll" title="滚动到底部">
          <span class="btn-icon">⬇</span>
          <span>底部</span>
        </button>
        <button @click="refreshData" class="btn-refresh" :class="{ spinning: isRefreshing }">
          <span class="btn-icon">⟳</span>
          <span>刷新</span>
        </button>
      </div>
    </header>

    <!-- 消息列表 -->
    <main class="chat-main">
      <div class="chat-container" ref="chatContainer">
        <div v-if="messages.length === 0" class="empty-state">
          <span class="empty-icon">💭</span>
          <p>暂无协作消息</p>
          <span class="empty-hint">团队成员之间的消息将显示在这里</span>
        </div>

        <div v-else class="chat-messages">
          <div
            v-for="(msg, idx) in messages"
            :key="idx"
            class="chat-message"
            :class="['chat-from-' + getMemberId(msg.from), { unread: !msg.read }]"
          >
            <div class="chat-avatar" :style="{ backgroundColor: msg.color }">
              {{ getInitials(msg.from) }}
            </div>
            <div class="chat-bubble">
              <div class="chat-header-row">
                <span class="chat-from">{{ msg.from }}</span>
                <span class="chat-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
              <div v-if="msg.to" class="chat-to">
                <span>给</span>
                <span class="to-name" :style="{ color: getMemberColor(msg.to) }">{{ msg.to }}</span>
              </div>
              <div class="chat-content">{{ formatMessageContent(msg.text) }}</div>
              <div v-if="msg.toolName" class="chat-tool">
                <span class="tool-badge">{{ msg.toolName }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 右侧：消息统计 -->
    <aside class="stats-panel">
      <h3>
        <span class="panel-icon">📊</span>
        消息统计
      </h3>
      <div class="stats-list">
        <div class="stat-item">
          <span class="stat-label">总消息数</span>
          <span class="stat-value">{{ messages.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">时间跨度</span>
          <span class="stat-value">{{ timeSpan }}</span>
        </div>
      </div>

      <h4>成员消息数</h4>
      <div class="member-stats">
        <div
          v-for="member in teamData?.members || []"
          :key="member.name"
          class="member-stat"
        >
          <div class="member-stat-header">
            <div class="member-stat-avatar" :style="{ backgroundColor: member.color }">
              {{ getInitials(member.name) }}
            </div>
            <span class="member-stat-name">{{ member.name }}</span>
          </div>
          <div class="member-stat-count">{{ getMemberMessageCount(member.name) }} 条</div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script>
export default {
  name: 'ChatLargeView',
  data() {
    return {
      teamData: null,
      messages: [],
      teamName: '',
      isRefreshing: false,
      memberMessageCount: {}
    }
  },
  computed: {
    timeSpan() {
      if (this.messages.length < 2) return '-'
      const first = new Date(this.messages[0].timestamp)
      const last = new Date(this.messages[this.messages.length - 1].timestamp)
      const diff = last - first
      if (diff < 60000) return '不到 1 分钟'
      if (diff < 3600000) return Math.round(diff / 60000) + ' 分钟'
      return Math.round(diff / 3600000) + ' 小时'
    }
  },
  mounted() {
    this.teamName = this.$route.query.team || ''
    this.loadData()
  },
  methods: {
    async loadData() {
      try {
        const teamsRes = await fetch('/api/teams')
        const teams = await teamsRes.json()
        this.teamData = teams.find(t => t.name === this.teamName) || null

        const inboxesRes = await fetch(`/api/inboxes/${this.teamName}`)
        const inboxes = await inboxesRes.json()

        const allMessages = []
        for (const [recipient, msgs] of Object.entries(inboxes)) {
          for (const msg of msgs) {
            let to = recipient
            if (!to || to === 'all') to = ''
            const member = this.teamData?.members?.find(m => m.name === msg.from)
            allMessages.push({
              ...msg,
              to: to !== msg.from ? to : '',
              color: member?.color || '#888'
            })
          }
        }
        this.messages = allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

        this.memberMessageCount = {}
        this.messages.forEach(msg => {
          this.memberMessageCount[msg.from] = (this.memberMessageCount[msg.from] || 0) + 1
        })
      } catch (error) {
        console.error('加载数据失败:', error)
      }
    },

    goBack() {
      this.$router.push('/')
    },

    refreshData() {
      this.isRefreshing = true
      this.loadData().finally(() => {
        setTimeout(() => {
          this.isRefreshing = false
        }, 300)
      })
    },

    scrollToBottom() {
      const container = this.$refs.chatContainer
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
      }
    },

    getInitials(name) {
      if (!name) return '?'
      return name.charAt(0).toUpperCase()
    },

    getMemberId(name) {
      const index = this.teamData?.members?.findIndex(m => m.name === name)
      return index !== undefined && index >= 0 ? index : 0
    },

    getMemberColor(name) {
      const member = this.teamData?.members?.find(m => m.name === name)
      return member?.color || '#888'
    },

    getMemberMessageCount(name) {
      return this.memberMessageCount[name] || 0
    },

    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },

    formatMessageContent(text) {
      if (!text) return '无内容'
      try {
        const parsed = JSON.parse(text)
        if (parsed.summary) return parsed.summary
        return JSON.stringify(parsed, null, 2).slice(0, 500)
      } catch {
        return text.slice(0, 500)
      }
    }
  }
}
</script>

<style scoped>
.chat-large-view {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f1f5f9;
  border: none;
  border-radius: 6px;
  color: #475569;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #e2e8f0;
}

.btn-back span:first-child {
  font-size: 18px;
}

.chat-header h1 {
  font-size: 18px;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.team-icon {
  font-size: 20px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-scroll,
.btn-refresh {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-scroll:hover,
.btn-refresh:hover {
  background: #f1f5f9;
}

.btn-refresh.spinning .btn-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.chat-main {
  flex: 1;
  overflow: hidden;
  display: flex;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-hint {
  font-size: 14px;
  color: #94a3b8;
}

.chat-messages {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.chat-message {
  display: flex;
  gap: 12px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-message.unread {
  background: rgba(59, 130, 246, 0.05);
  border-radius: 8px;
  padding: 8px;
  margin: -8px;
}

.chat-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 18px;
  flex-shrink: 0;
}

.chat-bubble {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.chat-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.chat-from {
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
}

.chat-time {
  font-size: 12px;
  color: #94a3b8;
}

.chat-to {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}

.to-name {
  font-weight: 500;
  margin-left: 4px;
}

.chat-content {
  font-size: 14px;
  color: #334155;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.chat-tool {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.tool-badge {
  display: inline-block;
  padding: 4px 10px;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

/* 统计面板 */
.stats-panel {
  width: 280px;
  background: #fff;
  border-left: 1px solid #e2e8f0;
  padding: 20px;
  overflow-y: auto;
}

.stats-panel h3,
.stats-panel h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #1e293b;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.stats-panel h4 {
  margin-top: 24px;
  font-size: 13px;
}

.panel-icon {
  font-size: 16px;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.member-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f8fafc;
  border-radius: 8px;
}

.member-stat-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.member-stat-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}

.member-stat-name {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}

.member-stat-count {
  font-size: 12px;
  color: #64748b;
}
</style>
