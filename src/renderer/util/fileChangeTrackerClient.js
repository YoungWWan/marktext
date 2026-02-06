/**
 * 渲染进程文件变更追踪客户端
 * 提供与主进程通信的接口
 */
import { ipcRenderer } from 'electron'

/**
 * 文件变更追踪客户端
 */
class FileChangeTrackerClient {
  /**
   * 记录文件变更
   */
  async recordChange (filePath, oldContent, newContent, metadata = {}) {
    try {
      const result = await ipcRenderer.invoke('file-tracker:record-change', {
        filePath,
        oldContent,
        newContent,
        metadata
      })
      return result
    } catch (error) {
      console.error('Error recording file change:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取当前内容
   */
  async getCurrentContent (filePath) {
    try {
      const result = await ipcRenderer.invoke('file-tracker:get-current-content', {
        filePath
      })
      return result
    } catch (error) {
      console.error('Error getting current content:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 撤销
   */
  async undo (filePath) {
    try {
      const result = await ipcRenderer.invoke('file-tracker:undo', { filePath })
      return result
    } catch (error) {
      console.error('Error undoing:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 重做
   */
  async redo (filePath) {
    try {
      const result = await ipcRenderer.invoke('file-tracker:redo', { filePath })
      return result
    } catch (error) {
      console.error('Error redoing:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 跳转到指定版本
   */
  async gotoVersion (filePath, targetVersion) {
    try {
      const result = await ipcRenderer.invoke('file-tracker:goto-version', {
        filePath,
        targetVersion
      })
      return result
    } catch (error) {
      console.error('Error going to version:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取版本历史
   */
  async getHistory (filePath) {
    try {
      const result = await ipcRenderer.invoke('file-tracker:get-history', { filePath })
      return result
    } catch (error) {
      console.error('Error getting history:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取版本差异
   */
  async getVersionDiff (filePath, fromVersion, toVersion) {
    try {
      const result = await ipcRenderer.invoke('file-tracker:get-version-diff', {
        filePath,
        fromVersion,
        toVersion
      })
      return result
    } catch (error) {
      console.error('Error getting version diff:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 读取文件旧内容
   */
  async readOldContent (filePath) {
    try {
      const result = await ipcRenderer.invoke('file-tracker:read-old-content', { filePath })
      return result
    } catch (error) {
      console.error('Error reading old content:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 移除追踪器
   */
  async remove (filePath) {
    try {
      const result = await ipcRenderer.invoke('file-tracker:remove', { filePath })
      return result
    } catch (error) {
      console.error('Error removing tracker:', error)
      return { success: false, error: error.message }
    }
  }
}

// 单例
const client = new FileChangeTrackerClient()

export default client
