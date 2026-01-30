import { ipcMain, BrowserWindow } from 'electron'
import https from 'https'
import http from 'http'
import { initToolHandlers } from './tools'

// 存储当前活动的请求，以便可以取消
const activeRequests = new Map()

/**
 * AI 服务模块 - 处理与 AI API 的通信
 */
class AIService {
  constructor () {
    this.setupIPC()
  }

  setupIPC () {
    // 处理发送消息请求
    ipcMain.on('mt::ai-send-message', async (event, data) => {
      const { messageId, messages, systemPrompt, config } = data
      const win = BrowserWindow.fromWebContents(event.sender)

      if (!win) return

      try {
        await this.streamChat(win, messageId, messages, systemPrompt, config)
      } catch (error) {
        win.webContents.send('mt::ai-response-error', {
          error: error.message || 'Unknown error occurred'
        })
      }
    })

    // 处理停止生成请求
    ipcMain.on('mt::ai-stop-generation', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win) {
        const request = activeRequests.get(win.id)
        if (request) {
          request.destroy()
          activeRequests.delete(win.id)
        }
      }
    })

    // 处理插入到编辑器请求
    ipcMain.on('mt::ai-insert-to-editor', (event, { content }) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win) {
        win.webContents.send('mt::ai-insert-content', { content })
      }
    })

    // 处理测试连接请求
    ipcMain.handle('ai::test-connection', async (event, config) => {
      return this.testConnection(config)
    })

    // 处理流式 AI 请求（支持工具调用）
    ipcMain.on('ai::stream-request', async (event, { url, options, requestId }) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return
      await this.streamRequest(win, url, options, requestId)
    })
  }

  /**
   * 流式 HTTP 请求代理（用于 renderer 进程）
   */
  async streamRequest (win, url, options, requestId) {
    return new Promise((resolve, reject) => {
      try {
        const urlObj = new URL(url)
        const isHttps = urlObj.protocol === 'https:'
        const httpModule = isHttps ? https : http

        const httpOptions = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + (urlObj.search || ''),
          method: options.method || 'POST',
          headers: options.headers || {},
          timeout: 60000
        }

        // 解析请求体以便记录
        let requestBodyObj = null
        try {
          if (options.body) {
            requestBodyObj = JSON.parse(options.body)
          }
        } catch (e) {
          // 忽略解析错误
        }

        console.log('[Main Process] HTTP Request:', {
          requestId,
          url,
          method: httpOptions.method,
          hostname: httpOptions.hostname,
          path: httpOptions.path,
          headers: Object.keys(httpOptions.headers),
          body: requestBodyObj ? {
            model: requestBodyObj.model,
            messagesCount: requestBodyObj.messages ? requestBodyObj.messages.length : 0,
            toolsCount: requestBodyObj.tools ? requestBodyObj.tools.length : 0,
            stream: requestBodyObj.stream,
            lastMessage: requestBodyObj.messages && requestBodyObj.messages.length > 0
              ? {
                  role: requestBodyObj.messages[requestBodyObj.messages.length - 1].role,
                  content: typeof requestBodyObj.messages[requestBodyObj.messages.length - 1].content === 'string'
                    ? requestBodyObj.messages[requestBodyObj.messages.length - 1].content.substring(0, 100)
                    : (Array.isArray(requestBodyObj.messages[requestBodyObj.messages.length - 1].content)
                      ? `[${requestBodyObj.messages[requestBodyObj.messages.length - 1].content.length} items]`
                      : requestBodyObj.messages[requestBodyObj.messages.length - 1].content)
                }
              : null
          } : null
        })

        let buffer = ''
        let chunkCount = 0
        let totalBytes = 0

        const req = httpModule.request(httpOptions, (res) => {
          console.log('[Main Process] HTTP Response:', {
            requestId,
            statusCode: res.statusCode,
            headers: Object.keys(res.headers)
          })

          if (res.statusCode !== 200) {
            let errorBody = ''
            res.on('data', chunk => { errorBody += chunk })
            res.on('end', () => {
              console.log('[Main Process] HTTP Error Response:', {
                requestId,
                statusCode: res.statusCode,
                body: errorBody.substring(0, 500)
              })
              win.webContents.send('ai::stream-response', {
                requestId,
                type: 'error',
                status: res.statusCode,
                body: errorBody
              })
              reject(new Error(`HTTP ${res.statusCode}: ${errorBody}`))
            })
            return
          }

          res.on('data', (chunk) => {
            chunkCount++
            totalBytes += chunk.length
            const chunkStr = chunk.toString()
            buffer += chunkStr

            // 记录前几个 chunk 的内容用于调试
            if (chunkCount <= 3) {
              console.log(`[Main Process] HTTP Chunk ${chunkCount}:`, chunkStr.substring(0, 200))
            }

            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.trim()) {
                win.webContents.send('ai::stream-response', {
                  requestId,
                  type: 'chunk',
                  data: line + '\n'
                })
              }
            }
          })

          res.on('end', () => {
            // 处理剩余的 buffer
            if (buffer.trim()) {
              win.webContents.send('ai::stream-response', {
                requestId,
                type: 'chunk',
                data: buffer + '\n'
              })
            }
            console.log('[Main Process] HTTP Stream Complete:', {
              requestId,
              chunkCount,
              totalBytes,
              remainingBuffer: buffer.substring(0, 100)
            })
            win.webContents.send('ai::stream-response', {
              requestId,
              type: 'done'
            })
            activeRequests.delete(win.id)
            resolve()
          })
        })

        req.on('error', (error) => {
          console.log('[Main Process] HTTP Request Error:', {
            requestId,
            error: error.message,
            code: error.code
          })
          activeRequests.delete(win.id)
          win.webContents.send('ai::stream-response', {
            requestId,
            type: 'error',
            error: error.message
          })
          reject(error)
        })

        req.on('timeout', () => {
          req.destroy()
          activeRequests.delete(win.id)
          win.webContents.send('ai::stream-response', {
            requestId,
            type: 'error',
            error: 'Request timeout'
          })
          reject(new Error('Request timeout'))
        })

        // 存储请求以便可以取消
        activeRequests.set(win.id, req)

        if (options.body) {
          req.write(options.body)
          console.log('[Main Process] Request body sent, size:', options.body.length)
        }
        req.end()
        console.log('[Main Process] Request sent to server')
      } catch (error) {
        win.webContents.send('ai::stream-response', {
          requestId,
          type: 'error',
          error: error.message
        })
        reject(error)
      }
    })
  }

  /**
   * 测试 AI 连接
   */
  async testConnection (config) {
    const { provider, model, apiKey, baseUrl } = config

    if (!apiKey) {
      return { success: false, error: 'API Key is required' }
    }

    const apiConfig = this.getApiConfig(provider, baseUrl, apiKey)

    // 构建完整的endpoint URL
    const endpoint = apiConfig.endpointPath
      ? `${apiConfig.baseUrl}${apiConfig.endpointPath}`
      : apiConfig.baseUrl

    // 发送一个简单的测试请求
    const requestBody = JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5,
      stream: false
    })

    return new Promise((resolve) => {
      const url = new URL(endpoint)
      const isHttps = url.protocol === 'https:'
      const httpModule = isHttps ? https : http

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...apiConfig.headers
        },
        timeout: 30000
      }

      const req = httpModule.request(options, (res) => {
        let body = ''
        res.on('data', chunk => { body += chunk })
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true, message: `Connected to ${provider} successfully! Model: ${model}` })
          } else {
            try {
              const error = JSON.parse(body)
              resolve({ success: false, error: error.error?.message || `HTTP ${res.statusCode}` })
            } catch {
              resolve({ success: false, error: `HTTP ${res.statusCode}: ${body.substring(0, 200)}` })
            }
          }
        })
      })

      req.on('error', (error) => {
        resolve({ success: false, error: error.message })
      })

      req.on('timeout', () => {
        req.destroy()
        resolve({ success: false, error: 'Connection timeout' })
      })

      req.write(requestBody)
      req.end()
    })
  }

  /**
   * 流式调用 AI API
   */
  async streamChat (win, messageId, messages, systemPrompt, config) {
    const { provider, model, apiKey, baseUrl, temperature, maxTokens } = config

    if (!apiKey) {
      throw new Error('API Key is required')
    }

    // 构建请求消息
    const requestMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

    // 根据提供商选择 API 端点
    const apiConfig = this.getApiConfig(provider, baseUrl, apiKey)

    // 构建完整的endpoint URL
    const endpoint = apiConfig.endpointPath
      ? `${apiConfig.baseUrl}${apiConfig.endpointPath}`
      : apiConfig.baseUrl

    const requestBody = JSON.stringify({
      model: model,
      messages: requestMessages,
      temperature: temperature || 0.7,
      max_tokens: maxTokens || 2048,
      stream: true
    })

    return new Promise((resolve, reject) => {
      const url = new URL(endpoint)
      const isHttps = url.protocol === 'https:'
      const httpModule = isHttps ? https : http

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...apiConfig.headers
        }
      }

      let fullContent = ''

      const req = httpModule.request(options, (res) => {
        if (res.statusCode !== 200) {
          let errorBody = ''
          res.on('data', chunk => { errorBody += chunk })
          res.on('end', () => {
            try {
              const errorJson = JSON.parse(errorBody)
              reject(new Error(errorJson.error?.message || `API Error: ${res.statusCode}`))
            } catch {
              reject(new Error(`API Error: ${res.statusCode} - ${errorBody}`))
            }
          })
          return
        }

        let buffer = ''

        res.on('data', (chunk) => {
          buffer += chunk.toString()
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') {
                win.webContents.send('mt::ai-response-chunk', {
                  messageId,
                  content: fullContent,
                  done: true
                })
                resolve()
                return
              }

              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content || ''
                if (delta) {
                  fullContent += delta
                  win.webContents.send('mt::ai-response-chunk', {
                    messageId,
                    content: fullContent,
                    done: false
                  })
                }
              } catch (e) {
                // 忽略解析错误，继续处理
              }
            }
          }
        })

        res.on('end', () => {
          // 处理剩余的 buffer
          if (buffer.trim()) {
            if (buffer.startsWith('data: ') && buffer.slice(6).trim() !== '[DONE]') {
              try {
                const parsed = JSON.parse(buffer.slice(6).trim())
                const delta = parsed.choices?.[0]?.delta?.content || ''
                if (delta) {
                  fullContent += delta
                }
              } catch (e) {
                // 忽略
              }
            }
          }

          win.webContents.send('mt::ai-response-chunk', {
            messageId,
            content: fullContent,
            done: true
          })
          activeRequests.delete(win.id)
          resolve()
        })
      })

      req.on('error', (error) => {
        activeRequests.delete(win.id)
        reject(error)
      })

      // 存储请求以便可以取消
      activeRequests.set(win.id, req)

      req.write(requestBody)
      req.end()
    })
  }

  /**
   * 获取 API 配置
   */
  getApiConfig (provider, customBaseUrl, apiKey) {
    // 如果提供了自定义baseUrl且不为空，则使用它
    const hasCustomBaseUrl = customBaseUrl && customBaseUrl.trim()

    const defaultConfigs = {
      openai: {
        baseUrl: 'https://api.openai.com/v1',
        endpointPath: '/chat/completions',
        headers: {}
      },
      anthropic: {
        baseUrl: 'https://api.anthropic.com/v1',
        endpointPath: '/messages',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      },
      deepseek: {
        baseUrl: 'https://api.deepseek.com/v1',
        endpointPath: '/chat/completions',
        headers: {}
      },
      openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1',
        endpointPath: '/chat/completions',
        headers: {
          'HTTP-Referer': 'https://marktext.app',
          'X-Title': 'MarkText'
        }
      },
      custom: {
        baseUrl: 'http://localhost:11434/v1',
        endpointPath: '/chat/completions',
        headers: {}
      }
    }

    const config = defaultConfigs[provider] || defaultConfigs.openai

    // 如果提供了自定义baseUrl，使用它作为baseUrl
    if (hasCustomBaseUrl) {
      const customUrl = customBaseUrl.trim()
      // 如果URL已经包含完整路径，直接使用；否则使用baseUrl + endpointPath
      if (customUrl.includes('/chat/completions') || customUrl.includes('/messages')) {
        return {
          ...config,
          baseUrl: customUrl,
          endpointPath: ''
        }
      } else {
        return {
          ...config,
          baseUrl: customUrl
        }
      }
    }

    return config
  }
}

// 导出单例
let aiService = null

export const initAIService = () => {
  if (!aiService) {
    aiService = new AIService()
    // 初始化 AI 工具处理器
    initToolHandlers()
  }
  return aiService
}

export default AIService
