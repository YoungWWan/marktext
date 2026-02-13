/**
 * 文件变更追踪 IPC 处理器
 * 提供主进程和渲染进程之间的通信接口
 */
import { ipcMain, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import { getFileChangeTrackerManager } from './fileChangeTracker'

/**
 * 初始化文件变更追踪 IPC 处理器
 * @param {Object} options - 配置选项
 * @param {Function} options.getWatcher - 获取watcher实例的函数，接收windowId作为参数
 */
function initFileChangeTrackerIPC (options = {}) {
  const manager = getFileChangeTrackerManager()
  const { getWatcher } = options

  // 记录文件变更
  ipcMain.handle('file-tracker:record-change', async (event, { filePath, oldContent, newContent, metadata }) => {
    try {
      const result = await manager.recordChange(filePath, oldContent, newContent, metadata)
      return { success: true, ...result }
    } catch (error) {
      console.error('Error recording file change:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取当前内容
  ipcMain.handle('file-tracker:get-current-content', async (event, { filePath }) => {
    try {
      const content = await manager.getCurrentContent(filePath)
      return { success: true, content }
    } catch (error) {
      console.error('Error getting current content:', error)
      return { success: false, error: error.message }
    }
  })

  // 撤销
  ipcMain.handle('file-tracker:undo', async (event, { filePath }) => {
    try {
      // 在undo操作之前，告诉文件监听器忽略这次文件变更事件
      // 这样可以避免文件监听器在undo写回文件后重新加载文件，覆盖undo的结果
      // 使用更长的持续时间，确保文件监听器的所有事件都被忽略
      if (getWatcher) {
        try {
          const win = BrowserWindow.fromWebContents(event.sender)
          if (win) {
            const watcher = getWatcher(win.id)
            if (watcher) {
              // 使用更长的持续时间（3秒），确保文件监听器的所有事件都被忽略
              const duration = 3000
              watcher.ignoreChangedEvent(win.id, filePath, duration)
              console.log(`[FileTracker] Ignoring file change events for ${filePath} for ${duration}ms (undo)`)
            }
          }
        } catch (err) {
          // 如果获取watcher失败，继续执行undo操作
          console.warn('Failed to ignore file change event for undo:', err)
        }
      }

      const result = await manager.undo(filePath)
      return result
    } catch (error) {
      console.error('Error undoing file change:', error)
      return { success: false, error: error.message }
    }
  })

  // 重做
  ipcMain.handle('file-tracker:redo', async (event, { filePath }) => {
    try {
      const result = await manager.redo(filePath)
      return result
    } catch (error) {
      console.error('Error redoing file change:', error)
      return { success: false, error: error.message }
    }
  })

  // 跳转到指定版本
  ipcMain.handle('file-tracker:goto-version', async (event, { filePath, targetVersion }) => {
    try {
      // 在gotoVersion操作之前，告诉文件监听器忽略这次文件变更事件
      // 这样可以避免文件监听器在gotoVersion写回文件后重新加载文件，覆盖gotoVersion的结果
      // 使用更长的持续时间，确保文件监听器的所有事件都被忽略
      if (getWatcher) {
        try {
          const win = BrowserWindow.fromWebContents(event.sender)
          if (win) {
            const watcher = getWatcher(win.id)
            if (watcher) {
              // 使用更长的持续时间（3秒），确保文件监听器的所有事件都被忽略
              const duration = 3000
              watcher.ignoreChangedEvent(win.id, filePath, duration)
              console.log(`[FileTracker] Ignoring file change events for ${filePath} for ${duration}ms (gotoVersion)`)
            }
          }
        } catch (err) {
          // 如果获取watcher失败，继续执行gotoVersion操作
          console.warn('Failed to ignore file change event for gotoVersion:', err)
        }
      }

      const result = await manager.gotoVersion(filePath, targetVersion)
      return result
    } catch (error) {
      console.error('Error going to version:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取版本历史
  ipcMain.handle('file-tracker:get-history', async (event, { filePath }) => {
    try {
      const history = await manager.getHistory(filePath)
      return { success: true, history }
    } catch (error) {
      console.error('Error getting history:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取版本差异
  ipcMain.handle('file-tracker:get-version-diff', async (event, { filePath, fromVersion, toVersion }) => {
    try {
      const diff = await manager.getVersionDiff(filePath, fromVersion, toVersion)
      return { success: true, diff }
    } catch (error) {
      console.error('Error getting version diff:', error)
      return { success: false, error: error.message }
    }
  })

  // 读取文件旧内容（用于保存时记录变更）
  ipcMain.handle('file-tracker:read-old-content', async (event, { filePath }) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8').catch(() => '')
      return { success: true, content }
    } catch (error) {
      // 文件不存在时返回空字符串
      return { success: true, content: '' }
    }
  }).

  // 移除追踪器
  ipcMain.handle('file-tracker:remove', async (event, { filePath }) => {
    try {
      manager.removeTracker(filePath)
      return { success: true }
    } catch (error) {
      console.error('Error removing tracker:', error)
      return { success: false, error: error.message }
    }
  })
}

export default initFileChangeTrackerIPC
