/**
 * 主进程文件变更追踪管理器
 * 管理所有文件的变更追踪，提供IPC接口
 * 历史记录存储在工作区的 .openmark 文件夹中
 */
import path from 'path'
import fs from 'fs/promises'
import log from 'electron-log'
import FileChangeTracker from '../../renderer/util/fileChangeTracker'

/**
 * 文件变更追踪管理器
 */
class FileChangeTrackerManager {
  constructor () {
    // 文件路径 -> FileChangeTracker 的映射
    this.trackers = new Map()
    // 工作区根目录 -> 存储目录 的映射
    this.workspaceStorageDirs = new Map()
  }

  /**
   * 查找文件所在的工作区根目录
   * 通过向上查找 .openmark 文件夹来确定工作区
   * 如果找不到，使用文件所在目录作为工作区（会在该目录创建 .openmark 文件夹）
   */
  _findWorkspaceRoot (filePath) {
    const normalizedPath = path.normalize(filePath)
    const dirname = path.dirname(normalizedPath)

    // 向上查找 .openmark 文件夹
    // 这样可以找到已经存在的工作区，即使窗口没有打开
    let currentDir = dirname
    const root = path.parse(normalizedPath).root
    const fsSync = require('fs')

    while (currentDir !== root && currentDir !== path.dirname(currentDir)) {
      const openmarkDir = path.join(currentDir, '.openmark')
      try {
        // 同步检查目录是否存在（性能考虑，使用同步方法）
        if (fsSync.existsSync(openmarkDir)) {
          return currentDir
        }
      } catch (error) {
        // 忽略错误，继续向上查找
      }
      currentDir = path.dirname(currentDir)
    }

    // 如果找不到工作区，使用文件所在目录作为工作区
    // 这样即使没有打开工作区，也能记录历史
    // 会在该目录创建 .openmark 文件夹
    return dirname
  }

  /**
   * 获取工作区的存储目录
   */
  async _getWorkspaceStorageDir (workspaceRoot) {
    if (this.workspaceStorageDirs.has(workspaceRoot)) {
      return this.workspaceStorageDirs.get(workspaceRoot)
    }

    const storageDir = path.join(workspaceRoot, '.openmark')

    // 确保目录存在
    try {
      await fs.mkdir(storageDir, { recursive: true })
      this.workspaceStorageDirs.set(workspaceRoot, storageDir)
      return storageDir
    } catch (error) {
      log.error(`Failed to create storage directory for workspace ${workspaceRoot}:`, error)
      throw error
    }
  }

  /**
   * 获取文件的存储路径（在工作区的 .openmark 文件夹中）
   */
  async _getStoragePath (filePath) {
    const workspaceRoot = this._findWorkspaceRoot(filePath)
    const storageDir = await this._getWorkspaceStorageDir(workspaceRoot)

    // 使用文件相对于工作区的路径作为文件名（避免路径冲突）
    const relativePath = path.relative(workspaceRoot, filePath)
    // 将路径中的特殊字符替换为安全字符
    // eslint-disable-next-line no-control-regex
    const safePath = relativePath.replace(/[<>:"|?*\x00-\x1f]/g, '_').replace(/\\/g, '_')
    // 如果路径太长，使用哈希
    const crypto = require('crypto')
    const fileName = safePath.length > 200
      ? crypto.createHash('md5').update(relativePath).digest('hex') + '.json'
      : safePath + '.json'

    return path.join(storageDir, fileName)
  }

  /**
   * 获取或创建文件追踪器
   */
  async getTracker (filePath) {
    const normalizedPath = path.normalize(filePath)

    if (this.trackers.has(normalizedPath)) {
      return this.trackers.get(normalizedPath)
    }

    // 尝试从磁盘加载
    const tracker = await this._loadTracker(normalizedPath)
    this.trackers.set(normalizedPath, tracker)
    return tracker
  }

  /**
   * 从磁盘加载追踪器
   */
  async _loadTracker (filePath) {
    const storagePath = await this._getStoragePath(filePath)

    try {
      const data = await fs.readFile(storagePath, 'utf-8')
      const json = JSON.parse(data)
      const tracker = FileChangeTracker.fromJSON(json)
      return tracker
    } catch (error) {
      // 文件不存在或解析失败，创建新的追踪器
      const isNewTracker = error.code === 'ENOENT'
      if (!isNewTracker) {
        log.warn(`Failed to load tracker for ${filePath}:`, error)
      }

      // 尝试读取文件内容作为基准
      let baseContent = ''
      try {
        baseContent = await fs.readFile(filePath, 'utf-8')
      } catch (err) {
        // 文件不存在，使用空内容
      }

      const tracker = new FileChangeTracker(filePath)
      tracker.setBaseContent(baseContent, 0)

      // 如果是新创建的追踪器（历史记录文件不存在），立即保存到磁盘
      if (isNewTracker) {
        try {
          const json = JSON.stringify(tracker.toJSON(), null, 2)
          await fs.writeFile(storagePath, json, 'utf-8')
          log.debug(`Created new tracker file for ${filePath}`)
        } catch (saveError) {
          log.warn(`Failed to save new tracker for ${filePath}:`, saveError)
          // 即使保存失败，也返回追踪器，以便后续可以继续使用
        }
      }

      return tracker
    }
  }

  /**
   * 保存追踪器到磁盘
   */
  async saveTracker (filePath) {
    const normalizedPath = path.normalize(filePath)
    const tracker = this.trackers.get(normalizedPath)

    if (!tracker) {
      return
    }

    const storagePath = await this._getStoragePath(normalizedPath)

    try {
      const json = JSON.stringify(tracker.toJSON(), null, 2)
      await fs.writeFile(storagePath, json, 'utf-8')
    } catch (error) {
      log.error(`Failed to save tracker for ${filePath}:`, error)
    }
  }

  /**
   * 记录文件变更
   */
  async recordChange (filePath, oldContent, newContent, metadata = {}) {
    const tracker = await this.getTracker(filePath)
    const changed = tracker.recordChange(oldContent, newContent, metadata)

    if (changed) {
      // 异步保存（不阻塞）
      this.saveTracker(filePath).catch(err => {
        log.error('Failed to save tracker after change:', err)
      })
    }

    return {
      success: true,
      changed,
      version: tracker.getCurrentVersion()
    }
  }

  /**
   * 获取文件当前内容
   */
  async getCurrentContent (filePath) {
    const tracker = await this.getTracker(filePath)
    return tracker.getCurrentContent()
  }

  /**
   * 撤销
   */
  async undo (filePath) {
    const tracker = await this.getTracker(filePath)
    const result = tracker.undo()

    if (result.success) {
      // 实际将文件内容写回磁盘
      try {
        const content = result.content
        await fs.writeFile(filePath, content, 'utf-8')
      } catch (error) {
        log.error(`Failed to write file during undo: ${filePath}`, error)
        return {
          success: false,
          error: error.message
        }
      }
      await this.saveTracker(filePath)
    }

    return result
  }

  /**
   * 重做
   */
  async redo (filePath) {
    const tracker = await this.getTracker(filePath)
    const result = tracker.redo()

    if (result.success) {
      await this.saveTracker(filePath)
    }

    return result
  }

  /**
   * 跳转到指定版本
   */
  async gotoVersion (filePath, targetVersion) {
    const tracker = await this.getTracker(filePath)
    const result = tracker.gotoVersion(targetVersion)

    if (result.success) {
      await this.saveTracker(filePath)
    }

    return result
  }

  /**
   * 获取版本历史
   */
  async getHistory (filePath) {
    const tracker = await this.getTracker(filePath)
    return tracker.getHistory()
  }

  /**
   * 获取版本差异
   */
  async getVersionDiff (filePath, fromVersion, toVersion) {
    const tracker = await this.getTracker(filePath)
    return tracker.getVersionDiff(fromVersion, toVersion)
  }

  /**
   * 移除追踪器（当文件关闭时）
   */
  removeTracker (filePath) {
    const normalizedPath = path.normalize(filePath)
    const tracker = this.trackers.get(normalizedPath)

    if (tracker) {
      // 保存后移除
      return this.saveTracker(filePath).finally(() => {
        this.trackers.delete(normalizedPath)
        tracker.dispose()
      })
    }
    // 如果没有追踪器，返回一个已解决的 Promise
    return Promise.resolve()
  }

  /**
   * 清理所有追踪器
   */
  async cleanup () {
    // 保存所有追踪器
    const savePromises = Array.from(this.trackers.keys()).map(filePath =>
      this.saveTracker(filePath)
    )
    await Promise.all(savePromises)

    // 清理
    this.trackers.forEach(tracker => tracker.dispose())
    this.trackers.clear()
  }
}

// 单例
let managerInstance = null

export function getFileChangeTrackerManager () {
  if (!managerInstance) {
    managerInstance = new FileChangeTrackerManager()
  }
  return managerInstance
}

export default FileChangeTrackerManager
