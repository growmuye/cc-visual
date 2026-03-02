<template>
  <div class="graph-view">
    <!-- 顶部导航栏 -->
    <header class="graph-header">
      <div class="header-left">
        <button class="btn-back" @click="goBack" title="返回">
          <span>←</span>
          <span>返回团队</span>
        </button>
        <h1 v-if="teamData">
          <span class="team-icon">🚀</span>
          {{ teamData.name }} - 协作过程
        </h1>
      </div>
      <div class="header-actions">
        <button @click="refreshData" class="btn-refresh" :class="{ spinning: isRefreshing }">
          <span class="btn-icon">⟳</span>
          <span>刷新</span>
        </button>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="graph-content">
      <!-- 左侧：成员列表 -->
      <aside class="members-panel">
        <h3>
          <span class="panel-icon">👥</span>
          团队成员
        </h3>
        <div class="member-list">
          <div
            v-for="member in teamData?.members || []"
            :key="member.name"
            class="member-item"
            :class="{ active: member.isActive }"
          >
            <div class="member-avatar" :style="{ backgroundColor: member.color }">
              {{ getInitials(member.name) }}
            </div>
            <div class="member-info">
              <div class="member-name">{{ member.name }}</div>
              <div class="member-status" :class="member.isActive ? 'active' : 'idle'">
                {{ member.isActive ? '活跃' : '空闲' }}
              </div>
            </div>
            <div class="member-message-count">
              {{ getMemberMessageCount(member.name) }} 条
            </div>
          </div>
        </div>

        <!-- 消息统计 -->
        <div class="message-stats">
          <div class="stat-item">
            <span class="stat-label">总消息数</span>
            <span class="stat-value">{{ messages.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">时间跨度</span>
            <span class="stat-value">{{ timeSpan }}</span>
          </div>
        </div>
      </aside>

      <!-- 中间：Graph 画布 -->
      <main class="graph-main">
        <div
          class="graph-canvas-container"
          @mouseenter="handleMouseEnter"
          @mouseleave="handleMouseLeave"
        >
          <svg ref="svgRef" class="graph-canvas"></svg>

          <!-- 悬浮提示 -->
          <div v-if="tooltip.visible"
            class="graph-tooltip"
            :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
            <div class="tooltip-title">{{ tooltip.title }}</div>
            <div class="tooltip-content">{{ tooltip.content }}</div>
          </div>

          <!-- 空状态 -->
          <div v-if="messages.length === 0" class="empty-state">
            <span class="empty-icon">📭</span>
            <p>暂无协作消息</p>
          </div>
        </div>

        <!-- 播放控制栏 -->
        <div class="graph-controls">
          <div class="playback-controls">
            <button
              class="btn-control"
              @click="previousMessage"
              :disabled="currentIndex <= 0"
              title="上一条消息">
              <span class="icon">⏮</span>
            </button>
            <button
              class="btn-control btn-play"
              @click="togglePlay"
              :title="isPlaying ? '暂停' : '播放'">
              <span class="icon">{{ isPlaying ? '⏸' : '▶️' }}</span>
            </button>
            <button
              class="btn-control"
              @click="nextMessage"
              :disabled="currentIndex >= messages.length - 1"
              title="下一条消息">
              <span class="icon">⏭</span>
            </button>
          </div>

          <div class="progress-section">
            <input
              type="range"
              class="progress-slider"
              :min="0"
              :max="Math.max(messages.length - 1, 0)"
              :value="currentIndex"
              @input="handleProgressInput"
              @change="handleProgressChange"
            />
            <span class="progress-text">{{ messages.length > 0 ? currentIndex + 1 : 0 }} / {{ messages.length }}</span>
          </div>

          <div class="speed-controls">
            <span class="speed-label">速度:</span>
            <button
              v-for="speed in speeds"
              :key="speed"
              :class="['btn-speed', { active: currentSpeed === speed }]"
              @click="currentSpeed = speed">
              {{ speed }}x
            </button>
          </div>
        </div>
      </main>

      <!-- 右侧：消息详情 -->
      <aside class="message-panel">
        <h3>
          <span class="panel-icon">📨</span>
          消息详情
        </h3>
        <div class="message-detail">
          <div v-if="currentMessage" class="message-card">
            <div class="message-header">
              <span class="message-index">#{{ currentIndex + 1 }}</span>
              <span class="message-time">{{ formatTime(currentMessage.timestamp) }}</span>
            </div>
            <div class="message-body">
              <div class="message-from">
                <span class="label">发送者</span>
                <span class="value" :style="{ color: getMemberColor(currentMessage.from) }">
                  {{ currentMessage.from }}
                </span>
              </div>
              <div v-if="currentMessage.to" class="message-to">
                <span class="label">接收者</span>
                <span class="value" :style="{ color: getMemberColor(currentMessage.to) }">
                  {{ currentMessage.to }}
                </span>
              </div>
              <div class="message-content">
                <span class="label">内容</span>
                <div class="content-text">{{ formatMessageContent(currentMessage.text) }}</div>
              </div>
              <div v-if="currentMessage.toolName" class="message-tool">
                <span class="label">工具</span>
                <span class="tool-badge">{{ currentMessage.toolName }}</span>
              </div>
              <div v-if="currentMessage.summary" class="message-summary">
                <span class="label">摘要</span>
                <p>{{ currentMessage.summary }}</p>
              </div>
            </div>
          </div>
          <div v-else class="empty-detail">
            <span class="empty-icon">👈</span>
            <p>播放消息或拖动进度条查看详情</p>
          </div>
        </div>

        <!-- 消息列表 -->
        <div class="message-list-panel">
          <h4>全部消息</h4>
          <div class="mini-message-list">
            <div
              v-for="(msg, idx) in messages"
              :key="idx"
              :class="['mini-message', { active: idx === currentIndex }]"
              @click="jumpToMessage(idx)"
            >
              <div class="mini-message-avatar" :style="{ backgroundColor: getMemberColor(msg.from) }">
                {{ getInitials(msg.from) }}
              </div>
              <div class="mini-message-content">
                <div class="mini-message-header">
                  <span class="mini-message-from">{{ msg.from }}</span>
                  <span class="mini-message-time">{{ formatShortTime(msg.timestamp) }}</span>
                </div>
                <div class="mini-message-text">{{ truncateMessage(msg.text) }}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3'

export default {
  name: 'GraphView',
  data() {
    return {
      // 数据
      teamData: null,
      messages: [],
      teamName: '',

      // D3 相关
      svg: null,
      nodes: [],
      width: 900,
      height: 600,
      radius: 220,

      // 播放状态
      isPlaying: false,
      currentIndex: 0,
      currentSpeed: 1,
      speeds: [0.5, 1, 2, 5],
      playTimer: null,

      // 交互状态
      isHovering: false,
      tooltip: {
        visible: false,
        x: 0,
        y: 0,
        title: '',
        content: ''
      },

      // 刷新状态
      isRefreshing: false,

      // 消息统计
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
    },
    currentMessage() {
      return this.messages[this.currentIndex]
    }
  },
  watch: {
    currentSpeed() {
      if (this.isPlaying) {
        this.stopPlay()
        this.startPlay()
      }
    }
  },
  mounted() {
    this.teamName = this.$route.query.team || ''
    this.loadData()
    window.addEventListener('mouseup', this.handleDragEnd)
    window.addEventListener('mousemove', this.handleDrag)
  },
  beforeUnmount() {
    this.stopPlay()
    window.removeEventListener('mouseup', this.handleDragEnd)
    window.removeEventListener('mousemove', this.handleDrag)
  },
  methods: {
    async loadData() {
      try {
        // 获取团队列表
        const teamsRes = await fetch('/api/teams')
        const teams = await teamsRes.json()
        this.teamData = teams.find(t => t.name === this.teamName) || null

        // 获取协作消息
        const inboxesRes = await fetch(`/api/inboxes/${this.teamName}`)
        const inboxes = await inboxesRes.json()

        // 处理消息数据
        const allMessages = []
        for (const [recipient, msgs] of Object.entries(inboxes)) {
          for (const msg of msgs) {
            let to = recipient
            if (!to || to === 'all') to = ''
            allMessages.push({
              ...msg,
              to: to !== msg.from ? to : '',
              id: recipient + '-' + msg.timestamp
            })
          }
        }
        this.messages = allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

        // 统计成员消息数
        this.memberMessageCount = {}
        this.messages.forEach(msg => {
          this.memberMessageCount[msg.from] = (this.memberMessageCount[msg.from] || 0) + 1
        })

        // 初始化 Graph
        this.initGraph()
      } catch (error) {
        console.error('加载数据失败:', error)
      }
    },

    initGraph() {
      if (!this.$refs.svgRef || !this.teamData?.members?.length) return

      d3.select(this.$refs.svgRef).selectAll('*').remove()

      this.nodes = this.teamData.members.map((m, i) => ({
        id: m.name,
        label: m.name,
        color: m.color || '#475569',
        isActive: m.isActive || false,
        index: i
      }))

      this.setupSVG()
      this.setupSimulation()
      this.renderNodes()
    },

    setupSVG() {
      const svg = d3.select(this.$refs.svgRef)
        .attr('width', this.width)
        .attr('height', this.height)
        .attr('viewBox', [-this.width / 2, -this.height / 2, this.width, this.height])

      this.svg = svg

      // 创建箭头标记
      svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#94a3b8')

      this.svg = svg
    },

    setupSimulation() {
      const angleStep = (2 * Math.PI) / this.nodes.length
      this.nodes.forEach((node, i) => {
        const angle = i * angleStep - Math.PI / 2
        node.x = Math.cos(angle) * this.radius
        node.y = Math.sin(angle) * this.radius
        node.vx = 0
        node.vy = 0
      })

      this.simulation = d3.forceSimulation(this.nodes)
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(0, 0).strength(0.1))
        .force('collide', d3.forceCollide(30))
        .stop()
    },

    renderNodes() {
      const g = this.svg.selectAll('.node-group').data(this.nodes, d => d.id)

      g.enter().append('g')
        .attr('class', 'node-group')
        .attr('transform', d => `translate(${d.x}, ${d.y})`)
        .merge(g)
        .attr('transform', d => `translate(${d.x}, ${d.y})`)
        .each(function(d) {
          d3.select(this).selectAll('*').remove()
        })
        .each(function(node) {
          const group = d3.select(this)

          if (node.isActive) {
            group.append('circle')
              .attr('r', 35)
              .attr('fill', 'none')
              .attr('stroke', node.color)
              .attr('stroke-width', 2)
              .attr('opacity', 0.3)
              .attr('class', 'active-halo')
          }

          group.append('circle')
            .attr('r', 25)
            .attr('fill', node.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .attr('class', 'node-circle')
            .style('cursor', 'pointer')
            .on('mouseenter', (event, d) => {
              this.showTooltip(event, {
                title: d.label,
                content: d.isActive ? '活跃中' : '空闲'
              })
            })
            .on('mouseleave', () => this.hideTooltip())
            .on('click', (event, d) => {
              this.showTooltip(event, {
                title: d.label,
                content: `成员：${d.label}\n发送消息：${this.memberMessageCount[d.label] || 0} 条`
              })
            })

          group.append('text')
            .attr('dy', 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#64748b')
            .attr('font-size', '12px')
            .text(d => d.label.length > 10 ? d.label.slice(0, 10) + '...' : d.label)
        })

      g.exit().remove()
    },

    renderMessageAnimation(messageIndex) {
      if (messageIndex >= this.messages.length || messageIndex < 0) return

      this.svg.selectAll('.message-link').remove()
      this.svg.selectAll('.message-dot').remove()
      this.svg.selectAll('.node-group').select('.receiving-halo').remove()

      const message = this.messages[messageIndex]
      const fromNode = this.nodes.find(n => n.id === message.from)
      const toNode = this.nodes.find(n => n.id === (message.recipient || message.to))

      if (!fromNode) return

      this.renderNodes()

      if (!toNode || toNode.id === fromNode.id) {
        this.highlightNode(fromNode)
        return
      }

      const link = this.svg.append('line')
        .attr('class', 'message-link')
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.6)
        .attr('x1', fromNode.x)
        .attr('y1', fromNode.y)
        .attr('x2', toNode.x)
        .attr('y2', toNode.y)

      const dot = this.svg.append('circle')
        .attr('r', 6)
        .attr('fill', '#fbbf24')
        .attr('class', 'message-dot')
        .attr('cx', fromNode.x)
        .attr('cy', fromNode.y)
        .style('filter', 'drop-shadow(0 0 4px #fbbf24)')

      const dx = toNode.x - fromNode.x
      const dy = toNode.y - fromNode.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const duration = (distance / 200) * (1000 / this.currentSpeed)

      dot.transition()
        .duration(Math.max(duration, 300))
        .ease(d3.easeLinear)
        .attr('cx', toNode.x)
        .attr('cy', toNode.y)
        .on('end', () => {
          this.highlightNode(toNode)
          dot.remove()
          link.remove()
        })
    },

    highlightNode(node) {
      const group = this.svg.selectAll('.node-group')
        .filter(d => d.id === node.id)

      group.insert('circle', ':first-child')
        .attr('class', 'receiving-halo')
        .attr('r', 25)
        .attr('fill', 'none')
        .attr('stroke', '#fbbf24')
        .attr('stroke-width', 3)
        .attr('opacity', 1)
        .transition()
        .duration(300)
        .attr('r', 40)
        .attr('opacity', 0)
        .remove()

      const circle = group.select('.node-circle')
      circle.transition()
        .duration(150)
        .attr('r', 32)
        .attr('stroke', '#fbbf24')
        .transition()
        .duration(150)
        .attr('r', 25)
        .attr('stroke', '#fff')
    },

    togglePlay() {
      if (this.isPlaying) {
        this.stopPlay()
      } else {
        this.startPlay()
      }
    },

    startPlay() {
      if (this.currentIndex >= this.messages.length - 1) {
        this.currentIndex = 0
      }
      this.isPlaying = true
      this.playMessage(this.currentIndex)
    },

    stopPlay() {
      this.isPlaying = false
      if (this.playTimer) {
        clearTimeout(this.playTimer)
        this.playTimer = null
      }
    },

    playMessage(index) {
      if (!this.isPlaying || index >= this.messages.length) {
        this.stopPlay()
        return
      }

      this.currentIndex = index
      this.renderMessageAnimation(index)

      const currentMsg = this.messages[index]
      const nextMsg = this.messages[index + 1]

      if (nextMsg && currentMsg) {
        const timeDiff = new Date(nextMsg.timestamp) - new Date(currentMsg.timestamp)
        const baseDelay = Math.min(timeDiff / 1000, 5)
        const adjustedDelay = (baseDelay / this.currentSpeed) * 1000

        this.playTimer = setTimeout(() => {
          this.playMessage(index + 1)
        }, Math.max(adjustedDelay, 200))
      } else {
        this.stopPlay()
      }
    },

    previousMessage() {
      this.stopPlay()
      if (this.currentIndex > 0) {
        this.currentIndex--
        this.renderMessageAnimation(this.currentIndex)
      }
    },

    nextMessage() {
      this.stopPlay()
      if (this.currentIndex < this.messages.length - 1) {
        this.currentIndex++
        this.renderMessageAnimation(this.currentIndex)
      }
    },

    jumpToMessage(index) {
      this.stopPlay()
      this.currentIndex = index
      this.renderMessageAnimation(index)
    },

    handleProgressInput(event) {
      this.currentIndex = parseInt(event.target.value)
    },

    handleProgressChange(event) {
      this.stopPlay()
      this.currentIndex = parseInt(event.target.value)
      this.renderMessageAnimation(this.currentIndex)
    },

    handleMouseEnter() {
      this.isHovering = true
      if (this.isPlaying) {
        this.stopPlay()
      }
    },

    handleMouseLeave() {
      this.isHovering = false
    },

    showTooltip(event, data) {
      const container = this.$refs.svgRef.getBoundingClientRect()
      this.tooltip = {
        visible: true,
        x: event.clientX - container.left + 10,
        y: event.clientY - container.top + 10,
        title: data.title,
        content: data.content
      }
    },

    hideTooltip() {
      this.tooltip.visible = false
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

    getInitials(name) {
      if (!name) return '?'
      return name.charAt(0).toUpperCase()
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
      return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    },

    formatShortTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    },

    formatMessageContent(text) {
      if (!text) return '无内容'
      try {
        const parsed = JSON.parse(text)
        if (parsed.summary) return parsed.summary
        return JSON.stringify(parsed, null, 2).slice(0, 300)
      } catch {
        return text.slice(0, 300)
      }
    },

    truncateMessage(text) {
      if (!text) return '无内容'
      try {
        const parsed = JSON.parse(text)
        if (parsed.summary) return parsed.summary
        return JSON.stringify(parsed).slice(0, 50)
      } catch {
        return text.slice(0, 50)
      }
    },

    handleDragEnd() {
      this.dragOffset = { x: 0, y: 0 }
    },

    handleDrag() {
      // 预留拖拽功能
    }
  }
}
</script>

<style scoped>
.graph-view {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
}

.graph-header {
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

.graph-header h1 {
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

.btn-refresh:hover {
  background: #f1f5f9;
}

.btn-refresh.spinning .btn-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.graph-content {
  display: grid;
  grid-template-columns: 260px 1fr 320px;
  gap: 16px;
  padding: 16px;
  flex: 1;
  height: calc(100vh - 70px);
}

/* 成员面板 */
.members-panel {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  overflow-y: auto;
}

.members-panel h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.member-item:hover {
  background: #f1f5f9;
}

.member-item.active {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.05);
}

.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-status {
  font-size: 11px;
  color: #64748b;
}

.member-status.active {
  color: #22c55e;
}

.member-message-count {
  font-size: 11px;
  color: #94a3b8;
}

.message-stats {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-around;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #64748b;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

/* Graph 主区域 */
.graph-main {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.graph-canvas-container {
  position: relative;
  flex: 1;
  min-height: 400px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.graph-canvas {
  max-width: 100%;
  max-height: 100%;
}

.graph-tooltip {
  position: absolute;
  background: #1e293b;
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
  max-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.tooltip-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: #fbbf24;
}

.empty-state {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #64748b;
}

.empty-icon {
  font-size: 48px;
}

/* 控制栏 */
.graph-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-top: 1px solid #e2e8f0;
  background: #fff;
}

.playback-controls {
  display: flex;
  gap: 8px;
}

.btn-control {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.btn-control:hover:not(:disabled) {
  background: #f1f5f9;
}

.btn-control:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-play {
  width: 44px;
  height: 44px;
  background: #3b82f6;
  color: #fff;
}

.btn-play:hover:not(:disabled) {
  background: #2563eb;
}

.progress-section {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  background: #e2e8f0;
  border-radius: 3px;
  outline: none;
}

.progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s;
}

.progress-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.progress-text {
  font-size: 12px;
  color: #64748b;
  min-width: 60px;
  text-align: right;
}

.speed-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.speed-label {
  font-size: 12px;
  color: #64748b;
  margin-right: 4px;
}

.btn-speed {
  padding: 4px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #fff;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-speed:hover {
  background: #f1f5f9;
}

.btn-speed.active {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

/* 消息详情面板 */
.message-panel {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.message-panel h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.message-detail {
  margin-bottom: 16px;
}

.message-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e2e8f0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.message-index {
  font-size: 12px;
  color: #64748b;
}

.message-time {
  font-size: 11px;
  color: #94a3b8;
}

.message-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-from,
.message-to,
.message-content,
.message-tool,
.message-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-from .label,
.message-to .label,
.message-content .label,
.message-tool .label,
.message-summary .label {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
}

.message-from .value,
.message-to .value {
  font-size: 13px;
  font-weight: 500;
}

.content-text {
  font-size: 12px;
  color: #475569;
  background: #fff;
  padding: 8px;
  border-radius: 4px;
  max-height: 150px;
  overflow-y: auto;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

.tool-badge {
  display: inline-block;
  padding: 4px 8px;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.message-summary p {
  margin: 0;
  font-size: 12px;
  color: #475569;
}

.empty-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  color: #64748b;
  text-align: center;
}

.empty-detail .empty-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

/* 消息列表 */
.message-list-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.message-list-panel h4 {
  font-size: 13px;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.mini-message-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mini-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.mini-message:hover {
  background: #f1f5f9;
}

.mini-message.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.mini-message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
}

.mini-message-content {
  flex: 1;
  min-width: 0;
}

.mini-message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}

.mini-message-from {
  font-size: 12px;
  font-weight: 500;
  color: #1e293b;
}

.mini-message-time {
  font-size: 10px;
  color: #94a3b8;
}

.mini-message-text {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
