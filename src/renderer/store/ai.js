import { ipcRenderer } from 'electron'
import { generateId } from '../util'

// AI 聊天模块状态管理
const state = {
  // 聊天消息列表
  messages: [],
  // 当前会话 ID
  sessionId: null,
  // 是否正在生成响应
  isGenerating: false,
  // AI 配置
  config: {
    provider: 'openai', // 默认提供商
    model: 'gpt-3.5-turbo', // 默认模型
    apiKey: '',
    baseUrl: '',
    temperature: 0.7,
    maxTokens: 2048
  },
  // 历史会话列表
  sessions: [],
  // 错误信息
  error: null
}

const getters = {
  hasApiKey: state => !!state.config.apiKey,
  currentMessages: state => state.messages,
  isReady: state => !!state.config.apiKey && !state.isGenerating
}

const mutations = {
  SET_MESSAGES (state, messages) {
    state.messages = messages
  },

  ADD_MESSAGE (state, message) {
    state.messages.push({
      id: generateId(),
      timestamp: Date.now(),
      ...message
    })
  },

  UPDATE_MESSAGE (state, { id, content, done }) {
    const message = state.messages.find(m => m.id === id)
    if (message) {
      message.content = content
      if (done !== undefined) {
        message.done = done
      }
    }
  },

  SET_SESSION_ID (state, sessionId) {
    state.sessionId = sessionId
  },

  SET_IS_GENERATING (state, isGenerating) {
    state.isGenerating = isGenerating
  },

  SET_CONFIG (state, config) {
    state.config = { ...state.config, ...config }
  },

  SET_SESSIONS (state, sessions) {
    state.sessions = sessions
  },

  ADD_SESSION (state, session) {
    state.sessions.unshift(session)
  },

  SET_ERROR (state, error) {
    state.error = error
  },

  CLEAR_MESSAGES (state) {
    state.messages = []
  },

  CLEAR_ERROR (state) {
    state.error = null
  }
}

const actions = {
  // 初始化 AI 模块
  INIT_AI ({ commit, dispatch }) {
    // 从本地存储加载配置
    const savedConfig = localStorage.getItem('ai-config')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        commit('SET_CONFIG', config)
      } catch (e) {
        console.error('Failed to parse AI config:', e)
      }
    }

    // 从本地存储加载会话历史
    const savedSessions = localStorage.getItem('ai-sessions')
    if (savedSessions) {
      try {
        const sessions = JSON.parse(savedSessions)
        commit('SET_SESSIONS', sessions)
      } catch (e) {
        console.error('Failed to parse AI sessions:', e)
      }
    }

    // 监听来自主进程的 AI 响应
    ipcRenderer.on('mt::ai-response-chunk', (event, { messageId, content, done }) => {
      commit('UPDATE_MESSAGE', { id: messageId, content, done })
      if (done) {
        commit('SET_IS_GENERATING', false)
        dispatch('SAVE_SESSION')
      }
    })

    ipcRenderer.on('mt::ai-response-error', (event, { error }) => {
      commit('SET_ERROR', error)
      commit('SET_IS_GENERATING', false)
    })
  },

  // 发送消息
  async SEND_MESSAGE ({ commit, state, dispatch }, { content, context }) {
    if (!content.trim() || state.isGenerating) return

    commit('CLEAR_ERROR')

    // 添加用户消息
    const userMessage = {
      role: 'user',
      content: content.trim()
    }
    commit('ADD_MESSAGE', userMessage)

    // 创建 AI 响应消息占位符
    const assistantMessageId = generateId()
    commit('ADD_MESSAGE', {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      done: false
    })

    commit('SET_IS_GENERATING', true)

    // 准备消息历史
    const messages = state.messages
      .filter(m => m.role && m.content)
      .map(m => ({
        role: m.role,
        content: m.content
      }))

    // 如果有上下文（比如选中的文本），添加到系统提示中
    let systemPrompt = 'You are a helpful AI assistant integrated into a Markdown editor called MarkText. Help users with their writing, editing, and any questions they have.'
    if (context) {
      systemPrompt += `\n\nCurrent context from the editor:\n\`\`\`\n${context}\n\`\`\``
    }

    // 发送请求到主进程
    ipcRenderer.send('mt::ai-send-message', {
      messageId: assistantMessageId,
      messages: messages.slice(0, -1), // 排除刚添加的空响应
      systemPrompt,
      config: state.config
    })
  },

  // 停止生成
  STOP_GENERATION ({ commit, state }) {
    if (state.isGenerating) {
      ipcRenderer.send('mt::ai-stop-generation')
      commit('SET_IS_GENERATING', false)
    }
  },

  // 保存配置
  SAVE_CONFIG ({ state }, config) {
    const newConfig = { ...state.config, ...config }
    localStorage.setItem('ai-config', JSON.stringify(newConfig))
  },

  // 更新配置
  UPDATE_CONFIG ({ commit, dispatch }, config) {
    commit('SET_CONFIG', config)
    dispatch('SAVE_CONFIG', config)
  },

  // 新建会话
  NEW_SESSION ({ commit, state, dispatch }) {
    // 保存当前会话
    if (state.messages.length > 0) {
      dispatch('SAVE_SESSION')
    }

    const sessionId = generateId()
    commit('SET_SESSION_ID', sessionId)
    commit('CLEAR_MESSAGES')
    commit('CLEAR_ERROR')

    const session = {
      id: sessionId,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    commit('ADD_SESSION', session)

    return sessionId
  },

  // 保存当前会话
  SAVE_SESSION ({ state }) {
    if (state.messages.length === 0) return

    const sessionId = state.sessionId || generateId()
    const sessions = [...state.sessions]

    // 生成会话标题（使用第一条用户消息）
    const firstUserMessage = state.messages.find(m => m.role === 'user')
    const title = firstUserMessage
      ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
      : 'New Chat'

    const sessionIndex = sessions.findIndex(s => s.id === sessionId)
    const sessionData = {
      id: sessionId,
      title,
      messages: state.messages,
      createdAt: sessionIndex >= 0 ? sessions[sessionIndex].createdAt : Date.now(),
      updatedAt: Date.now()
    }

    if (sessionIndex >= 0) {
      sessions[sessionIndex] = sessionData
    } else {
      sessions.unshift(sessionData)
    }

    // 限制保存的会话数量
    const maxSessions = 50
    if (sessions.length > maxSessions) {
      sessions.splice(maxSessions)
    }

    localStorage.setItem('ai-sessions', JSON.stringify(sessions))
  },

  // 加载会话
  LOAD_SESSION ({ commit }, session) {
    commit('SET_SESSION_ID', session.id)
    commit('SET_MESSAGES', session.messages || [])
    commit('CLEAR_ERROR')
  },

  // 删除会话
  DELETE_SESSION ({ commit, state }, sessionId) {
    const sessions = state.sessions.filter(s => s.id !== sessionId)
    commit('SET_SESSIONS', sessions)
    localStorage.setItem('ai-sessions', JSON.stringify(sessions))

    // 如果删除的是当前会话，清空消息
    if (state.sessionId === sessionId) {
      commit('SET_SESSION_ID', null)
      commit('CLEAR_MESSAGES')
    }
  },

  // 清空所有会话
  CLEAR_ALL_SESSIONS ({ commit }) {
    commit('SET_SESSIONS', [])
    commit('SET_SESSION_ID', null)
    commit('CLEAR_MESSAGES')
    localStorage.removeItem('ai-sessions')
  },

  // 插入 AI 响应到编辑器
  INSERT_TO_EDITOR ({ state }, messageId) {
    const message = state.messages.find(m => m.id === messageId)
    if (message && message.content) {
      ipcRenderer.send('mt::ai-insert-to-editor', { content: message.content })
    }
  }
}

export default { state, getters, mutations, actions }
