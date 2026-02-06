/**
 * 文件变更追踪 IPC 处理器
 * 提供主进程和渲染进程之间的通信接口
 */
import { ipcMain } from 'electron'
import fs from 'fs/promises'
import { getFileChangeTrackerManager } from './fileChangeTracker'

/**
 * 初始化文件变更追踪 IPC 处理器
 */
export function initFileChangeTrackerIPC () {
  const manager = getFileChangeTrackerManager()

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
  })

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
