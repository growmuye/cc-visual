/**
 * 🎨 Aesthetic Agent - UI 审美审查智能体
 *
 * 专门用于审视项目的 UI 设计、配色方案、主题一致性
 * 提供专业的设计建议和改进方案
 */

const fs = require('fs')
const path = require('path')

// ==================== 配色分析引擎 ====================

const COLOR_PATTERNS = {
  // 从代码中提取的颜色值
  extractColorsFromCSS(css) {
    const colorRegex = /(?:#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/g
    return css.match(colorRegex) || []
  },

  // 分析颜色使用频率
  analyzeColorFrequency(colors) {
    const freq = {}
    colors.forEach(c => {
      freq[c] = (freq[c] || 0) + 1
    })
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([color, count]) => ({ color, count }))
  },

  // 判断颜色类型
  getColorType(color) {
    if (color.startsWith('#')) return 'hex'
    if (color.startsWith('rgb')) return 'rgb'
    if (color.startsWith('hsl')) return 'hsl'
    return 'unknown'
  },

  // 分析色板和谐度
  analyzePalette(colors) {
    const uniqueColors = [...new Set(colors)]

    // 检查是否有一致的透明度模式
    const alphaValues = uniqueColors
      .filter(c => c.includes('rgba') || c.includes('hsla'))
      .map(c => {
        const match = c.match(/([\d.]+)\)/)
        return match ? parseFloat(match[1]) : null
      })

    // 分析主色系
    const colorGroups = {
      neutral: [],  // 灰/白/黑
      blue: [],     // 蓝色系
      green: [],    // 绿色系
      yellow: [],   // 黄色系
      red: [],      // 红色系
      other: []
    }

    uniqueColors.forEach(color => {
      const lower = color.toLowerCase()
      if (lower.includes('#')) {
        if (lower.includes('4a9eff') || lower.includes('2196f3') || lower.includes('1e88e5')) {
          colorGroups.blue.push(color)
        } else if (lower.includes('4caf50') || lower.includes('76ff03') || lower.includes('8bc34a')) {
          colorGroups.green.push(color)
        } else if (lower.includes('ffc107') || lower.includes('ffeb3b') || lower.includes('ff9800')) {
          colorGroups.yellow.push(color)
        } else if (lower.includes('f44336') || lower.includes('e53935')) {
          colorGroups.red.push(color)
        } else if (lower.match(/#[0-9a-f]{3,6}$/) &&
                   lower.match(/#([0-9a-f]{2})\1{2}/)) {
          colorGroups.neutral.push(color)
        } else {
          colorGroups.other.push(color)
        }
      } else {
        colorGroups.other.push(color)
      }
    })

    return colorGroups
  }
}

// ==================== UI 组件分析 ====================

const UI_ANALYZER = {
  // 分析组件层次结构
  analyzeHierarchy(template) {
    const components = []
    const tagRegex = /<(\/?)([\w-]+)(?:\s+[^>]*)?>/g
    let match
    const stack = []

    while ((match = tagRegex.exec(template)) !== null) {
      if (!match[1]) { // 开始标签
        stack.push({ tag: match[2], children: [] })
      } else if (stack.length > 0) { // 结束标签
        const component = stack.pop()
        if (stack.length === 0) {
          components.push(component)
        } else {
          stack[stack.length - 1].children.push(component)
        }
      }
    }

    return components
  },

  // 检查间距一致性
  analyzeSpacing(css) {
    const paddingMatches = css.match(/padding:?\s*[^;]+/g) || []
    const marginMatches = css.match(/margin:?\s*[^;]+/g) || []
    const gapMatches = css.match(/gap:?\s*[^;]+/g) || []

    const values = {
      padding: new Set(),
      margin: new Set(),
      gap: new Set()
    }

    const extractValues = (matches, type) => {
      matches.forEach(m => {
        const nums = m.match(/[\d.]+(?:rem|px|em)?/g)
        if (nums) nums.forEach(n => values[type].add(n))
      })
    }

    extractValues(paddingMatches, 'padding')
    extractValues(marginMatches, 'margin')
    extractValues(gapMatches, 'gap')

    return {
      padding: [...values.padding],
      margin: [...values.margin],
      gap: [...values.gap],
      consistent: values.padding.size <= 4 && values.margin.size <= 4 && values.gap.size <= 4
    }
  },

  // 检查字体层级
  analyzeTypography(css) {
    const fontSizeMatches = css.match(/font-size:?\s*[^;]+/g) || []
    const fontWeightMatches = css.match(/font-weight:?\s*[^;]+/g) || []

    const sizes = new Set()
    const weights = new Set()

    fontSizeMatches.forEach(m => {
      const size = m.match(/[\d.]+(?:rem|px|em)?/)
      if (size) sizes.add(size[0])
    })

    fontWeightMatches.forEach(m => {
      const weight = m.match(/\d+/)
      if (weight) weights.add(weight[0])
    })

    return {
      fontSizes: [...sizes].sort(),
      fontWeights: [...weights].sort(),
      hasClearHierarchy: [...sizes].length >= 4 // 至少有 4 种字号
    }
  },

  // 检查交互状态
  analyzeInteractions(css) {
    const hasHover = css.includes(':hover')
    const hasActive = css.includes(':active')
    const hasFocus = css.includes(':focus')
    const hasTransition = css.includes('transition')
    const hasTransform = css.includes('transform')
    const hasAnimation = css.includes('animation') || css.includes('@keyframes')

    return {
      hover: hasHover,
      active: hasActive,
      focus: hasFocus,
      transition: hasTransition,
      transform: hasTransform,
      animation: hasAnimation,
      score: [hasHover, hasActive, hasFocus, hasTransition, hasTransform, hasAnimation]
        .filter(Boolean).length / 6
    }
  }
}

// ==================== 可访问性检查 ====================

const ACCESSIBILITY_CHECKER = {
  // 检查对比度（简化版）
  checkContrastRatio(bg, fg) {
    // 这里应该实现 WCAG 对比度计算
    // 简化处理：返回估计值
    return {
      ratio: 4.5, // 模拟值
      passes: true,
      level: 'AA'
    }
  },

  // 检查颜色语义
  checkColorSemantics(colors) {
    const semantics = {
      success: colors.some(c => c.includes('4caf50') || c.includes('76ff03')),
      warning: colors.some(c => c.includes('ffc107') || c.includes('ff9800')),
      error: colors.some(c => c.includes('f44336') || c.includes('e53935')),
      info: colors.some(c => c.includes('2196f3') || c.includes('4a9eff'))
    }

    return {
      ...semantics,
      complete: Object.values(semantics).every(Boolean)
    }
  },

  // 检查焦点状态
  checkFocusIndicators(css) {
    return {
      hasFocusStyles: css.includes(':focus'),
      hasOutlineStyles: css.includes('outline')
    }
  }
}

// ==================== 主题一致性分析 ====================

const THEME_ANALYZER = {
  analyzeTheme(css, template) {
    // 检测主题风格
    const isDark = css.includes('rgba(0,0,0') || css.includes('background: #0') || css.includes('background:#0')
    const isLight = css.includes('rgba(255,255,255') || css.includes('background: #f') || css.includes('background:#f')

    // 检测设计语言
    const hasBorderRadius = css.includes('border-radius')
    const hasBoxShadow = css.includes('box-shadow')
    const hasGlassEffect = css.includes('backdrop-filter') || css.includes('rgba(')
    const hasGradient = css.includes('linear-gradient') || css.includes('radial-gradient')

    return {
      theme: isDark ? 'dark' : 'light',
      style: {
        rounded: hasBorderRadius,
        shadow: hasBoxShadow,
        glass: hasGlassEffect,
        gradient: hasGradient
      },
      consistency: {
        borderRadius: this.checkBorderRadiusConsistency(css),
        shadows: this.checkShadowConsistency(css)
      }
    }
  },

  checkBorderRadiusConsistency(css) {
    const matches = css.match(/border-radius:?\s*[^;]+/g) || []
    const values = new Set()
    matches.forEach(m => {
      const val = m.match(/[\d.]+(?:px|rem)?/)
      if (val) values.add(val[0])
    })
    return {
      values: [...values],
      consistent: values.size <= 3
    }
  },

  checkShadowConsistency(css) {
    const matches = css.match(/box-shadow:?\s*[^;]+/g) || []
    return {
      count: matches.length,
      hasShadows: matches.length > 0
    }
  }
}

// ==================== 报告生成器 ====================

const REPORT_GENERATOR = {
  generateReport(analysis) {
    const timestamp = new Date().toISOString()

    return {
      timestamp,
      ...analysis,
      summary: this.generateSummary(analysis),
      recommendations: this.generateRecommendations(analysis),
      score: this.calculateOverallScore(analysis)
    }
  },

  generateSummary(analysis) {
    const parts = []

    if (analysis.color.palette) {
      const colors = analysis.color.palette
      const dominantGroup = Object.entries(colors)
        .sort((a, b) => b[1].length - a[1].length)[0]
      if (dominantGroup) {
        parts.push(`主色调为${dominantGroup[0]}色系 (${dominantGroup[1].length}种颜色)`)
      }
    }

    if (analysis.typography.hasClearHierarchy) {
      parts.push('字体层级清晰')
    }

    if (analysis.spacing.consistent) {
      parts.push('间距系统一致')
    }

    if (analysis.interactions.score >= 0.7) {
      parts.push('交互效果丰富')
    }

    return parts.join('；')
  },

  generateRecommendations(analysis) {
    const recs = []

    // 配色建议
    if (analysis.color.uniqueColors > 15) {
      recs.push({
        type: 'color',
        priority: 'high',
        message: '颜色数量过多（超过 15 种），建议简化色板，统一使用 5-8 种主色'
      })
    }

    if (!analysis.color.semantic.complete) {
      const missing = []
      if (!analysis.color.semantic.success) missing.push('成功色')
      if (!analysis.color.semantic.warning) missing.push('警告色')
      if (!analysis.color.semantic.error) missing.push('错误色')
      if (!analysis.color.semantic.info) missing.push('信息色')
      recs.push({
        type: 'color',
        priority: 'medium',
        message: `缺少语义颜色：${missing.join('、')}`
      })
    }

    // 间距建议
    if (!analysis.spacing.consistent) {
      recs.push({
        type: 'spacing',
        priority: 'medium',
        message: '间距值不够统一，建议使用 4px 基准系统（0.25rem, 0.5rem, 1rem, 1.5rem, 2rem）'
      })
    }

    // 字体建议
    if (!analysis.typography.hasClearHierarchy) {
      recs.push({
        type: 'typography',
        priority: 'low',
        message: '字体层级可以更清晰，建议定义明确的字号阶梯'
      })
    }

    // 交互建议
    if (!analysis.interactions.focus) {
      recs.push({
        type: 'accessibility',
        priority: 'high',
        message: '缺少 :focus 状态样式，影响键盘导航体验'
      })
    }

    if (!analysis.interactions.transition) {
      recs.push({
        type: 'interaction',
        priority: 'low',
        message: '缺少过渡效果，建议为可交互元素添加 transition'
      })
    }

    // 主题建议
    if (!analysis.theme.style.gradient && !analysis.theme.style.glass) {
      recs.push({
        type: 'visual',
        priority: 'low',
        message: '可以考虑添加渐变或毛玻璃效果增强视觉层次'
      })
    }

    return recs
  },

  calculateOverallScore(analysis) {
    let score = 100

    // 颜色扣分
    if (analysis.color.uniqueColors > 20) score -= 10
    else if (analysis.color.uniqueColors > 15) score -= 5

    // 间距扣分
    if (!analysis.spacing.consistent) score -= 10

    // 交互扣分
    score -= (1 - analysis.interactions.score) * 20

    // 可访问性扣分
    if (!analysis.interactions.focus) score -= 10

    // 主题一致性加分
    if (analysis.theme.consistency.borderRadius.consistent) score += 5

    return Math.max(0, Math.min(100, Math.round(score)))
  }
}

// ==================== 主分析函数 ====================

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')

  // 提取 template、script、style
  const templateMatch = content.match(/<template>([\s\S]*)<\/template>/)
  const styleMatch = content.match(/<style>([\s\S]*)<\/style>/)

  const template = templateMatch ? templateMatch[1] : ''
  const css = styleMatch ? styleMatch[1] : ''

  // 执行分析
  const allColors = COLOR_PATTERNS.extractColorsFromCSS(css)
  const colorFrequency = COLOR_PATTERNS.analyzeColorFrequency(allColors)
  const colorPalette = COLOR_PATTERNS.analyzePalette(allColors)

  const spacing = UI_ANALYZER.analyzeSpacing(css)
  const typography = UI_ANALYZER.analyzeTypography(css)
  const interactions = UI_ANALYZER.analyzeInteractions(css)

  const theme = THEME_ANALYZER.analyzeTheme(css, template)

  const accessibility = {
    focus: ACCESSIBILITY_CHECKER.checkFocusIndicators(css),
    semantic: ACCESSIBILITY_CHECKER.checkColorSemantics(allColors)
  }

  return {
    color: {
      all: allColors,
      frequency: colorFrequency,
      palette: colorPalette,
      uniqueColors: new Set(allColors).size
    },
    spacing,
    typography,
    interactions,
    theme,
    accessibility
  }
}

// ==================== 执行分析 ====================

const args = process.argv.slice(2)
const targetFile = args[0] || path.join(__dirname, '..', 'src', 'App.vue')

console.log('\n' + '='.repeat(60))
console.log('🎨 Aesthetic Agent - UI 审美审查报告')
console.log('='.repeat(60))
console.log(`\n📁 分析文件：${targetFile}`)

if (!fs.existsSync(targetFile)) {
  console.error(`\n❌ 文件不存在：${targetFile}`)
  process.exit(1)
}

const analysis = analyzeFile(targetFile)
const report = REPORT_GENERATOR.generateReport(analysis)

// 输出报告
console.log('\n' + '-'.repeat(60))
console.log('📊 分析结果')
console.log('-'.repeat(60))

console.log('\n🎨 配色分析')
console.log(`   总颜色数：${analysis.color.uniqueColors}`)
console.log(`   主色：${analysis.color.frequency[0]?.color || 'N/A'} (使用${analysis.color.frequency[0]?.count || 0}次)`)
console.log('   色板分布:')
Object.entries(analysis.color.palette).forEach(([group, colors]) => {
  if (colors.length > 0) {
    console.log(`     - ${group}: ${colors.length}种`)
  }
})

console.log('\n📐 间距系统')
console.log(`   Padding 值：${analysis.spacing.padding.join(', ') || '无'}`)
console.log(`   Margin 值：${analysis.spacing.margin.join(', ') || '无'}`)
console.log(`   Gap 值：${analysis.spacing.gap.join(', ') || '无'}`)
console.log(`   一致性：${analysis.spacing.consistent ? '✅' : '⚠️'}`)

console.log('\n🔤 字体排印')
console.log(`   字号种类：${analysis.typography.fontSizes.length}`)
console.log(`   字号列表：${analysis.typography.fontSizes.join(', ')}`)
console.log(`   字重种类：${analysis.typography.fontWeights.join(', ') || '无'}`)
console.log(`   层级清晰度：${analysis.typography.hasClearHierarchy ? '✅' : '⚠️'}`)

console.log('\n✨ 交互效果')
console.log(`   Hover: ${analysis.interactions.hover ? '✅' : '❌'}`)
console.log(`   Active: ${analysis.interactions.active ? '✅' : '❌'}`)
console.log(`   Focus: ${analysis.interactions.focus ? '✅' : '❌'}`)
console.log(`   Transition: ${analysis.interactions.transition ? '✅' : '❌'}`)
console.log(`   Animation: ${analysis.interactions.animation ? '✅' : '❌'}`)
console.log(`   交互得分：${(analysis.interactions.score * 100).toFixed(0)}%`)

console.log('\n🎭 主题风格')
console.log(`   主题：${analysis.theme.theme === 'dark' ? '深色' : '浅色'}`)
console.log(`   圆角：${analysis.theme.style.rounded ? '✅' : '❌'} (一致性：${analysis.theme.consistency.borderRadius.consistent ? '好' : '一般'})`)
console.log(`   阴影：${analysis.theme.style.shadow ? '✅' : '❌'}`)
console.log(`   玻璃效果：${analysis.theme.style.glass ? '✅' : '❌'}`)
console.log(`   渐变：${analysis.theme.style.gradient ? '✅' : '❌'}`)

console.log('\n♿ 可访问性')
console.log(`   Focus 样式：${analysis.accessibility.focus.hasFocusStyles ? '✅' : '❌'}`)
console.log(`   语义颜色：${analysis.accessibility.semantic.complete ? '✅' : '⚠️'}`)

console.log('\n' + '='.repeat(60))
console.log('💡 改进建议')
console.log('='.repeat(60))

if (report.recommendations.length === 0) {
  console.log('\n✨ 没有发现需要改进的地方，设计质量很好！')
} else {
  report.recommendations.forEach((rec, i) => {
    const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'
    console.log(`\n${icon} [${rec.type.toUpperCase()}] ${rec.message}`)
  })
}

console.log('\n' + '='.repeat(60))
console.log(`🏆 综合评分：${report.score}/100`)
console.log('='.repeat(60))

// 输出评级
let rating = '⭐'
if (report.score >= 90) rating = '🏆 S 级 - 优秀'
else if (report.score >= 80) rating = '🥇 A 级 - 良好'
else if (report.score >= 70) rating = '🥈 B 级 - 中等'
else if (report.score >= 60) rating = '🥉 C 级 - 及格'
else rating = '❌ D 级 - 需改进'

console.log(`📈 评级：${rating}`)
console.log('')

// 保存报告
const reportPath = path.join(__dirname, 'aesthetic-report.json')
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(`📄 详细报告已保存至：${reportPath}`)
console.log('')
