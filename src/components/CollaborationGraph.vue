<template>
  <div class="collaboration-graph-modal" @mousedown="handleModalDragStart">
    <div class="graph-modal-content">
      <!-- 头部 -->
      <div class="graph-header">
        <h3>
          <span class="header-icon">🕸️</span>
          团队协作过程
        </h3>
        <div class="header-actions">
          <button class="btn-minimize" @click="$emit('minimize')" title="最小化">
            <span>−</span>
          </button>
          <button class="btn-close" @click="$emit('close')" title="关闭">
            <span>×</span>
          </button>
        </div>
      </div>

      <!-- Graph 画布区域 -->
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
      </div>

      <!-- 播放控制栏 -->
      <div class="graph-controls">
        <!-- 播放控制按钮 -->
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

        <!-- 进度条 -->
        <div class="progress-section">
          <input
            type="range"
            class="progress-slider"
            :min="0"
            :max="messages.length - 1"
            :value="currentIndex"
            @input="handleProgressInput"
            @change="handleProgressChange"
          />
          <span class="progress-text">{{ currentIndex + 1 }} / {{ messages.length }}</span>
        </div>

        <!-- 速度控制 -->
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

      <!-- 图例 -->
      <div class="graph-legend">
        <span class="legend-item">
          <span class="legend-dot member"></span> 成员
        </span>
        <span class="legend-item">
          <span class="legend-line"></span> 消息
        </span>
        <span class="legend-item">
          <span class="legend-dot active"></span> 活跃
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3'

export default {
  name: 'CollaborationGraph',
  props: {
    teamName: {
      type: String,
      required: true
    },
    members: {
      type: Array,
      default: () => []
    },
    messages: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'minimize'],
  data() {
    return {
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

      // D3 相关
      svg: null,
      simulation: null,
      width: 800,
      height: 500,
      radius: 180,

      // 数据
      nodes: [],
      links: [],
      animatedMessages: [],

      // 拖拽
      dragOffset: { x: 0, y: 0 }
    }
  },
  watch: {
    messages: {
      handler() {
        this.initGraph()
      },
      immediate: true
    },
    members: {
      handler() {
        this.initGraph()
      },
      immediate: true
    },
    currentSpeed() {
      if (this.isPlaying) {
        this.stopPlay()
        this.startPlay()
      }
    }
  },
  mounted() {
    this.initGraph()
    window.addEventListener('mouseup', this.handleModalDragEnd)
    window.addEventListener('mousemove', this.handleModalDrag)
  },
  beforeUnmount() {
    this.stopPlay()
    window.removeEventListener('mouseup', this.handleModalDragEnd)
    window.removeEventListener('mousemove', this.handleModalDrag)
  },
  methods: {
    // 初始化 Graph
    initGraph() {
      if (!this.$refs.svgRef || this.members.length === 0) return

      // 清空 SVG
      d3.select(this.$refs.svgRef).selectAll('*').remove()

      // 初始化节点（成员）
      this.nodes = this.members.map((m, i) => ({
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

    // 设置 SVG
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

      // 创建光点标记
      svg.append('defs').append('marker')
        .attr('id', 'glow-dot')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 5)
        .attr('refY', 5)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .append('circle')
        .attr('cx', 5)
        .attr('cy', 5)
        .attr('r', 4)
        .attr('fill', '#fbbf24')

      this.svg = svg
    },

    // 设置力导向模拟
    setupSimulation() {
      // 计算圆形布局位置
      const angleStep = (2 * Math.PI) / this.nodes.length
      this.nodes.forEach((node, i) => {
        const angle = i * angleStep - Math.PI / 2 // 从顶部开始
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

    // 渲染节点
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

          // 外圈光晕（活跃状态）
          if (node.isActive) {
            group.append('circle')
              .attr('r', 35)
              .attr('fill', 'none')
              .attr('stroke', node.color)
              .attr('stroke-width', 2)
              .attr('opacity', 0.3)
              .attr('class', 'active-halo')
          }

          // 节点背景
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
                content: `成员：${d.label}\n状态：${d.isActive ? '活跃' : '空闲'}`
              })
            })

          // 节点文字
          group.append('text')
            .attr('dy', 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#64748b')
            .attr('font-size', '12px')
            .text(d => d.label.length > 8 ? d.label.slice(0, 8) + '...' : d.label)
        })

      g.exit().remove()
    },

    // 渲染消息动画
    renderMessageAnimation(messageIndex) {
      if (messageIndex >= this.messages.length || messageIndex < 0) return

      // 清除之前的动画
      this.svg.selectAll('.message-link').remove()
      this.svg.selectAll('.message-dot').remove()
      this.svg.selectAll('.node-group').select('.receiving-halo').remove()

      const message = this.messages[messageIndex]
      const fromNode = this.nodes.find(n => n.id === message.from)
      const toNode = this.nodes.find(n => n.id === (message.recipient || message.to))

      // 如果没有接收者，只显示发送者
      if (!fromNode) return

      // 更新节点渲染（确保节点存在）
      this.renderNodes()

      if (!toNode || toNode.id === fromNode.id) {
        // 广播消息或无接收者，只显示发送者高亮
        this.highlightNode(fromNode)
        return
      }

      // 创建虚线路径
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

      // 创建流动的光点
      const dot = this.svg.append('circle')
        .attr('r', 6)
        .attr('fill', '#fbbf24')
        .attr('class', 'message-dot')
        .attr('cx', fromNode.x)
        .attr('cy', fromNode.y)
        .style('filter', 'drop-shadow(0 0 4px #fbbf24)')

      // 计算路径长度用于动画
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
          // 到达目标后高亮目标节点
          this.highlightNode(toNode)
          dot.remove()
          link.remove()
        })
    },

    // 高亮节点
    highlightNode(node) {
      const group = this.svg.selectAll('.node-group')
        .filter(d => d.id === node.id)

      // 添加接收光晕效果
      const halo = group.select('.receiving-halo')
      if (halo.empty()) {
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
      }

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

    // 播放控制
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

      // 计算下一条消息的延迟
      const currentMsg = this.messages[index]
      const nextMsg = this.messages[index + 1]

      if (nextMsg && currentMsg) {
        const timeDiff = new Date(nextMsg.timestamp) - new Date(currentMsg.timestamp)
        const baseDelay = Math.min(timeDiff / 1000, 5) // 最大 5 秒
        const adjustedDelay = (baseDelay / this.currentSpeed) * 1000

        this.playTimer = setTimeout(() => {
          this.playMessage(index + 1)
        }, Math.max(adjustedDelay, 200)) // 最小 200ms
      } else {
        // 最后一条消息
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

    handleProgressInput(event) {
      this.currentIndex = parseInt(event.target.value)
    },

    handleProgressChange(event) {
      this.stopPlay()
      this.currentIndex = parseInt(event.target.value)
      this.renderMessageAnimation(this.currentIndex)
    },

    // 交互处理
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
      const rect = this.$refs.svgRef.getBoundingClientRect()
      this.tooltip = {
        visible: true,
        x: event.clientX - rect.left + 10,
        y: event.clientY - rect.top + 10,
        title: data.title,
        content: data.content
      }
    },

    hideTooltip() {
      this.tooltip.visible = false
    },

    // 弹层拖拽
    handleModalDragStart(event) {
      const rect = event.currentTarget.getBoundingClientRect()
      this.dragOffset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
    },

    handleModalDrag(event) {
      if (this.dragOffset.x === 0 && this.dragOffset.y === 0) return

      const modal = event.target.closest('.collaboration-graph-modal')
      if (!modal) return

      modal.style.position = 'fixed'
      modal.style.left = (event.clientX - this.dragOffset.x) + 'px'
      modal.style.top = (event.clientY - this.dragOffset.y) + 'px'
      modal.style.right = 'auto'
      modal.style.bottom = 'auto'
    },

    handleModalDragEnd() {
      this.dragOffset = { x: 0, y: 0 }
    }
  }
}
</script>

<style scoped>
.collaboration-graph-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  min-width: 800px;
  max-width: 90vw;
  user-select: none;
}

.graph-modal-content {
  display: flex;
  flex-direction: column;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 12px 12px 0 0;
  cursor: move;
}

.graph-header h3 {
  margin: 0;
  font-size: 16px;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-minimize,
.btn-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 20px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.btn-minimize:hover {
  background: #e2e8f0;
}

.btn-close:hover {
  background: #fee2e2;
  color: #dc2626;
}

.graph-canvas-container {
  position: relative;
  width: 800px;
  height: 500px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  overflow: hidden;
}

.graph-canvas {
  width: 100%;
  height: 100%;
}

.graph-tooltip {
  position: absolute;
  background: #1e293b;
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  pointer-events: none;
  z-index: 10001;
  max-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.tooltip-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: #fbbf24;
}

.graph-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
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
  background: #e2e8f0;
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
  min-width: 50px;
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
  padding: 4px 8px;
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

.graph-legend {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  border-top: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 0 0 12px 12px;
  font-size: 12px;
  color: #64748b;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #94a3b8;
}

.legend-dot.member {
  background: #475569;
}

.legend-dot.active {
  background: #22c55e;
}

.legend-line {
  width: 20px;
  height: 2px;
  background: #94a3b8;
}

/* 动画效果 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.active-halo {
  animation: pulse 2s infinite;
}
</style>
