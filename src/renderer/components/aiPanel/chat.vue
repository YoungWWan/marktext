<template>
  <div class="ai-panel">
    <!-- 头部工具栏 -->
    <div class="ai-header">
      <div class="header-left">
        <span class="title">{{ $t('ai.title') }}</span>
        <span
          class="status-indicator"
          :class="{ connected: isConnected, disconnected: !isConnected }"
          :title="isConnected ? $t('ai.connected') : $t('ai.disconnected')"
        ></span>
      </div>
      <div class="header-actions">
        <button
          class="icon-btn"
          @click="showSessionList = !showSessionList"
          :title="$t('ai.sessions')"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
          </svg>
        </button>
        <button
          class="icon-btn"
          @click="createNewSession"
          :title="$t('ai.newSession')"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 无 API Key 提示 -->
    <div v-if="!hasApiKey" class="no-api-key-hint">
      <p>{{ $t('ai.noApiKey') || 'Please configure your API key in Preferences → AI' }}</p>
      <button class="settings-link" @click="openAISettings">
        {{ $t('ai.openSettings') || 'Open Settings' }}
      </button>
    </div>

    <!-- 会话列表 -->
    <div v-if="showSessionList" class="session-list">
      <div class="session-list-header">
        <span>{{ $t('ai.sessions') }}</span>
        <button class="icon-btn" @click="showSessionList = false">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="session-items">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="session-item"
          :class="{ active: currentSession && currentSession.id === session.id }"
          @click="selectSession(session)"
        >
          <div class="session-title">{{ session.title }}</div>
          <div class="session-time">{{ formatTime(session.updatedAt) }}</div>
          <button
            class="delete-btn"
            @click.stop="deleteSession(session.id)"
            :title="$t('ai.deleteSession')"
          >
            <svg viewBox="0 0 24 24" width="12" height="12">
              <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
        <div v-if="sessions.length === 0" class="no-sessions">
          {{ $t('ai.noSessions') }}
        </div>
      </div>
    </div>

    <!-- 消息区域 -->
    <div class="messages-container" ref="messagesContainer">
      <div v-if="!currentSession" class="no-session-placeholder">
        <div class="placeholder-content">
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
          <p>{{ $t('ai.startNew') }}</p>
          <button class="start-btn" @click="createNewSession" :disabled="!hasApiKey">
            {{ $t('ai.newSession') }}
          </button>
        </div>
      </div>

      <div v-else class="messages">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="message.role"
        >
          <!-- 用户消息 -->
          <div v-if="message.role === 'user'" class="user-message">
            <div class="message-content">
              <div class="text-part">{{ message.content }}</div>
            </div>
          </div>

          <!-- 助手消息 -->
          <div v-else-if="message.role === 'assistant' && (message.content || (message.reasoning && message.reasoning.length > 0) || (message.toolCalls && message.toolCalls.length > 0))" class="assistant-message">
            <div class="message-content">
              <!-- 时间线：按时间顺序显示推理和工具调用 -->
              <template v-for="(item, itemIndex) in getTimelineItems(message)">
                <!-- 推理片段 -->
                <div v-if="item.type === 'reasoning'" :key="`reasoning-${item.messageId}-${item.index}`" class="reasoning-part">
                  <div class="reasoning-header" @click="toggleReasoning(item.messageId + '-' + item.index)">
                    <span>💭 {{ $t('ai.reasoning') || '思考过程' }}</span>
                    <span class="toggle-icon">{{ isReasoningExpanded(item) ? '▼' : '▶' }}</span>
                  </div>
                  <div v-if="isReasoningExpanded(item)" class="reasoning-content">
                    {{ item.content }}
                  </div>
                </div>

                <!-- 工具调用 -->
                <div
                  v-else-if="item.type === 'tool'"
                  :key="`tool-${item.messageId}-${item.toolIndex}`"
                  class="tool-part"
                  :class="item.tool.status"
                >
                  <div class="tool-header" @click="toggleToolDetails(item.messageId + '-' + item.toolIndex)">
                    <span class="tool-icon">{{ getToolIcon(item.tool.name) }}</span>
                    <span class="tool-name">{{ item.tool.name }}</span>
                    <span class="tool-status" :class="item.tool.status">
                      {{ getToolStatusText(item.tool.status) }}
                    </span>
                    <span class="toggle-icon">{{ isToolExpanded(item) ? '▼' : '▶' }}</span>
                  </div>
                  <div v-if="isToolExpanded(item)" class="tool-content">
                    <!-- Diff预览（内联显示） -->
                    <div v-if="item.tool.diffPreview" class="tool-diff-preview">
                      <div class="diff-preview-header">
                        <span class="diff-file">{{ item.tool.diffPreview.filePath }}</span>
                      </div>
                      <div class="diff-preview-content">
                        <div
                          v-for="(line, lineIndex) in item.tool.diffPreview.lines"
                          :key="lineIndex"
                          class="diff-line"
                          :class="line.type"
                        >
                          <span class="line-content">{{ line.content }}</span>
                        </div>
                      </div>
                      <div class="diff-preview-actions">
                        <button class="diff-btn reject-btn" @click="handleToolDiffReject(item.messageId, item.toolIndex)">
                          {{ $t('ai.diffPreview.reject') || '拒绝' }}
                        </button>
                        <button class="diff-btn accept-btn" @click="handleToolDiffAccept(item.messageId, item.toolIndex)">
                          {{ $t('ai.diffPreview.accept') || '接受' }}
                        </button>
                      </div>
                    </div>
                    <div v-if="item.tool.status === 'completed' && item.tool.output" class="tool-output">
                      <pre>{{ truncateOutput(item.tool.output) }}</pre>
                    </div>
                    <div v-if="item.tool.status === 'error' && item.tool.error" class="tool-error">
                      {{ item.tool.error }}
                    </div>
                  </div>
                </div>
              </template>

              <!-- 文本内容（最终响应，显示在工具调用之后） -->
              <div v-if="message.content" class="text-part" v-html="renderMarkdown(message.content)"></div>
            </div>

            <!-- 错误显示 -->
            <div v-if="message.error" class="message-error">
              <span class="error-icon">⚠️</span>
              <span>{{ message.error }}</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- 权限请求对话框 -->
    <div v-if="pendingPermission" class="permission-dialog">
      <div class="permission-content">
        <div class="permission-header">
          <span class="permission-icon">🔐</span>
          <span>{{ $t('ai.permissionRequest') }}</span>
        </div>
        <div class="permission-body">
          <p class="permission-type">{{ pendingPermission.tool }}</p>
          <p class="permission-detail">{{ pendingPermission.description }}</p>
        </div>
        <div class="permission-actions">
          <button class="deny-btn" @click="respondPermission(false)">{{ $t('ai.deny') }}</button>
          <button class="allow-btn" @click="respondPermission(true)">{{ $t('ai.allow') }}</button>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-container">
      <div class="input-wrapper">
        <textarea
          ref="inputArea"
          v-model="inputText"
          :placeholder="$t('ai.inputPlaceholder')"
          @keydown="handleKeydown"
          :disabled="!isConnected || isProcessing || !hasApiKey"
          rows="1"
        ></textarea>
        <!-- 处理中时显示取消按钮，否则显示发送按钮 -->
        <button
          v-if="isProcessing"
          class="abort-btn-inline"
          @click="abortRequest"
          :title="$t('ai.cancel')"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
          </svg>
        </button>
        <button
          v-else
          class="send-btn"
          @click="sendMessage"
          :disabled="!inputText.trim() || !isConnected || !hasApiKey"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'
import { mapState } from 'vuex'
import { createAIService } from '@/opencode/ai-service'

export default {
  name: 'AiChat',
  data () {
    return {
      isConnected: false,
      showSessionList: false,
      sessions: [],
      currentSession: null,
      messages: [],
      inputText: '',
      isProcessing: false,
      processingStatus: 'Processing...',
      pendingPermission: null,
      expandedReasoning: {},
      expandedTools: {},
      aiService: null,
      abortController: null
    }
  },
  computed: {
    ...mapState({
      projectTree: state => state.project.projectTree,
      // 从偏好设置读取 AI 配置
      aiProvider: state => state.preferences.aiProvider || 'anthropic',
      aiModel: state => state.preferences.aiModel || 'claude-sonnet-4-20250514',
      aiApiKey: state => state.preferences.aiApiKey || '',
      aiAgent: state => state.preferences.aiAgent || 'build',
      aiBaseUrl: state => state.preferences.aiBaseUrl || ''
    }),
    projectPath () {
      return this.projectTree ? this.projectTree.pathname : null
    },
    hasApiKey () {
      return !!this.aiApiKey
    }
  },
  watch: {
    projectPath: {
      immediate: true,
      handler (newPath) {
        if (newPath && this.hasApiKey) {
          this.initializeService()
        }
      }
    },
    aiProvider () {
      this.initializeService()
    },
    aiModel () {
      this.initializeService()
    },
    aiApiKey () {
      this.initializeService()
    },
    aiBaseUrl () {
      this.initializeService()
    }
  },
  mounted () {
    this.loadSessions()
    if (this.hasApiKey) {
      this.initializeService()
    }
  },
  beforeDestroy () {
    if (this.abortController) {
      this.abortController.abort()
    }
  },
  methods: {
    openAISettings () {
      // 打开偏好设置的 AI 页面
      ipcRenderer.send('mt::open-setting-window', 'ai')
    },

    initializeService () {
      if (!this.aiApiKey) {
        this.isConnected = false
        return
      }

      try {
        this.aiService = createAIService({
          provider: this.aiProvider,
          model: this.aiModel,
          apiKey: this.aiApiKey,
          baseUrl: this.aiBaseUrl,
          workingDirectory: this.projectPath
        })
        this.isConnected = true
      } catch (error) {
        console.error('Failed to initialize AI service:', error)
        this.isConnected = false
      }
    },

    loadSessions () {
      const sessionsData = localStorage.getItem('ai-sessions')
      if (sessionsData) {
        try {
          this.sessions = JSON.parse(sessionsData)
        } catch (e) {
          this.sessions = []
        }
      }
    },

    saveSessions () {
      localStorage.setItem('ai-sessions', JSON.stringify(this.sessions))
    },

    createNewSession () {
      if (!this.hasApiKey) return

      const session = {
        id: Date.now().toString(),
        title: this.$t('ai.newSession') + ' - ' + new Date().toLocaleString(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      }
      this.sessions.unshift(session)
      this.currentSession = session
      this.messages = []
      this.saveSessions()
      this.showSessionList = false
    },

    selectSession (session) {
      this.currentSession = session
      // 兼容旧数据格式：将字符串类型的 reasoning 转换为数组
      const messages = (session.messages || []).map(msg => {
        if (msg.role === 'assistant' && typeof msg.reasoning === 'string' && msg.reasoning) {
          return {
            ...msg,
            reasoning: [{
              timestamp: msg.timestamp || Date.now(),
              content: msg.reasoning,
              isComplete: true
            }]
          }
        }
        return msg
      })
      this.messages = messages
      this.showSessionList = false
    },

    deleteSession (sessionId) {
      if (confirm(this.$t('ai.deleteConfirm'))) {
        this.sessions = this.sessions.filter(s => s.id !== sessionId)
        if (this.currentSession && this.currentSession.id === sessionId) {
          this.currentSession = null
          this.messages = []
        }
        this.saveSessions()
      }
    },

    async sendMessage () {
      if (!this.inputText.trim() || !this.currentSession || !this.aiService) return

      const userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: this.inputText.trim(),
        timestamp: Date.now()
      }

      this.messages.push(userMessage)
      this.inputText = ''
      this.isProcessing = true
      this.processingStatus = this.$t('ai.thinking')

      // 创建 AbortController
      this.abortController = new AbortController()

      try {
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          reasoning: [], // 改为数组，每个元素包含 {timestamp, content}
          toolCalls: [],
          model: this.aiModel,
          timestamp: Date.now()
        }
        this.messages.push(assistantMessage)

        // 调用 AI 服务
        // 过滤消息：只包含用户消息，或者有内容的助手消息（包括有工具调用的）
        const filteredMessages = this.messages.filter(m => {
          if (m.role === 'user') return true
          if (m.role === 'assistant') {
            // 只包含有内容的助手消息，或者有工具调用的助手消息
            return (m.content && m.content.trim()) || (m.toolCalls && m.toolCalls.length > 0)
          }
          return false
        })
        console.log('[AI Chat] Sending messages to AI service:', {
          totalMessages: this.messages.length,
          filteredMessages: filteredMessages.length,
          messages: filteredMessages.map(m => ({
            role: m.role,
            contentLength: m.content ? m.content.length : 0,
            content: m.content ? m.content.substring(0, 50) : 'empty',
            toolCallsCount: m.toolCalls ? m.toolCalls.length : 0
          }))
        })

        await this.aiService.chat({
          messages: filteredMessages,
          agent: this.aiAgent,
          signal: this.abortController.signal,
          onText: (text) => {
            // 确保文本内容被正确更新
            // 注意：不要过滤空文本，因为可能包含空格、换行等
            if (text !== null && text !== undefined) {
              const beforeLength = assistantMessage.content.length
              assistantMessage.content += text
              console.log('[AI Chat] onText called:', {
                textLength: text.length,
                text: text.substring(0, 50),
                beforeLength,
                afterLength: assistantMessage.content.length,
                totalContent: assistantMessage.content.substring(0, 100)
              })
              this.scrollToBottom()
            }
          },
          onReasoning: (text) => {
            // 如果当前没有推理片段，或者最后一个推理片段已经结束，创建新的片段
            if (!assistantMessage.reasoning.length ||
                assistantMessage.reasoning[assistantMessage.reasoning.length - 1].isComplete) {
              const reasoningIndex = assistantMessage.reasoning.length
              assistantMessage.reasoning.push({
                timestamp: Date.now(),
                content: text,
                isComplete: false
              })
              // 思考中默认展开
              const reasoningId = assistantMessage.id + '-' + reasoningIndex
              this.$set(this.expandedReasoning, reasoningId, true)
            } else {
              // 追加到最后一个推理片段
              assistantMessage.reasoning[assistantMessage.reasoning.length - 1].content += text
            }
            this.scrollToBottom()
          },
          onToolCall: (toolCall) => {
            this.processingStatus = `${this.$t('ai.toolRunning')} ${toolCall.name}...`
            // 标记最后一个推理片段为完成，并收起
            if (assistantMessage.reasoning.length &&
                !assistantMessage.reasoning[assistantMessage.reasoning.length - 1].isComplete) {
              const lastReasoningIndex = assistantMessage.reasoning.length - 1
              assistantMessage.reasoning[lastReasoningIndex].isComplete = true
              // 思考结束后默认收起
              const reasoningId = assistantMessage.id + '-' + lastReasoningIndex
              this.$set(this.expandedReasoning, reasoningId, false)
            }
            // 为工具调用添加时间戳
            toolCall.timestamp = Date.now()
            const toolIndex = assistantMessage.toolCalls.length
            assistantMessage.toolCalls.push(toolCall)
            // write工具默认展开
            if (toolCall.name === 'write' || toolCall.name === 'edit') {
              const toolId = assistantMessage.id + '-' + toolIndex
              this.$set(this.expandedTools, toolId, true)
            }
            this.scrollToBottom()
          },
          onToolResult: (callId, result) => {
            const tool = assistantMessage.toolCalls.find(t => t.id === callId)
            if (tool) {
              tool.status = result.success ? 'completed' : 'error'
              tool.output = result.output
              tool.error = result.error
            }
            this.scrollToBottom()
          },
          onPermissionRequest: async (request) => {
            // 如果是diff预览请求，将diff预览附加到工具调用上
            if (request.type === 'diff-preview') {
              return new Promise((resolve) => {
                // 找到对应的工具调用
                const tool = assistantMessage.toolCalls.find(t => t.id === request.toolCallId)
                if (tool) {
                  // 计算diff行
                  const diffLines = this.calculateDiffLines(request.oldContent || '', request.newContent || '')
                  tool.diffPreview = {
                    filePath: request.filePath,
                    oldContent: request.oldContent || '',
                    newContent: request.newContent || '',
                    lines: diffLines,
                    resolve
                  }
                  tool.status = 'pending-diff'
                  this.scrollToBottom()
                } else {
                  // 如果找不到工具，直接拒绝
                  resolve(false)
                }
              })
            }
            // 其他权限请求
            return new Promise((resolve) => {
              this.pendingPermission = {
                ...request,
                resolve
              }
            })
          }
        })

        // 更新会话
        this.currentSession.messages = [...this.messages]
        this.currentSession.updatedAt = Date.now()
        this.saveSessions()
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Request aborted')
        } else {
          console.error('AI request failed:', error)
          const lastMessage = this.messages[this.messages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.error = error.message || this.$t('ai.error')
          }
        }
      } finally {
        // 标记最后一个推理片段为完成，并收起
        const lastMessage = this.messages[this.messages.length - 1]
        if (lastMessage && lastMessage.role === 'assistant' &&
            lastMessage.reasoning && lastMessage.reasoning.length &&
            !lastMessage.reasoning[lastMessage.reasoning.length - 1].isComplete) {
          const lastReasoningIndex = lastMessage.reasoning.length - 1
          lastMessage.reasoning[lastReasoningIndex].isComplete = true
          // 思考结束后默认收起
          const reasoningId = lastMessage.id + '-' + lastReasoningIndex
          this.$set(this.expandedReasoning, reasoningId, false)
        }
        this.isProcessing = false
        this.processingStatus = this.$t('ai.processing')
        this.abortController = null
      }
    },

    abortRequest () {
      if (this.abortController) {
        this.abortController.abort()
      }
      this.isProcessing = false
    },

    respondPermission (allowed) {
      if (this.pendingPermission && this.pendingPermission.resolve) {
        this.pendingPermission.resolve(allowed)
      }
      this.pendingPermission = null
    },

    handleToolDiffAccept (messageId, toolIndex) {
      const message = this.messages.find(m => m.id === messageId)
      if (!message || !message.toolCalls || !message.toolCalls[toolIndex]) return

      const tool = message.toolCalls[toolIndex]
      if (tool.diffPreview && tool.diffPreview.resolve) {
        tool.diffPreview.resolve(true)
        tool.diffPreview = null
        tool.status = 'running'
      }
    },

    handleToolDiffReject (messageId, toolIndex) {
      const message = this.messages.find(m => m.id === messageId)
      if (!message || !message.toolCalls || !message.toolCalls[toolIndex]) return

      const tool = message.toolCalls[toolIndex]
      if (tool.diffPreview && tool.diffPreview.resolve) {
        tool.diffPreview.resolve(false)
        tool.status = 'error'
        tool.error = 'Edit rejected by user'
        tool.diffPreview = null
      }
    },

    calculateDiffLines (oldContent, newContent) {
      if (!oldContent && !newContent) return []

      const oldLines = oldContent ? oldContent.split('\n') : []
      const newLines = newContent ? newContent.split('\n') : []

      const lines = []
      let oldLineNum = 1
      let newLineNum = 1
      let oldIndex = 0
      let newIndex = 0

      // 先找到相同的行
      while (oldIndex < oldLines.length && newIndex < newLines.length) {
        if (oldLines[oldIndex] === newLines[newIndex]) {
          // 相同行
          lines.push({
            type: 'context',
            content: oldLines[oldIndex],
            oldLine: oldLineNum++,
            newLine: newLineNum++
          })
          oldIndex++
          newIndex++
        } else {
          // 查找下一个匹配的行
          let foundMatch = false
          // 尝试在旧内容中查找新行
          for (let i = oldIndex + 1; i < Math.min(oldIndex + 10, oldLines.length); i++) {
            if (oldLines[i] === newLines[newIndex]) {
              // 中间的行被删除
              for (let j = oldIndex; j < i; j++) {
                lines.push({
                  type: 'removed',
                  content: oldLines[j],
                  oldLine: oldLineNum++,
                  newLine: ''
                })
              }
              oldIndex = i
              foundMatch = true
              break
            }
          }
          // 如果没找到，尝试在新内容中查找旧行
          if (!foundMatch) {
            for (let i = newIndex + 1; i < Math.min(newIndex + 10, newLines.length); i++) {
              if (newLines[i] === oldLines[oldIndex]) {
                // 中间的行被添加
                for (let j = newIndex; j < i; j++) {
                  lines.push({
                    type: 'added',
                    content: newLines[j],
                    oldLine: '',
                    newLine: newLineNum++
                  })
                }
                newIndex = i
                foundMatch = true
                break
              }
            }
          }
          // 如果都没找到，认为是修改
          if (!foundMatch) {
            lines.push({
              type: 'removed',
              content: oldLines[oldIndex],
              oldLine: oldLineNum++,
              newLine: ''
            })
            lines.push({
              type: 'added',
              content: newLines[newIndex],
              oldLine: '',
              newLine: newLineNum++
            })
            oldIndex++
            newIndex++
          }
        }
      }

      // 处理剩余的行
      while (oldIndex < oldLines.length) {
        lines.push({
          type: 'removed',
          content: oldLines[oldIndex],
          oldLine: oldLineNum++,
          newLine: ''
        })
        oldIndex++
      }

      while (newIndex < newLines.length) {
        lines.push({
          type: 'added',
          content: newLines[newIndex],
          oldLine: '',
          newLine: newLineNum++
        })
        newIndex++
      }

      return lines
    },

    handleKeydown (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    },

    scrollToBottom () {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    },

    isMessageProcessing (messageId) {
      // 检查消息是否还在处理中
      // 如果 isProcessing 为 true，且最后一条助手消息的 ID 匹配，说明还在处理
      if (!this.isProcessing) return false
      const lastMessage = this.messages[this.messages.length - 1]
      return lastMessage && lastMessage.id === messageId && lastMessage.role === 'assistant'
    },

    // 获取按时间排序的时间线项（推理片段和工具调用）
    getTimelineItems (message) {
      if (!message || message.role !== 'assistant') return []

      const items = []

      // 添加推理片段（兼容旧格式）
      if (message.reasoning) {
        if (Array.isArray(message.reasoning)) {
          message.reasoning.forEach((reasoning, index) => {
            items.push({
              type: 'reasoning',
              timestamp: reasoning.timestamp || message.timestamp + index * 100,
              content: reasoning.content || '',
              isComplete: reasoning.isComplete !== false, // 默认为 true
              index: index,
              messageId: message.id
            })
          })
        } else if (typeof message.reasoning === 'string' && message.reasoning.trim()) {
          // 兼容旧格式：字符串类型的 reasoning
          items.push({
            type: 'reasoning',
            timestamp: message.timestamp || Date.now(),
            content: message.reasoning,
            isComplete: true,
            index: 0,
            messageId: message.id
          })
        }
      }

      // 添加工具调用
      if (message.toolCalls && Array.isArray(message.toolCalls)) {
        message.toolCalls.forEach((tool, index) => {
          items.push({
            type: 'tool',
            timestamp: tool.timestamp || message.timestamp + index * 1000, // 如果没有时间戳，使用消息时间戳+索引
            tool: tool,
            toolIndex: index,
            messageId: message.id
          })
        })
      }

      // 按时间戳排序
      return items.sort((a, b) => a.timestamp - b.timestamp)
    },

    // 判断推理是否展开：未完成时默认展开，完成时根据用户设置
    isReasoningExpanded (item) {
      const id = item.messageId + '-' + item.index
      // 如果思考未完成，默认展开
      if (!item.isComplete && this.isMessageProcessing(item.messageId)) {
        return true
      }
      // 如果思考已完成，使用用户设置（如果用户没有设置过，默认收起）
      return this.expandedReasoning[id] === true
    },

    toggleReasoning (id) {
      this.$set(this.expandedReasoning, id, !this.expandedReasoning[id])
    },

    // 判断工具是否展开：write/edit工具默认展开，其他工具根据用户设置
    isToolExpanded (item) {
      const id = item.messageId + '-' + item.toolIndex
      // write和edit工具默认展开
      if (item.tool.name === 'write' || item.tool.name === 'edit') {
        // 如果用户明确收起过，则使用用户设置
        if (this.expandedTools[id] === false) {
          return false
        }
        // 否则默认展开
        return true
      }
      // 其他工具根据用户设置
      return this.expandedTools[id] === true
    },

    toggleToolDetails (id) {
      this.$set(this.expandedTools, id, !this.expandedTools[id])
    },

    formatTime (timestamp) {
      if (!timestamp) return ''
      return new Date(timestamp).toLocaleString()
    },

    formatJson (obj) {
      try {
        return JSON.stringify(obj, null, 2)
      } catch {
        return String(obj)
      }
    },

    truncateOutput (output, maxLength = 500) {
      if (!output) return ''
      if (output.length > maxLength) {
        return output.substring(0, maxLength) + '...'
      }
      return output
    },

    getToolIcon (toolName) {
      const icons = {
        read: '📄',
        write: '✏️',
        edit: '📝',
        bash: '💻',
        glob: '🔍',
        grep: '🔎',
        list: '📁',
        fetch: '🌐'
      }
      return icons[toolName] || '🔧'
    },

    getToolStatusText (status) {
      const statusMap = {
        pending: this.$t('ai.toolPending'),
        running: this.$t('ai.toolRunning'),
        completed: this.$t('ai.toolDone'),
        error: this.$t('ai.toolError')
      }
      return statusMap[status] || status
    },

    renderMarkdown (text) {
      if (!text) return ''

      let html = text
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="code-block"><code class="language-$1">$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n/g, '<br>')

      return html
    }
  }
}
</script>

<style scoped>
.ai-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding-top: var(--titleBarHeight);
  box-sizing: border-box;
  background: var(--sideBarBgColor);
  color: var(--sideBarColor);
  font-size: 13px;
  position: relative;
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--sideBarTitleBorder);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-weight: 600;
  font-size: 14px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.connected {
  background: #4caf50;
}

.status-indicator.disconnected {
  background: #f44336;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--sideBarIconColor);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: var(--sideBarItemHoverBgColor);
}

.no-api-key-hint {
  padding: 16px;
  text-align: center;
  background: var(--sideBarItemHoverBgColor);
  border-bottom: 1px solid var(--sideBarTitleBorder);
}

.no-api-key-hint p {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: var(--sideBarIconColor);
}

.settings-link {
  background: var(--themeColor);
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.settings-link:hover {
  opacity: 0.9;
}

.session-list {
  border: 2px solid var(--sideBarTitleBorder);
  border-radius: 4px;
  margin: 8px 16px;
  max-height: 200px;
  overflow-y: auto;
  flex-shrink: 0;
  background: var(--sideBarBgColor);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.session-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  font-weight: 600;
  font-size: 12px;
  background: var(--sideBarItemHoverBgColor);
}

.session-items {
  padding: 4px 8px;
}

.session-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
}

.session-item:hover {
  background: var(--sideBarItemHoverBgColor);
}

.session-item.active {
  background: var(--sideBarItemHoverBgColor);
  border-left: 2px solid var(--themeColor);
}

.session-title {
  flex: 1;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-time {
  font-size: 10px;
  color: var(--sideBarIconColor);
}

.delete-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--sideBarIconColor);
  cursor: pointer;
  padding: 4px;
  opacity: 0;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.no-sessions {
  padding: 16px;
  text-align: center;
  color: var(--sideBarIconColor);
  font-size: 12px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  margin: 0 16px;
  border: 2px solid var(--sideBarTitleBorder);
  border-radius: 4px;
  background: var(--sideBarBgColor);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.no-session-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.placeholder-content {
  text-align: center;
  color: var(--sideBarIconColor);
}

.placeholder-content svg {
  opacity: 0.5;
}

.placeholder-content p {
  margin: 16px 0;
  font-size: 14px;
}

.start-btn {
  background: var(--themeColor);
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.start-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.user-message,
.assistant-message {
  padding: 12px;
  border-radius: 8px;
  background: var(--sideBarItemHoverBgColor);
  max-width: 95%;
  margin: 0 auto;
}

.user-message {
  background: var(--themeColor);
  color: #fff;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}

.role {
  font-weight: 600;
}

.model-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.message-content {
  font-size: 13px;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.text-part {
  white-space: pre-wrap;
  word-break: break-word;
}

.reasoning-part {
  margin-top: 0;
  border: 1px solid var(--sideBarTitleBorder);
  border-radius: 4px;
  overflow: hidden;
}

/* 当只有思考而没有其他内容时，确保没有额外的空白 */
.assistant-message .message-content:has(.reasoning-part:only-child) {
  padding: 0;
}

.reasoning-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: var(--sideBarBgColor);
  cursor: pointer;
  font-size: 12px;
}

.reasoning-content {
  padding: 8px;
  font-size: 12px;
  color: var(--sideBarIconColor);
  white-space: normal;
  word-break: break-word;
}

.toggle-icon {
  font-size: 10px;
}

.tool-part {
  margin-top: 0;
  border: 1px solid var(--sideBarTitleBorder);
  border-radius: 4px;
  overflow: hidden;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--sideBarBgColor);
  font-size: 12px;
  cursor: pointer;
}

.tool-icon {
  font-size: 14px;
}

.tool-name {
  font-weight: 500;
}

.tool-status {
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.tool-header .toggle-icon {
  font-size: 10px;
  margin-left: 4px;
}

.tool-content {
  border-top: 1px solid var(--sideBarTitleBorder);
}

.tool-status.pending {
  background: #ffc107;
  color: #000;
}

.tool-status.running {
  background: #2196f3;
  color: #fff;
}

.tool-status.completed {
  background: #4caf50;
  color: #fff;
}

.tool-status.error {
  background: #f44336;
  color: #fff;
}

.tool-details {
  border-top: 1px solid var(--sideBarTitleBorder);
}

.tool-input {
  display: flex;
  align-items: center;
  padding: 8px;
  font-size: 12px;
  font-weight: 500;
}

.tool-json {
  margin: 0;
  padding: 8px;
  background: var(--sideBarBgColor);
  font-size: 11px;
  overflow-x: auto;
}

.tool-output {
  border-top: 1px solid var(--sideBarTitleBorder);
  padding: 8px;
}

.tool-output-label {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
}

.tool-output pre {
  margin: 0;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
}

.tool-error {
  border-top: 1px solid var(--sideBarTitleBorder);
  padding: 8px;
  color: #f44336;
  font-size: 12px;
}

.tool-diff-preview {
  border-top: 1px solid var(--sideBarTitleBorder);
  margin-top: 8px;
  background: var(--sideBarBgColor);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.diff-preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--sideBarItemHoverBgColor);
  font-size: 12px;
  font-weight: 500;
}

.diff-icon {
  font-size: 14px;
}

.diff-file {
  font-family: monospace;
  color: var(--sideBarColor);
}

.diff-preview-content {
  max-height: 300px;
  overflow-y: auto;
  overflow-x: auto;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.5;
  background: var(--sideBarBgColor);
  flex: 1;
  min-height: 0;
  /* Firefox 滚动条 */
  scrollbar-width: thin;
  scrollbar-color: var(--sideBarItemHoverBgColor) var(--sideBarBgColor);
}

/* Webkit 滚动条样式（Chrome/Electron） */
.diff-preview-content::-webkit-scrollbar {
  width: 12px;
  height: 12px;
  display: block;
}

.diff-preview-content::-webkit-scrollbar-thumb {
  background-color: var(--sideBarItemHoverBgColor);
  border-radius: 6px;
  border: 2px solid transparent;
  background-clip: padding-box;
  min-height: 20px;
  min-width: 20px;
}

.diff-preview-content::-webkit-scrollbar-thumb:hover {
  background-color: var(--sideBarTitleBorder);
}

.diff-preview-content::-webkit-scrollbar-track {
  background-color: var(--sideBarBgColor) !important;
  border-radius: 0;
  -webkit-box-shadow: inset 0 0 0 var(--sideBarBgColor);
  box-shadow: inset 0 0 0 var(--sideBarBgColor);
}

.diff-preview-content::-webkit-scrollbar-corner {
  background-color: var(--sideBarBgColor) !important;
}

.diff-line {
  display: flex;
  padding: 2px 0;
  white-space: pre;
  position: relative;
}

.diff-line.context {
  background: var(--sideBarBgColor);
  color: var(--sideBarColor);
}

.diff-line.added {
  background: rgba(33, 181, 111, 0.1);
  color: var(--editorColor);
}

.diff-line.removed {
  background: rgba(255, 105, 105, 0.1);
  color: var(--editorColor);
}

.diff-line .line-content {
  flex: 1;
  padding: 2px 12px;
}

.diff-preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--sideBarTitleBorder);
  background: var(--sideBarItemHoverBgColor);
}

.diff-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: opacity 0.2s;
}

.diff-btn:hover {
  opacity: 0.9;
}

.diff-btn.reject-btn {
  background: #f44336;
  color: #fff;
}

.diff-btn.accept-btn {
  background: var(--themeColor);
  color: #fff;
}

.message-error {
  margin-top: 8px;
  padding: 8px;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
  color: #f44336;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.processing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--sideBarItemHoverBgColor);
  border-radius: 8px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--sideBarTitleBorder);
  border-top-color: var(--themeColor);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.abort-btn {
  margin-left: auto;
  background: transparent;
  border: 1px solid var(--sideBarTitleBorder);
  color: var(--sideBarColor);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.abort-btn:hover {
  background: var(--sideBarItemHoverBgColor);
}

.permission-dialog {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.permission-content {
  background: var(--sideBarBgColor);
  border-radius: 8px;
  padding: 20px;
  max-width: 300px;
  width: 90%;
}

.permission-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
}

.permission-icon {
  font-size: 18px;
}

.permission-body {
  margin-bottom: 16px;
}

.permission-type {
  font-weight: 500;
  margin: 0 0 8px 0;
}

.permission-detail {
  font-size: 12px;
  color: var(--sideBarIconColor);
  margin: 0;
}

.permission-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.deny-btn,
.allow-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 12px;
}

.deny-btn {
  background: var(--sideBarItemHoverBgColor);
  color: var(--sideBarColor);
}

.allow-btn {
  background: var(--themeColor);
  color: #fff;
}

.input-container {
  padding: 12px 16px;
  border-top: 1px solid var(--sideBarTitleBorder);
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.input-wrapper textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--sideBarTitleBorder);
  border-radius: 4px;
  padding: 8px 12px;
  background: var(--sideBarBgColor);
  color: var(--sideBarColor);
  font-size: 13px;
  font-family: inherit;
  min-height: 36px;
  max-height: 120px;
}

.input-wrapper textarea:focus {
  outline: none;
  border-color: var(--themeColor);
}

.input-wrapper textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn {
  background: var(--themeColor);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.abort-btn-inline {
  background: var(--sideBarItemHoverBgColor);
  color: var(--sideBarColor);
  border: none;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.abort-btn-inline:hover {
  background: var(--sideBarTitleBorder);
  opacity: 0.9;
}

/* Code block styles */
.message-content :deep(code) {
  background: var(--sideBarBgColor);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.message-content :deep(.code-block) {
  background: var(--sideBarBgColor);
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-content :deep(.code-block code) {
  background: transparent;
  padding: 0;
}

.message-content :deep(a) {
  color: var(--themeColor);
}

.message-content :deep(strong) {
  font-weight: 600;
}
</style>
