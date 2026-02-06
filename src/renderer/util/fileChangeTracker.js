/**
 * 文件变更追踪系统
 * 实现类似git的增量修改追踪，支持撤销/回滚，优化大文档性能
 */
import { createPatch, applyPatch } from 'diff'
import { calculateDiffLines } from './diff'

/**
 * 文件变更记录
 */
class FileChangeRecord {
  constructor (version, timestamp, diff, contentHash, metadata = {}) {
    this.version = version // 版本号（递增）
    this.timestamp = timestamp // 时间戳
    this.diff = diff // 差异内容（patch格式）
    this.contentHash = contentHash // 内容哈希（用于快速比较）
    this.metadata = metadata // 元数据（如作者、描述等）
  }

  /**
   * 序列化为JSON
   */
  toJSON () {
    return {
      version: this.version,
      timestamp: this.timestamp,
      diff: this.diff,
      contentHash: this.contentHash,
      metadata: this.metadata
    }
  }

  /**
   * 从JSON反序列化
   */
  static fromJSON (json) {
    return new FileChangeRecord(
      json.version,
      json.timestamp,
      json.diff,
      json.contentHash,
      json.metadata
    )
  }
}

/**
 * 文件变更追踪器
 */
class FileChangeTracker {
  constructor (filePath, options = {}) {
    this.filePath = filePath
    this.options = {
      maxHistorySize: options.maxHistorySize || 100, // 最大历史记录数
      enableCompression: options.enableCompression !== false, // 是否启用压缩
      lazyLoad: options.lazyLoad !== false, // 是否延迟加载
      ...options
    }

    // 版本历史记录（存储增量差异）
    this.history = []
    // 当前版本索引
    this.currentVersionIndex = -1
    // 基准内容（用于大文档优化）
    this.baseContent = null
    // 基准版本号（使用时间戳，初始为0表示没有基准版本）
    this.baseVersion = 0
    // 内容缓存（用于快速访问）
    this.contentCache = new Map()
    // 缓存大小限制（防止内存溢出）
    this.maxCacheSize = 10
  }

  /**
   * 计算内容的简单哈希（用于快速比较）
   * 优化：对大文档使用采样哈希以提高性能
   */
  _calculateHash (content) {
    if (!content) return '0'

    // 对于大文档（>100KB），使用采样策略
    if (content.length > 100000) {
      // 采样：开头、中间、结尾各取一部分
      const sampleSize = 5000
      const start = content.substring(0, sampleSize)
      const middle = content.substring(
        Math.floor(content.length / 2) - sampleSize / 2,
        Math.floor(content.length / 2) + sampleSize / 2
      )
      const end = content.substring(content.length - sampleSize)
      content = start + middle + end
    } else if (content.length > 10000) {
      // 中等文档，只取前5000个字符
      content = content.substring(0, 5000)
    }

    // 使用简单的哈希算法
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString(36) + '_' + content.length.toString(36)
  }

  /**
   * 记录文件变更（增量）
   * 优化：对于大文档，使用更高效的差异算法
   */
  recordChange (oldContent, newContent, metadata = {}) {
    // 修复：如果 currentVersionIndex 是 -1 但 history 不为空，应该指向最新版本
    // 这可能是从旧版本数据加载时出现的不一致状态
    if (this.currentVersionIndex === -1 && this.history.length > 0) {
      this.currentVersionIndex = this.history.length - 1
    }

    // 标准化内容（统一行尾为LF，去除末尾空白差异）
    const normalizeContent = (content) => {
      if (!content) return ''
      // 统一行尾为LF
      return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    }

    const normalizedOld = normalizeContent(oldContent)
    const normalizedNew = normalizeContent(newContent)

    // 如果标准化后内容相同，不记录
    if (normalizedOld === normalizedNew) {
      return false
    }

    // 计算内容哈希（快速比较）
    const contentHash = this._calculateHash(normalizedNew)

    // 获取当前版本的内容并比较
    const currentContent = this.getCurrentContent()
    const normalizedCurrent = normalizeContent(currentContent)
    const currentContentHash = this._calculateHash(normalizedCurrent)

    // 如果新内容和当前版本的内容相同（通过哈希和完整内容双重检查），跳过
    if (currentContentHash === contentHash && normalizedCurrent === normalizedNew) {
      return false
    }

    // 检查传入的 oldContent 是否与追踪器中的当前版本内容一致
    // 如果不一致，说明传入的 oldContent 可能不准确，应该使用追踪器中的当前版本内容
    // 这样可以确保版本链的连续性，避免重复记录或版本跳跃

    // 生成差异补丁（优先使用追踪器中的当前版本内容，确保版本链的连续性）
    // 注意：diff库的createPatch函数签名是固定的，不支持额外选项
    // 对于大文档，差异计算本身已经足够高效（使用LCS算法）
    const diff = createPatch(
      this.filePath,
      normalizedCurrent, // 使用追踪器中的当前版本内容，确保版本链的连续性
      normalizedNew,
      '', // 旧文件头
      '' // 新文件头
    )

    // 如果当前不在最新版本，删除之后的所有版本（分支处理）
    if (this.currentVersionIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentVersionIndex + 1)
    }

    // 创建变更记录
    // 使用时间戳作为版本号，保证唯一性且简单
    const timestamp = Date.now()
    // 如果时间戳重复（极罕见情况），递增1毫秒
    const existingVersions = new Set(this.history.map(r => r.version))
    const version = existingVersions.has(timestamp) ? timestamp + 1 : timestamp

    const record = new FileChangeRecord(
      version,
      timestamp,
      diff,
      contentHash,
      metadata
    )

    // 添加新记录
    this.history.push(record)
    this.currentVersionIndex = this.history.length - 1

    // 清理旧历史（保持最大历史记录数）
    this._pruneHistory()

    // 更新基准内容（如果历史记录过多，定期创建快照）
    this._updateBaseContent()

    // 清除缓存
    this.contentCache.clear()

    return true
  }

  /**
   * 获取指定版本的内容
   */
  getContentAtVersion (targetVersion) {
    // 检查缓存
    const cacheKey = `v${targetVersion}`
    if (this.contentCache.has(cacheKey)) {
      return this.contentCache.get(cacheKey)
    }

    // 如果请求的是基准版本
    if (targetVersion === this.baseVersion) {
      this.contentCache.set(cacheKey, this.baseContent)
      return this.baseContent
    }

    // 从基准版本开始应用差异
    let content = this.baseContent || ''
    const startIndex = this.history.findIndex(r => r.version > this.baseVersion)

    if (startIndex === -1) {
      // 没有历史记录，返回基准内容
      return content
    }

    // 应用从基准版本到目标版本的所有差异
    for (let i = startIndex; i < this.history.length; i++) {
      const record = this.history[i]
      if (record.version > targetVersion) {
        break
      }

      try {
        const result = applyPatch(content, record.diff)
        if (result === false) {
          console.warn(`Failed to apply patch for version ${record.version}`)
          // 如果应用失败，尝试重新计算
          return this._recalculateContent(targetVersion)
        }
        content = result
      } catch (error) {
        console.error(`Error applying patch for version ${record.version}:`, error)
        return this._recalculateContent(targetVersion)
      }
    }

    // 缓存结果（限制缓存大小）
    if (this.contentCache.size >= this.maxCacheSize) {
      // 删除最旧的缓存项（FIFO策略）
      const firstKey = this.contentCache.keys().next().value
      this.contentCache.delete(firstKey)
    }
    this.contentCache.set(cacheKey, content)
    return content
  }

  /**
   * 重新计算内容（当应用补丁失败时）
   */
  _recalculateContent (targetVersion) {
    // 找到最接近的已缓存版本
    for (let i = this.history.length - 1; i >= 0; i--) {
      const record = this.history[i]
      if (record.version <= targetVersion) {
        const cacheKey = `v${record.version}`
        if (this.contentCache.has(cacheKey)) {
          let content = this.contentCache.get(cacheKey)
          // 从这个版本继续应用
          for (let j = i + 1; j < this.history.length; j++) {
            const nextRecord = this.history[j]
            if (nextRecord.version > targetVersion) break
            try {
              const result = applyPatch(content, nextRecord.diff)
              if (result !== false) {
                content = result
              }
            } catch (error) {
              console.error('Error recalculating content:', error)
            }
          }
          return content
        }
      }
    }
    return this.baseContent || ''
  }

  /**
   * 获取当前版本的内容
   */
  getCurrentContent () {
    if (this.currentVersionIndex < 0) {
      return this.baseContent || ''
    }
    const currentVersion = this.history[this.currentVersionIndex].version
    return this.getContentAtVersion(currentVersion)
  }

  /**
   * 获取当前版本号
   */
  getCurrentVersion () {
    if (this.currentVersionIndex < 0) {
      return this.baseVersion
    }
    return this.history[this.currentVersionIndex].version
  }

  /**
   * 撤销到上一个版本
   */
  undo () {
    if (this.currentVersionIndex > 0) {
      this.currentVersionIndex--
      this.contentCache.clear() // 清除缓存以确保一致性
      return {
        success: true,
        version: this.getCurrentVersion(),
        content: this.getCurrentContent()
      }
    } else if (this.currentVersionIndex === 0) {
      // 撤销到基准版本
      this.currentVersionIndex = -1
      this.contentCache.clear()
      return {
        success: true,
        version: this.baseVersion,
        content: this.baseContent || ''
      }
    }
    return {
      success: false,
      message: 'Already at the earliest version'
    }
  }

  /**
   * 重做到下一个版本
   */
  redo () {
    if (this.currentVersionIndex < this.history.length - 1) {
      this.currentVersionIndex++
      this.contentCache.clear()
      return {
        success: true,
        version: this.getCurrentVersion(),
        content: this.getCurrentContent()
      }
    }
    return {
      success: false,
      message: 'Already at the latest version'
    }
  }

  /**
   * 跳转到指定版本
   */
  gotoVersion (targetVersion) {
    // 找到目标版本的索引
    const targetIndex = this.history.findIndex(r => r.version === targetVersion)
    if (targetIndex === -1) {
      // 可能是基准版本
      if (targetVersion === this.baseVersion) {
        this.currentVersionIndex = -1
        this.contentCache.clear()
        return {
          success: true,
          version: this.baseVersion,
          content: this.baseContent || ''
        }
      }
      return {
        success: false,
        message: `Version ${targetVersion} not found`
      }
    }

    this.currentVersionIndex = targetIndex
    this.contentCache.clear()
    return {
      success: true,
      version: targetVersion,
      content: this.getContentAtVersion(targetVersion)
    }
  }

  /**
   * 获取版本历史列表
   */
  getHistory () {
    const history = []
    if (this.baseVersion > 0 || this.baseContent) {
      history.push({
        version: this.baseVersion,
        timestamp: 0,
        isBase: true
      })
    }
    this.history.forEach(record => {
      history.push({
        version: record.version,
        timestamp: record.timestamp,
        contentHash: record.contentHash,
        metadata: record.metadata,
        isBase: false
      })
    })
    return history
  }

  /**
   * 获取版本差异信息
   */
  getVersionDiff (fromVersion, toVersion) {
    const fromContent = this.getContentAtVersion(fromVersion)
    const toContent = this.getContentAtVersion(toVersion)
    return calculateDiffLines(fromContent, toContent)
  }

  /**
   * 清理旧历史记录
   * 注意：为了保持版本号连续，不删除历史记录，只限制最大数量
   * 如果历史记录过多，只保留最近的 maxHistorySize 条
   */
  _pruneHistory () {
    if (this.history.length <= this.options.maxHistorySize) {
      return
    }

    // 保留最近的记录，删除最旧的
    const keepCount = this.options.maxHistorySize
    const removeCount = this.history.length - keepCount

    // 获取要删除的版本号范围
    const removedVersions = this.history.slice(0, removeCount).map(r => r.version)
    if (removedVersions.length === 0) {
      return
    }

    // 找到要删除的最大版本号（时间戳最大的）
    const maxRemovedVersion = Math.max(...removedVersions)

    // 获取该版本的内容作为新的基准内容
    const newBaseContent = this.getContentAtVersion(maxRemovedVersion)

    // 删除旧记录（只保留最近的）
    const remainingHistory = this.history.slice(removeCount)

    // 更新基准版本和内容
    // 使用时间戳作为版本号，不需要复杂的计算，直接使用删除的最大版本号
    this.baseVersion = maxRemovedVersion
    this.baseContent = newBaseContent
    this.history = remainingHistory

    // 更新当前版本索引（如果当前版本被删除，指向最新版本）
    if (this.currentVersionIndex >= 0) {
      this.currentVersionIndex = this.currentVersionIndex - removeCount
      // 如果索引变成负数，说明当前版本被删除了，指向最新版本
      if (this.currentVersionIndex < 0) {
        this.currentVersionIndex = this.history.length - 1
      }
    } else {
      // 如果当前是基准版本，保持为 -1
      this.currentVersionIndex = -1
    }

    // 清除缓存
    this.contentCache.clear()
  }

  /**
   * 更新基准内容（定期创建快照以优化性能）
   * 优化：根据文档大小动态调整快照间隔
   */
  _updateBaseContent () {
    // 不再清空history，而是保留所有历史记录以确保版本号连续
    // 性能优化主要通过_pruneHistory来限制历史记录数量
    // 这里只更新baseContent作为快照点，但不改变baseVersion和history
    // 这样可以避免版本号跳跃
    // 注意：快照间隔逻辑已移除，因为当前实现不再需要动态调整快照间隔
  }

  /**
   * 设置基准内容（用于初始化）
   */
  setBaseContent (content, version = 0) {
    this.baseContent = content
    this.baseVersion = version
    this.history = []
    this.currentVersionIndex = -1
    this.contentCache.clear()
  }

  /**
   * 序列化为JSON（用于持久化）
   */
  toJSON () {
    return {
      filePath: this.filePath,
      baseVersion: this.baseVersion,
      baseContent: this.baseContent,
      history: this.history.map(r => r.toJSON()),
      currentVersionIndex: this.currentVersionIndex,
      options: this.options
    }
  }

  /**
   * 从JSON反序列化
   */
  static fromJSON (json) {
    const tracker = new FileChangeTracker(json.filePath, json.options)
    tracker.baseVersion = json.baseVersion
    tracker.baseContent = json.baseContent
    tracker.history = json.history.map(r => FileChangeRecord.fromJSON(r))

    // 修复 currentVersionIndex：如果历史记录存在但索引为 -1，应该指向最新版本
    if (json.currentVersionIndex === -1 && tracker.history.length > 0) {
      // 如果当前版本索引是 -1 但历史记录不为空，说明应该指向最新版本
      tracker.currentVersionIndex = tracker.history.length - 1
    } else {
      tracker.currentVersionIndex = json.currentVersionIndex
      // 确保索引在有效范围内
      if (tracker.currentVersionIndex >= tracker.history.length) {
        tracker.currentVersionIndex = tracker.history.length - 1
      }
    }

    return tracker
  }

  /**
   * 清理资源
   */
  dispose () {
    this.history = []
    this.contentCache.clear()
    this.baseContent = null
  }
}

export default FileChangeTracker
export { FileChangeRecord }
