/**
 * AI Tools - 主进程工具执行模块
 * 提供文件操作、shell 命令等工具的实际执行
 */
import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { glob } from 'glob'

const execAsync = promisify(exec)

/**
 * 初始化工具 IPC 处理器
 */
export function initToolHandlers () {
  // 读取文件
  ipcMain.handle('ai:tool:read', async (event, { path: filePath, workingDirectory }) => {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workingDirectory, filePath)
      const content = await fs.readFile(fullPath, 'utf-8')
      return { success: true, output: content }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 写入文件
  ipcMain.handle('ai:tool:write', async (event, { path: filePath, content, workingDirectory, oldContent, diffPreview }) => {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workingDirectory, filePath)

      // 确保目录存在
      await fs.mkdir(path.dirname(fullPath), { recursive: true })

      await fs.writeFile(fullPath, content, 'utf-8')

      // 如果是AI修改的文件，发送特殊消息标记
      if (oldContent !== undefined || diffPreview) {
        const win = event.sender.getOwnerBrowserWindow()
        if (win) {
          win.webContents.send('mt::ai-file-modified', {
            pathname: fullPath,
            oldContent: oldContent || '',
            newContent: content,
            diffPreview: diffPreview || null
          })
        }
      }

      return { success: true, output: `Successfully wrote to ${filePath}` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 编辑文件
  ipcMain.handle('ai:tool:edit', async (event, { path: filePath, oldString, newString, workingDirectory, diffPreview }) => {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workingDirectory, filePath)
      const content = await fs.readFile(fullPath, 'utf-8')

      if (!content.includes(oldString)) {
        return { success: false, error: 'Old string not found in file' }
      }

      const newContent = content.replace(oldString, newString)
      await fs.writeFile(fullPath, newContent, 'utf-8')

      // 如果是AI修改的文件，发送特殊消息标记
      if (diffPreview) {
        const win = event.sender.getOwnerBrowserWindow()
        if (win) {
          win.webContents.send('mt::ai-file-modified', {
            pathname: fullPath,
            oldContent: content,
            newContent: newContent,
            diffPreview: diffPreview
          })
        }
      }

      return { success: true, output: `Successfully edited ${filePath}` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 执行 Bash 命令
  ipcMain.handle('ai:tool:bash', async (event, { command, workingDirectory }) => {
    try {
      // 安全检查：禁止某些危险命令
      const dangerousPatterns = [
        /rm\s+-rf\s+[/~]/i,
        /mkfs/i,
        /dd\s+if=/i,
        />\s*[/]dev[/]/i
      ]

      for (const pattern of dangerousPatterns) {
        if (pattern.test(command)) {
          return { success: false, error: 'This command is not allowed for safety reasons' }
        }
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDirectory,
        timeout: 60000, // 60 秒超时
        maxBuffer: 1024 * 1024 * 10 // 10MB
      })

      const output = stdout + (stderr ? `\nStderr: ${stderr}` : '')
      return { success: true, output: output || 'Command executed successfully (no output)' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Glob 文件搜索
  ipcMain.handle('ai:tool:glob', async (event, { pattern, workingDirectory }) => {
    try {
      const files = await glob(pattern, {
        cwd: workingDirectory,
        nodir: true,
        ignore: ['**/node_modules/**', '**/.git/**']
      })

      if (files.length === 0) {
        return { success: true, output: 'No files found matching the pattern' }
      }

      return { success: true, output: files.join('\n') }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Grep 搜索
  ipcMain.handle('ai:tool:grep', async (event, { pattern, path: searchPath, workingDirectory }) => {
    try {
      const targetPath = searchPath
        ? (path.isAbsolute(searchPath) ? searchPath : path.join(workingDirectory, searchPath))
        : workingDirectory

      // 使用 ripgrep 如果可用，否则使用 grep
      const isWindows = process.platform === 'win32'
      const cmd = isWindows
        ? `findstr /s /n /r "${pattern}" "${targetPath}\\*"`
        : `grep -r -n "${pattern}" "${targetPath}" --include="*" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -100`

      const { stdout } = await execAsync(cmd, {
        cwd: workingDirectory,
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 5
      })

      return { success: true, output: stdout || 'No matches found' }
    } catch (error) {
      // grep 没找到匹配时会返回非零退出码
      if (error.code === 1) {
        return { success: true, output: 'No matches found' }
      }
      return { success: false, error: error.message }
    }
  })

  // 列出目录
  ipcMain.handle('ai:tool:list', async (event, { path: dirPath, workingDirectory }) => {
    try {
      const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(workingDirectory, dirPath)
      const entries = await fs.readdir(fullPath, { withFileTypes: true })

      const result = entries.map(entry => {
        const type = entry.isDirectory() ? '[DIR]' : '[FILE]'
        return `${type} ${entry.name}`
      })

      return { success: true, output: result.join('\n') || 'Empty directory' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}

export default { initToolHandlers }
