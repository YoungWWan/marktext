<template>
  <el-dialog
    :visible.sync="visible"
    :title="$t('fileHistory.title') || '文件历史记录'"
    width="800px"
    :modal="true"
    :close-on-click-modal="false"
    custom-class="file-history-dialog"
  >
    <div v-if="loading" class="loading-container">
      <div class="loading-text">{{ $t('fileHistory.loading') || '加载中...' }}</div>
    </div>
    <div v-else-if="error" class="error-container">
      <div class="error-text">{{ error }}</div>
    </div>
    <div v-else class="history-container">
      <div class="history-main">
        <div class="history-list">
          <div
            v-for="(record, index) in history"
            :key="record.version"
            class="history-item"
            :class="{ 'active': record.version === currentVersion, 'selected': record.version === selectedVersion }"
            @click="selectVersion(record.version)"
          >
            <div class="history-item-header">
              <span class="version-badge">v{{ record.version }}</span>
              <span class="timestamp">{{ formatTime(record.timestamp) }}</span>
            </div>
            <div v-if="record.metadata && record.metadata.action" class="history-item-meta">
              {{ $t(`fileHistory.action.${record.metadata.action}`) || record.metadata.action }}
            </div>
          </div>
          <div v-if="history.length === 0" class="empty-history">
            {{ $t('fileHistory.empty') || '暂无历史记录' }}
          </div>
        </div>
        <div v-if="selectedVersion !== null && selectedVersion !== currentVersion" class="diff-preview">
          <div class="diff-header">
            <span class="diff-title">{{ $t('fileHistory.diffTitle') || '差异对比' }}</span>
            <span class="diff-versions">
              v{{ selectedVersion }} → v{{ currentVersion }}
            </span>
          </div>
          <div class="diff-content" ref="diffContent">
            <div
              v-for="(line, index) in diffLines"
              :key="index"
              class="diff-line"
              :class="line.type"
            >
              <span class="line-number">{{ line.oldLineNumber || ' ' }}</span>
              <span class="line-number">{{ line.newLineNumber || ' ' }}</span>
              <span class="line-content">{{ line.content }}</span>
            </div>
            <div v-if="diffLines.length === 0" class="no-diff">
              {{ $t('fileHistory.noDiff') || '无差异' }}
            </div>
          </div>
        </div>
      </div>
      <div class="history-actions">
        <el-button
          :disabled="!canUndo"
          @click="handleUndo"
          size="small"
        >
          {{ $t('fileHistory.undo') || '撤销' }}
        </el-button>
        <el-button
          :disabled="!canRedo"
          @click="handleRedo"
          size="small"
        >
          {{ $t('fileHistory.redo') || '重做' }}
        </el-button>
        <el-button
          v-if="selectedVersion !== null && selectedVersion !== currentVersion"
          type="primary"
          @click="handleRestore"
          size="small"
        >
          {{ $t('fileHistory.restore') || '恢复到此版本' }}
        </el-button>
      </div>
    </div>
    <div slot="footer" class="dialog-footer">
      <el-button @click="visible = false">
        {{ $t('fileHistory.close') || '关闭' }}
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import fileChangeTrackerClient from '../../util/fileChangeTrackerClient'
import { calculateDiffLines } from '../../util/diff'
import dayjs from 'dayjs'
import bus from '../../bus'

export default {
  name: 'FileHistory',
  data () {
    return {
      visible: false,
      filePath: '',
      history: [],
      currentVersion: 0,
      selectedVersion: null,
      loading: false,
      error: null,
      diffLines: [],
      selectedContent: '',
      currentContent: ''
    }
  },
  computed: {
    canUndo () {
      return this.currentVersion > 0
    },
    canRedo () {
      if (this.history.length === 0) return false
      const maxVersion = Math.max(...this.history.map(h => h.version))
      return this.currentVersion < maxVersion
    }
  },
  watch: {
    selectedVersion: {
      handler (newVersion) {
        if (newVersion !== null && newVersion !== this.currentVersion) {
          this.loadDiff()
        } else {
          this.diffLines = []
        }
      },
      immediate: false
    }
  },
  created () {
    this.$nextTick(() => {
      bus.$on('SHOW_FILE_HISTORY_DIALOG', this.showDialog)
    })
  },
  beforeDestroy () {
    bus.$off('SHOW_FILE_HISTORY_DIALOG', this.showDialog)
  },
  methods: {
    async showDialog (filePath) {
      this.filePath = filePath
      this.visible = true
      this.loading = true
      this.error = null
      this.selectedVersion = null

      try {
        const result = await fileChangeTrackerClient.getHistory(filePath)
        if (result.success) {
          this.history = result.history || []
          // 从历史记录中获取当前版本（最后一个版本）
          if (this.history.length > 0) {
            this.currentVersion = this.history[this.history.length - 1].version
            // 加载当前版本的内容
            const currentResult = await fileChangeTrackerClient.getCurrentContent(filePath)
            if (currentResult.success) {
              this.currentContent = currentResult.content || ''
            }
          } else {
            this.currentVersion = 0
            this.currentContent = ''
          }
        } else {
          this.error = result.error || '获取历史记录失败'
        }
      } catch (err) {
        this.error = err.message || '获取历史记录时发生错误'
      } finally {
        this.loading = false
      }
    },
    formatTime (timestamp) {
      if (!timestamp) return ''
      return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
    },
    async selectVersion (version) {
      if (this.selectedVersion === version) {
        this.selectedVersion = null
        return
      }
      this.selectedVersion = version
    },
    async loadDiff () {
      if (this.selectedVersion === null || this.selectedVersion === this.currentVersion) {
        this.diffLines = []
        return
      }

      try {
        // 获取选中版本的内容
        const selectedResult = await fileChangeTrackerClient.gotoVersion(this.filePath, this.selectedVersion)
        if (!selectedResult.success) {
          return
        }
        this.selectedContent = selectedResult.content || ''

        // 获取当前版本的内容（如果还没有加载）
        if (!this.currentContent) {
          const currentResult = await fileChangeTrackerClient.getCurrentContent(this.filePath)
          if (currentResult.success) {
            this.currentContent = currentResult.content || ''
          }
        }

        // 计算差异
        const diff = calculateDiffLines(this.selectedContent, this.currentContent)
        this.diffLines = diff.lines || []
      } catch (err) {
        console.error('Failed to load diff:', err)
        this.diffLines = []
      }
    },
    async handleUndo () {
      try {
        const result = await fileChangeTrackerClient.undo(this.filePath)
        if (result.success) {
          this.currentVersion = result.version
          this.selectedVersion = null
          // 重新加载历史记录
          await this.loadHistory()
          // 通知文件已恢复
          bus.$emit('file-content-restored', {
            pathname: this.filePath,
            content: result.content
          })
        }
      } catch (err) {
        this.$message.error(err.message || '撤销失败')
      }
    },
    async handleRedo () {
      try {
        const result = await fileChangeTrackerClient.redo(this.filePath)
        if (result.success) {
          this.currentVersion = result.version
          this.selectedVersion = null
          // 重新加载历史记录
          await this.loadHistory()
          // 通知文件已恢复
          bus.$emit('file-content-restored', {
            pathname: this.filePath,
            content: result.content
          })
        }
      } catch (err) {
        this.$message.error(err.message || '重做失败')
      }
    },
    async handleRestore () {
      if (this.selectedVersion === null) return

      try {
        const result = await fileChangeTrackerClient.gotoVersion(this.filePath, this.selectedVersion)
        if (result.success) {
          this.currentVersion = result.version
          this.selectedVersion = null
          // 重新加载历史记录
          await this.loadHistory()
          // 通知文件已恢复
          bus.$emit('file-content-restored', {
            pathname: this.filePath,
            content: result.content
          })
          this.$message.success(this.$t('fileHistory.restoreSuccess') || '已恢复到指定版本')
        }
      } catch (err) {
        this.$message.error(err.message || '恢复失败')
      }
    },
    async loadHistory () {
      try {
        const result = await fileChangeTrackerClient.getHistory(this.filePath)
        if (result.success) {
          this.history = result.history || []
          // 更新当前版本（最后一个版本）
          if (this.history.length > 0) {
            this.currentVersion = this.history[this.history.length - 1].version
            // 重新加载当前内容
            const currentResult = await fileChangeTrackerClient.getCurrentContent(this.filePath)
            if (currentResult.success) {
              this.currentContent = currentResult.content || ''
            }
          }
          // 如果选中版本仍然存在，重新加载差异
          if (this.selectedVersion !== null) {
            await this.loadDiff()
          }
        }
      } catch (err) {
        console.error('Failed to load history:', err)
      }
    }
  }
}
</script>

<style scoped>
.loading-container,
.error-container {
  padding: 40px;
  text-align: center;
}

.loading-text,
.error-text {
  color: var(--editorColor);
}

.history-container {
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.history-main {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.history-list {
  flex: 0 0 300px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.diff-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--floatBorderColor);
  border-radius: 4px;
  overflow: hidden;
}

.diff-header {
  padding: 8px 12px;
  background: var(--sideBarItemHoverBgColor);
  border-bottom: 1px solid var(--floatBorderColor);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.diff-title {
  font-weight: 600;
  font-size: 13px;
}

.diff-versions {
  font-size: 12px;
  color: var(--editorColor);
}

.diff-content {
  flex: 1;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.diff-line {
  display: flex;
  padding: 2px 8px;
}

.diff-line.added {
  background: rgba(76, 175, 80, 0.1);
}

.diff-line.removed {
  background: rgba(244, 67, 54, 0.1);
}

.diff-line .line-number {
  flex: 0 0 40px;
  text-align: right;
  padding-right: 8px;
  color: var(--editorColor);
  user-select: none;
  border-right: 1px solid var(--floatBorderColor);
  margin-right: 8px;
}

.diff-line .line-content {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-all;
}

.diff-line.added .line-content {
  color: #4caf50;
}

.diff-line.removed .line-content {
  color: #f44336;
  text-decoration: line-through;
}

.no-diff {
  padding: 40px;
  text-align: center;
  color: var(--editorColor);
}

.history-item {
  padding: 12px;
  border: 1px solid var(--floatBorderColor);
  border-radius: 4px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background: var(--sideBarItemHoverBgColor);
  border-color: var(--themeColor);
}

.history-item.active {
  background: var(--themeColor);
  color: #fff;
  border-color: var(--themeColor);
}

.history-item.selected {
  border-color: var(--themeColor);
  border-width: 2px;
}

.history-item-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.version-badge {
  font-weight: 600;
  font-size: 14px;
}

.timestamp {
  color: var(--editorColor);
  font-size: 12px;
  flex: 1;
}

.history-item.active .timestamp {
  color: rgba(255, 255, 255, 0.9);
}

.base-badge {
  background: var(--floatBorderColor);
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
}

.history-item.active .base-badge {
  background: rgba(255, 255, 255, 0.2);
}

.history-item-meta {
  font-size: 12px;
  color: var(--editorColor);
  margin-top: 4px;
}

.history-item.active .history-item-meta {
  color: rgba(255, 255, 255, 0.8);
}

.empty-history {
  text-align: center;
  padding: 40px;
  color: var(--editorColor);
}

.history-actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--floatBorderColor);
}

.dialog-footer {
  text-align: right;
}
</style>
