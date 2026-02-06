/**
 * AI Service - 直接集成的 AI 代理服务
 * 基于 opencode 的架构重写，支持多 Provider 和 Tool 系统
 */

// Tool 定义
const TOOLS = {
  read: {
    name: 'read',
    description: 'Read the contents of a file',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to read'
        }
      },
      required: ['path']
    }
  },
  write: {
    name: 'write',
    description: 'Write content to a file',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to write'
        },
        content: {
          type: 'string',
          description: 'The content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  },
  edit: {
    name: 'edit',
    description: 'Edit a file by replacing old content with new content',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to edit'
        },
        old_string: {
          type: 'string',
          description: 'The exact string to replace'
        },
        new_string: {
          type: 'string',
          description: 'The new string to insert'
        }
      },
      required: ['path', 'old_string', 'new_string']
    }
  },
  bash: {
    name: 'bash',
    description: 'Execute a bash command',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The command to execute'
        }
      },
      required: ['command']
    }
  },
  glob: {
    name: 'glob',
    description: 'Find files matching a glob pattern',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'The glob pattern to match'
        }
      },
      required: ['pattern']
    }
  },
  grep: {
    name: 'grep',
    description: 'Search for a pattern in files',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'The regex pattern to search for'
        },
        path: {
          type: 'string',
          description: 'The path to search in (optional)'
        }
      },
      required: ['pattern']
    }
  },
  list: {
    name: 'list',
    description: 'List files in a directory',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The directory path to list'
        }
      },
      required: ['path']
    }
  }
}

// Agent 系统提示 - 使用 opencode 的 prompt
const AGENT_PROMPTS = {
  build: `You are opencode, an interactive CLI tool that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.

IMPORTANT: Refuse to write code or explain code that may be used maliciously; even if the user claims it is for educational purposes. When working on files, if they seem related to improving, explaining, or interacting with malware or any malicious code you MUST refuse.
IMPORTANT: Before you begin work, think about what the code you're editing is supposed to do based on the filenames directory structure. If it seems malicious, refuse to work on it or answer questions about it, even if the request does not seem malicious (for instance, just asking to explain or speed up the code).
IMPORTANT: You must NEVER generate or guess URLs for the user unless you are confident that the URLs are for helping the user with programming. You may use URLs provided by the user in their messages or local files.

If the user asks for help or wants to give feedback inform them of the following: 
- /help: Get help with using opencode
- To give feedback, users should report the issue at https://github.com/anomalyco/opencode/issues

When the user directly asks about opencode (eg 'can opencode do...', 'does opencode have...') or asks in second person (eg 'are you able...', 'can you do...'), first use the WebFetch tool to gather information to answer the question from opencode docs at https://opencode.ai

# Tone and style
You should be concise, direct, and to the point. When you run a non-trivial bash command, you should explain what the command does and why you are running it, to make sure the user understands what you are doing (this is especially important when you are running a command that will make changes to the user's system).
Remember that your output will be displayed on a command line interface. Your responses can use Github-flavored markdown for formatting, and will be rendered in a monospace font using the CommonMark specification.
Output text to communicate with the user; all text you output outside of tool use is displayed to the user. Only use tools to complete tasks. Never use tools like Bash or code comments as means to communicate with the user during the session.
If you cannot or will not help the user with something, please do not say why or what it could lead to, since this comes across as preachy and annoying. Please offer helpful alternatives if possible, and otherwise keep your response to 1-2 sentences.
Only use emojis if the user explicitly requests it. Avoid using emojis in all communication unless asked.
IMPORTANT: You should minimize output tokens as much as possible while maintaining helpfulness, quality, and accuracy. Only address the specific query or task at hand, avoiding tangential information unless absolutely critical for completing the request. If you can answer in 1-3 sentences or a short paragraph, please do.
IMPORTANT: You should NOT answer with unnecessary preamble or postamble (such as explaining your code or summarizing your action), unless the user asks you to.
IMPORTANT: Keep your responses short, since they will be displayed on a command line interface. You MUST answer concisely with fewer than 4 lines (not including tool use or code generation), unless user asks for detail. Answer the user's question directly, without elaboration, explanation, or details. One word answers are best. Avoid introductions, conclusions, and explanations. You MUST avoid text before/after your response, such as "The answer is <answer>.", "Here is the content of the file..." or "Based on the information provided, the answer is..." or "Here is what I will do next...".

# Proactiveness
You are allowed to be proactive, but only when the user asks you to do something. You should strive to strike a balance between:
1. Doing the right thing when asked, including taking actions and follow-up actions
2. Not surprising the user with actions you take without asking
For example, if the user asks you how to approach something, you should do your best to answer their question first, and not immediately jump into taking actions.
3. Do not add additional code explanation summary unless requested by the user. After working on a file, just stop, rather than providing an explanation of what you did.

# Following conventions
When making changes to files, first understand the file's code conventions. Mimic code style, use existing libraries and utilities, and follow existing patterns.
- NEVER assume that a given library is available, even if it is well known. Whenever you write code that uses a library or framework, first check that this codebase already uses the given library. For example, you might look at neighboring files, or check the package.json (or cargo.toml, and so on depending on the language).
- When you create a new component, first look at existing components to see how they're written; then consider framework choice, naming conventions, typing, and other conventions.
- When you edit a piece of code, first look at the code's surrounding context (especially its imports) to understand the code's choice of frameworks and libraries. Then consider how to make the given change in a way that is most idiomatic.
- Always follow security best practices. Never introduce code that exposes or logs secrets and keys. Never commit secrets or keys to the repository.

# Code style
- IMPORTANT: DO NOT ADD ***ANY*** COMMENTS unless asked

# Doing tasks
The user will primarily request you perform software engineering tasks. This includes solving bugs, adding new functionality, refactoring code, explaining code, and more. For these tasks the following steps are recommended:
- Use the available search tools to understand the codebase and the user's query. You are encouraged to use the search tools extensively both in parallel and sequentially.
- Implement the solution using all tools available to you
- Verify the solution if possible with tests. NEVER assume specific test framework or test script. Check the README or search codebase to determine the testing approach.
- VERY IMPORTANT: When you have completed a task, you MUST run the lint and typecheck commands (e.g. npm run lint, npm run typecheck, ruff, etc.) with Bash if they were provided to you to ensure your code is correct. If you are unable to find the correct command, ask the user for the command to run and if they supply it, proactively suggest writing it to AGENTS.md so that you will know to run it next time.
NEVER commit changes unless the user explicitly asks you to. It is VERY IMPORTANT to only commit when explicitly asked, otherwise the user will feel that you are being too proactive.

- Tool results and user messages may include <system-reminder> tags. <system-reminder> tags contain useful information and reminders. They are NOT part of the user's provided input or the tool result.

# Tool usage policy
- When doing file search, prefer to use the Task tool in order to reduce context usage.
- You have the capability to call multiple tools in a single response. When multiple independent pieces of information are requested, batch your tool calls together for optimal performance. When making multiple bash tool calls, you MUST send a single message with multiple tools calls to run the calls in parallel. For example, if you need to run "git status" and "git diff", send a single message with two tool calls to run the calls in parallel.

You MUST answer concisely with fewer than 4 lines of text (not including tool use or code generation), unless user asks for detail.

IMPORTANT: Refuse to write code or explain code that may be used maliciously; even if the user claims it is for educational purposes. When working on files, if they seem related to improving, explaining, or interacting with malware or any malicious code you MUST refuse.
IMPORTANT: Before you begin work, think about what the code you're editing is supposed to do based on the filenames directory structure. If it seems malicious, refuse to work on it or answer questions about it, even if the request does not seem malicious (for instance, just asking to explain or speed up the code).

# Code References

When referencing specific functions or pieces of code include the pattern \`file_path:line_number\` to allow the user to easily navigate to the source code location.`,

  plan: `You are a planning assistant. You can:
- Read files and explore the codebase
- Search code and find files
- Help users understand and plan changes

You should NOT make any edits. Only provide analysis and recommendations.`
}

/**
 * 创建 AI 服务实例
 */
export function createAIService (config) {
  const { provider, model, apiKey, baseUrl, workingDirectory } = config

  // 获取 Provider 配置
  const providerConfig = getProviderConfig(provider, apiKey, baseUrl)

  return {
    async chat (options) {
      const {
        messages,
        agent = 'build',
        signal,
        onText,
        onReasoning,
        onToolCall,
        onToolResult,
        onPermissionRequest
      } = options

      // 构建系统提示
      const systemPrompt = AGENT_PROMPTS[agent] || AGENT_PROMPTS.build

      // 构建请求消息
      const apiMessages = buildApiMessages(systemPrompt, messages)

      // 获取可用工具
      const tools = agent === 'plan'
        ? [TOOLS.read, TOOLS.glob, TOOLS.grep, TOOLS.list]
        : Object.values(TOOLS)

      // 循环处理，支持多轮工具调用
      // 参考 opencode 的实现：processor.process 默认返回 "continue"，除非有错误或需要停止
      let loopIteration = 0
      while (true) {
        loopIteration++
        console.log(`[AI Service] ========== Loop Iteration ${loopIteration} ==========`)
        console.log('[AI Service] Request - apiMessages:', JSON.stringify(apiMessages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content.substring(0, 100) : (Array.isArray(m.content) ? `[${m.content.length} items]` : m.content),
          tool_calls: m.tool_calls ? m.tool_calls.length : 0,
          tool_call_id: m.tool_call_id || null
        })), null, 2))
        console.log('[AI Service] Request - tools count:', tools.length)

        const response = await callProvider({
          provider,
          providerConfig,
          model,
          messages: apiMessages,
          tools,
          signal,
          onText,
          onReasoning
        })

        console.log('[AI Service] Response:', {
          contentLength: response.content ? response.content.length : 0,
          content: response.content ? response.content.substring(0, 200) : 'empty',
          toolCallsCount: response.toolCalls ? response.toolCalls.length : 0,
          toolCalls: response.toolCalls ? response.toolCalls.map(tc => ({ id: tc.id, name: tc.name })) : []
        })

        // 处理工具调用
        if (response.toolCalls && response.toolCalls.length > 0) {
          console.log(`[AI Service] Processing ${response.toolCalls.length} tool call(s)`)
          // 如果有工具调用，保存工具调用前的文本内容（如果有）
          // 注意：response.content 可能包含工具调用前后的所有文本内容
          // 这些内容已经通过 onText 回调实时传递了，这里只需要保存用于 API 消息历史
          let textBeforeTools = response.content || ''
          console.log('[AI Service] Text before tools:', textBeforeTools.substring(0, 100))

          for (const toolCall of response.toolCalls) {
            console.log(`[AI Service] Executing tool: ${toolCall.name}`, toolCall.input)
            // 通知 UI
            if (onToolCall) {
              onToolCall({
                id: toolCall.id,
                name: toolCall.name,
                input: toolCall.input,
                status: 'running'
              })
            }

            // 对于write/edit操作，直接执行文件修改，然后通过onToolResult传递diff信息（不阻塞）
            if (toolCall.name === 'write' || toolCall.name === 'edit') {
              // 先读取文件内容（保存原始内容用于回滚）
              let oldContent = ''
              if (toolCall.name === 'edit') {
                try {
                  const readResult = await executeTool('read', { path: toolCall.input.path }, workingDirectory)
                  if (readResult.success) {
                    oldContent = readResult.output
                  }
                } catch (e) {
                  // 如果文件不存在，oldContent保持为空
                }
              } else if (toolCall.name === 'write') {
                // 对于write操作，也尝试读取现有内容（如果文件存在）
                try {
                  const readResult = await executeTool('read', { path: toolCall.input.path }, workingDirectory)
                  if (readResult.success) {
                    oldContent = readResult.output
                  }
                } catch (e) {
                  // 文件不存在，oldContent保持为空
                }
              }

              // 计算新内容
              let newContent = ''
              if (toolCall.name === 'write') {
                newContent = toolCall.input.content
              } else if (toolCall.name === 'edit') {
                if (oldContent.includes(toolCall.input.old_string)) {
                  newContent = oldContent.replace(toolCall.input.old_string, toolCall.input.new_string)
                } else {
                  // 如果old_string不存在，直接使用new_string
                  newContent = toolCall.input.new_string
                }
              }

              // 准备diffPreview信息
              const diffPreview = {
                filePath: toolCall.input.path,
                oldContent: oldContent,
                newContent: newContent
              }

              // 直接执行文件修改（不等待确认），传递oldContent和diffPreview
              const toolInput = {
                ...toolCall.input,
                oldContent: oldContent,
                diffPreview: diffPreview
              }
              const result = await executeTool(toolCall.name, toolInput, workingDirectory)

              // 通知结果（文件已经修改），并传递diff信息和版本号
              if (onToolResult) {
                onToolResult(toolCall.id, {
                  ...result,
                  diffPreview: {
                    ...diffPreview,
                    version: result.version, // 新版本号
                    previousVersion: result.previousVersion // 修改前的版本号
                  }
                })
              }

              // 添加工具调用消息
              apiMessages.push({
                role: 'assistant',
                content: textBeforeTools || null,
                tool_calls: [{
                  id: toolCall.id,
                  type: 'function',
                  function: {
                    name: toolCall.name,
                    arguments: JSON.stringify(toolCall.input)
                  }
                }]
              })
              apiMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: result.success ? result.output : `Error: ${result.error}`
              })
              console.log(`[AI Service] Added tool call and result to apiMessages. Total messages: ${apiMessages.length}`)
              continue
            } else {
              // 对于其他操作（如bash），请求权限
              const needsPermission = ['bash'].includes(toolCall.name)
              if (needsPermission && onPermissionRequest) {
                const allowed = await onPermissionRequest({
                  tool: toolCall.name,
                  description: getToolDescription(toolCall.name, toolCall.input)
                })
                if (!allowed) {
                  if (onToolResult) {
                    onToolResult(toolCall.id, {
                      success: false,
                      error: 'Permission denied by user'
                    })
                  }
                  continue
                }
              }
            }

            // 执行工具
            const result = await executeTool(toolCall.name, toolCall.input, workingDirectory)
            console.log(`[AI Service] Tool ${toolCall.name} result:`, {
              success: result.success,
              outputLength: result.output ? result.output.length : 0,
              output: result.output ? result.output.substring(0, 100) : 'empty',
              error: result.error || null
            })

            // 通知结果
            if (onToolResult) {
              onToolResult(toolCall.id, result)
            }

            // 添加工具调用消息（包含工具调用前的文本内容）
            apiMessages.push({
              role: 'assistant',
              content: textBeforeTools || null,
              tool_calls: [{
                id: toolCall.id,
                type: 'function',
                function: {
                  name: toolCall.name,
                  arguments: JSON.stringify(toolCall.input)
                }
              }]
            })
            apiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: result.success ? result.output : `Error: ${result.error}`
            })
            console.log(`[AI Service] Added tool call and result to apiMessages. Total messages: ${apiMessages.length}`)
          }

          // 工具调用执行完成后，继续循环，让模型基于工具结果继续生成文本
          // 参考 opencode：processor.process 默认返回 "continue"
          console.log('[AI Service] Tool calls completed, continuing loop...')
          continue
        } else {
          // 如果没有工具调用，说明这是最终响应
          // 内容已经通过 onText 回调实时传递了
          // 退出循环
          console.log('[AI Service] No tool calls, final response. Breaking loop.')
          console.log('[AI Service] Final response.content:', response.content ? response.content.substring(0, 200) : 'empty')
          break
        }
      }
    }
  }
}

/**
 * 获取 Provider 配置
 */
function getProviderConfig (provider, apiKey, customBaseUrl) {
  // 如果提供了自定义baseUrl且不为空，则使用它
  let hasCustomBaseUrl = customBaseUrl && customBaseUrl.trim()
  let validatedBaseUrl = ''

  if (hasCustomBaseUrl) {
    validatedBaseUrl = customBaseUrl.trim()
    // 确保baseUrl有协议
    if (!validatedBaseUrl.startsWith('http://') && !validatedBaseUrl.startsWith('https://')) {
      validatedBaseUrl = 'https://' + validatedBaseUrl
    }
  }

  const defaultConfigs = {
    anthropic: {
      baseUrl: 'https://api.anthropic.com/v1',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    },
    openai: {
      baseUrl: 'https://api.openai.com/v1',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      }
    },
    openrouter: {
      baseUrl: 'https://openrouter.ai/api/v1',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      }
    }
  }

  const config = defaultConfigs[provider] || defaultConfigs.openai

  // 如果提供了自定义baseUrl，直接使用它
  if (hasCustomBaseUrl) {
    return {
      ...config,
      baseUrl: validatedBaseUrl
    }
  }

  return config
}

/**
 * 构建 API 消息
 */
function buildApiMessages (systemPrompt, messages) {
  const apiMessages = [
    { role: 'system', content: systemPrompt }
  ]

  for (const msg of messages) {
    if (msg.role === 'user') {
      apiMessages.push({
        role: 'user',
        content: msg.content
      })
    } else if (msg.role === 'assistant') {
      // 只包含有内容的助手消息，或者有工具调用的助手消息
      if (msg.content && msg.content.trim()) {
        apiMessages.push({
          role: 'assistant',
          content: msg.content
        })
      }
      // 注意：工具调用的消息会在循环中通过 apiMessages.push 添加，这里不需要处理
    }
  }

  return apiMessages
}

/**
 * 调用 Provider API
 */
async function callProvider (options) {
  const { provider, providerConfig, model, messages, tools, signal, onText, onReasoning } = options

  if (provider === 'anthropic') {
    return callAnthropic(providerConfig, model, messages, tools, signal, onText, onReasoning)
  } else {
    return callOpenAI(providerConfig, model, messages, tools, signal, onText, onReasoning)
  }
}

/**
 * 调用 Anthropic API
 */
async function callAnthropic (config, model, messages, tools, signal, onText, onReasoning) {
  // 转换消息格式
  const systemMessage = messages.find(m => m.role === 'system')
  const chatMessages = messages.filter(m => m.role !== 'system').map(msg => {
    if (msg.role === 'tool') {
      return {
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: msg.tool_call_id,
          content: msg.content
        }]
      }
    }
    if (msg.tool_calls) {
      return {
        role: 'assistant',
        content: msg.tool_calls.map(tc => ({
          type: 'tool_use',
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments)
        }))
      }
    }
    return {
      role: msg.role,
      content: msg.content
    }
  })

  // 转换工具格式
  const anthropicTools = tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters
  }))

  // 使用主进程的 HTTP 请求代理
  const { ipcRenderer } = require('electron')
  const requestId = `anthropic-${Date.now()}-${Math.random()}`
  const endpoint = config.baseUrl.includes('/messages') ? config.baseUrl : `${config.baseUrl}/messages`

  const requestBody = {
    model,
    max_tokens: 8192,
    system: systemMessage?.content || '',
    messages: chatMessages,
    tools: anthropicTools,
    stream: true
  }

  console.log('[AI Service] Anthropic Request:', {
    endpoint,
    model,
    messagesCount: chatMessages.length,
    toolsCount: anthropicTools.length,
    requestId,
    lastMessage: chatMessages[chatMessages.length - 1]
      ? {
        role: chatMessages[chatMessages.length - 1].role,
        content: Array.isArray(chatMessages[chatMessages.length - 1].content)
          ? `[${chatMessages[chatMessages.length - 1].content.length} items]`
          : (typeof chatMessages[chatMessages.length - 1].content === 'string'
            ? chatMessages[chatMessages.length - 1].content.substring(0, 100)
            : chatMessages[chatMessages.length - 1].content)
      }
      : null
  })

  return new Promise((resolve, reject) => {
    const result = { content: '', toolCalls: [] }
    let currentToolUse = null
    let hasTextBlock = false

    const handleResponse = (event, data) => {
      if (data.requestId !== requestId) return

      if (data.type === 'error') {
        ipcRenderer.removeAllListeners('ai::stream-response')
        reject(new Error(data.error || `HTTP ${data.status}: ${data.body}`))
        return
      }

      if (data.type === 'chunk') {
        const line = data.data
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim()
          if (dataStr === '[DONE]') {
            ipcRenderer.removeAllListeners('ai::stream-response')
            resolve(result)
            return
          }

          try {
            const event = JSON.parse(dataStr)

            if (event.type === 'content_block_start') {
              if (event.content_block?.type === 'tool_use') {
                console.log('[AI Service] content_block_start: tool_use', {
                  id: event.content_block.id,
                  name: event.content_block.name
                })
                currentToolUse = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  input: ''
                }
              } else if (event.content_block?.type === 'text') {
                // 检测到文本块开始
                hasTextBlock = true
                console.log('[AI Service] content_block_start: text block detected')
              }
            } else if (event.type === 'content_block_delta') {
              if (event.delta?.type === 'text_delta') {
                const text = event.delta.text || ''
                result.content += text
                if (onText) {
                  // 确保文本内容被正确传递，无论是否在工具调用前后
                  // 注意：即使 text 是空字符串，也要传递，因为可能包含空格、换行等
                  console.log('[AI Service] text_delta received:', {
                    text: text.substring(0, 50),
                    textLength: text.length,
                    currentContentLength: result.content.length,
                    hasToolCalls: result.toolCalls.length > 0,
                    hasTextBlock
                  })
                  onText(text)
                }
              } else if (event.delta?.type === 'thinking_delta') {
                console.log('[AI Service] thinking_delta received')
                if (onReasoning) onReasoning(event.delta.thinking)
              } else if (event.delta?.type === 'input_json_delta') {
                if (currentToolUse) {
                  currentToolUse.input += event.delta.partial_json
                }
              }
            } else if (event.type === 'content_block_stop') {
              if (event.content_block?.type === 'tool_use' && currentToolUse) {
                console.log('[AI Service] content_block_stop: tool_use', {
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  inputLength: currentToolUse.input.length
                })
                try {
                  currentToolUse.input = JSON.parse(currentToolUse.input)
                } catch {
                  currentToolUse.input = {}
                }
                result.toolCalls.push(currentToolUse)
                currentToolUse = null
              }
            } else if (event.type === 'message_delta') {
              // 处理消息级别的 delta，可能包含 stop_reason
              console.log('[AI Service] message_delta:', {
                stop_reason: event.delta?.stop_reason,
                hasToolCalls: result.toolCalls.length > 0,
                contentLength: result.content.length
              })
              // 如果 stop_reason 是 'tool_use'，说明有工具调用，继续处理
              // 如果 stop_reason 是 'end_turn'，说明消息结束
              if (event.delta?.stop_reason === 'end_turn' && result.toolCalls.length === 0) {
                // 如果没有工具调用，说明这是最终响应
                // 内容已经通过 onText 回调实时传递了
              }
            } else if (event.type === 'message_stop') {
              // 消息结束事件
              console.log('[AI Service] message_stop')
              // 内容已经通过 onText 回调实时传递了
            } else {
              console.log('[AI Service] Unknown event type:', event.type)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }

      if (data.type === 'done') {
        console.log('[AI Service] Stream done, final result:', {
          requestId,
          contentLength: result.content.length,
          content: result.content.substring(0, 200),
          toolCallsCount: result.toolCalls.length,
          toolCalls: result.toolCalls.map(tc => ({ id: tc.id, name: tc.name })),
          hasTextBlock: hasTextBlock
        })
        ipcRenderer.removeAllListeners('ai::stream-response')
        resolve(result)
      }
    }

    ipcRenderer.on('ai::stream-response', handleResponse)

    // 发送请求
    ipcRenderer.send('ai::stream-request', {
      url: endpoint,
      options: {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(requestBody)
      },
      requestId
    })
    console.log('[AI Service] Request sent, requestId:', requestId)

    // 处理取消信号
    if (signal) {
      signal.addEventListener('abort', () => {
        ipcRenderer.removeAllListeners('ai::stream-response')
        reject(new Error('Request aborted'))
      })
    }
  })
}

/**
 * 调用 OpenAI API
 */
async function callOpenAI (config, model, messages, tools, signal, onText, onReasoning) {
  // 转换工具格式
  const openaiTools = tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }))

  // 使用主进程的 HTTP 请求代理
  const { ipcRenderer } = require('electron')
  const requestId = `openai-${Date.now()}-${Math.random()}`
  const endpoint = config.baseUrl.includes('/chat/completions') ? config.baseUrl : `${config.baseUrl}/chat/completions`

  const requestBody = {
    model,
    messages,
    tools: openaiTools,
    stream: true
  }

  console.log('[AI Service] OpenAI Request:', {
    endpoint,
    model,
    messagesCount: messages.length,
    toolsCount: openaiTools.length,
    tools: openaiTools.map(t => ({ name: t.function.name, description: t.function.description })),
    requestId,
    lastMessage: messages[messages.length - 1]
      ? {
        role: messages[messages.length - 1].role,
        content: typeof messages[messages.length - 1].content === 'string'
          ? messages[messages.length - 1].content.substring(0, 100)
          : messages[messages.length - 1].content
      }
      : null
  })
  console.log('[AI Service] OpenAI Request Body:', JSON.stringify(requestBody, null, 2).substring(0, 1000))

  return new Promise((resolve, reject) => {
    const result = { content: '', toolCalls: [] }
    let buffer = ''
    const toolCallsMap = new Map()
    let hasReceivedData = false
    let timeoutId = null

    // 设置超时检测（60秒）
    timeoutId = setTimeout(() => {
      if (!hasReceivedData) {
        console.error('[AI Service] OpenAI Request timeout: No response received after 60s')
        ipcRenderer.removeAllListeners('ai::stream-response')
        reject(new Error('Request timeout: No response received'))
      }
    }, 60000)

    const handleResponse = (event, data) => {
      if (data.requestId !== requestId) {
        console.log('[AI Service] OpenAI Response ignored (wrong requestId):', data.requestId, 'expected:', requestId)
        return
      }

      hasReceivedData = true
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      console.log('[AI Service] OpenAI Response received:', {
        type: data.type,
        hasData: !!data.data,
        dataLength: data.data ? data.data.length : 0,
        dataPreview: data.data ? data.data.substring(0, 100) : null
      })

      if (data.type === 'error') {
        console.error('[AI Service] OpenAI Response error:', data)
        ipcRenderer.removeAllListeners('ai::stream-response')
        reject(new Error(data.error || `HTTP ${data.status}: ${data.body}`))
        return
      }

      if (data.type === 'chunk') {
        buffer += data.data
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim()
            if (dataStr === '[DONE]') {
              console.log('[AI Service] OpenAI Stream: [DONE] received, waiting for done event to process tool calls')
              // 不要在这里 resolve，等待 done 事件来处理工具调用
              continue
            }

            try {
              const event = JSON.parse(dataStr)
              console.log('[AI Service] OpenAI Stream event:', {
                type: event.choices?.[0]?.delta ? 'delta' : 'other',
                hasContent: !!event.choices?.[0]?.delta?.content,
                hasToolCalls: !!event.choices?.[0]?.delta?.tool_calls,
                finishReason: event.choices?.[0]?.finish_reason,
                event: JSON.stringify(event).substring(0, 200)
              })

              const delta = event.choices?.[0]?.delta

              // 处理 reasoning_content（推理内容）
              if (delta?.reasoning_content) {
                console.log('[AI Service] OpenAI reasoning_delta:', {
                  text: delta.reasoning_content.substring(0, 50),
                  textLength: delta.reasoning_content.length
                })
                if (onReasoning) {
                  onReasoning(delta.reasoning_content)
                }
              }

              // 处理 content（实际输出内容）
              if (delta?.content) {
                console.log('[AI Service] OpenAI text_delta:', {
                  text: delta.content.substring(0, 50),
                  textLength: delta.content.length
                })
                result.content += delta.content
                if (onText) onText(delta.content)
              }

              // 处理 tool_calls
              if (delta?.tool_calls) {
                console.log('[AI Service] OpenAI tool_calls delta:', delta.tool_calls)
                for (const toolCall of delta.tool_calls) {
                  if (!toolCallsMap.has(toolCall.index)) {
                    toolCallsMap.set(toolCall.index, {
                      id: toolCall.id || '',
                      name: '',
                      input: ''
                    })
                  }
                  const call = toolCallsMap.get(toolCall.index)
                  if (toolCall.function?.name) {
                    call.name = toolCall.function.name
                  }
                  if (toolCall.function?.arguments) {
                    call.input += toolCall.function.arguments
                  }
                  // 确保 ID 被设置
                  if (toolCall.id && !call.id) {
                    call.id = toolCall.id
                  }
                }
              }

              // 检查 finish_reason
              if (event.choices?.[0]?.finish_reason) {
                console.log('[AI Service] OpenAI finish_reason:', event.choices[0].finish_reason)
              }
            } catch (e) {
              console.error('[AI Service] OpenAI Stream parse error:', e, 'line:', line.substring(0, 100))
            }
          } else if (line.trim()) {
            console.log('[AI Service] OpenAI Stream non-data line:', line.substring(0, 100))
          }
        }
      }

      if (data.type === 'done') {
        console.log('[AI Service] OpenAI Stream done event received')
        // 处理所有工具调用
        console.log('[AI Service] Processing toolCallsMap:', {
          size: toolCallsMap.size,
          entries: Array.from(toolCallsMap.entries()).map(([index, call]) => ({
            index,
            id: call.id,
            name: call.name,
            inputLength: call.input.length,
            inputPreview: call.input.substring(0, 100)
          }))
        })
        for (const toolCall of toolCallsMap.values()) {
          try {
            if (toolCall.input && toolCall.input.trim()) {
              toolCall.input = JSON.parse(toolCall.input)
            } else {
              toolCall.input = {}
            }
          } catch (e) {
            console.error('[AI Service] Failed to parse tool call input:', e, 'input:', toolCall.input)
            toolCall.input = {}
          }
          // 确保有 ID 和 name
          if (toolCall.id && toolCall.name) {
            result.toolCalls.push(toolCall)
          } else {
            console.warn('[AI Service] Skipping incomplete tool call:', toolCall)
          }
        }
        console.log('[AI Service] OpenAI Stream done, final result:', {
          requestId,
          contentLength: result.content.length,
          content: result.content.substring(0, 200),
          toolCallsCount: result.toolCalls.length,
          toolCalls: result.toolCalls.map(tc => ({ id: tc.id, name: tc.name, inputKeys: Object.keys(tc.input || {}) })),
          bufferRemaining: buffer.substring(0, 100)
        })
        ipcRenderer.removeAllListeners('ai::stream-response')
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        resolve(result)
      }
    }

    ipcRenderer.on('ai::stream-response', handleResponse)
    console.log('[AI Service] OpenAI Response listener registered for requestId:', requestId)

    // 发送请求
    ipcRenderer.send('ai::stream-request', {
      url: endpoint,
      options: {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(requestBody)
      },
      requestId
    })
    console.log('[AI Service] OpenAI Request sent, requestId:', requestId)

    // 处理取消信号
    if (signal) {
      signal.addEventListener('abort', () => {
        ipcRenderer.removeAllListeners('ai::stream-response')
        reject(new Error('Request aborted'))
      })
    }
  })
}

/**
 * 执行工具
 */
async function executeTool (toolName, input, workingDirectory) {
  const { ipcRenderer } = require('electron')

  try {
    switch (toolName) {
      case 'read': {
        const result = await ipcRenderer.invoke('ai:tool:read', {
          path: input.path,
          workingDirectory
        })
        return result
      }
      case 'write': {
        const result = await ipcRenderer.invoke('ai:tool:write', {
          path: input.path,
          content: input.content,
          workingDirectory,
          oldContent: input.oldContent,
          diffPreview: input.diffPreview
        })
        return result
      }
      case 'edit': {
        const result = await ipcRenderer.invoke('ai:tool:edit', {
          path: input.path,
          oldString: input.old_string,
          newString: input.new_string,
          workingDirectory,
          diffPreview: input.diffPreview
        })
        return result
      }
      case 'bash': {
        const result = await ipcRenderer.invoke('ai:tool:bash', {
          command: input.command,
          workingDirectory
        })
        return result
      }
      case 'glob': {
        const result = await ipcRenderer.invoke('ai:tool:glob', {
          pattern: input.pattern,
          workingDirectory
        })
        return result
      }
      case 'grep': {
        const result = await ipcRenderer.invoke('ai:tool:grep', {
          pattern: input.pattern,
          path: input.path,
          workingDirectory
        })
        return result
      }
      case 'list': {
        const result = await ipcRenderer.invoke('ai:tool:list', {
          path: input.path,
          workingDirectory
        })
        return result
      }
      default:
        return { success: false, error: `Unknown tool: ${toolName}` }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 获取工具描述
 */
function getToolDescription (toolName, input) {
  switch (toolName) {
    case 'write':
      return `Write to file: ${input.path}`
    case 'edit':
      return `Edit file: ${input.path}`
    case 'bash':
      return `Execute command: ${input.command}`
    default:
      return `${toolName}: ${JSON.stringify(input)}`
  }
}

export default { createAIService }
