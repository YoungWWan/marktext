<template>
  <div
    v-if="currentNotification && currentNotification.aiFileInfo"
    class="editor-diff-overlay"
    ref="diffOverlay"
  >
    <div class="diff-header">
      <div class="diff-header-left">
        <span class="diff-file-name">
          {{ getFileName(currentNotification.aiFileInfo.diffPreview && currentNotification.aiFileInfo.diffPreview.filePath) }}
        </span>
        <span class="diff-stats">
          <span class="stat-added">+{{ diffStats.additions }}</span>
          <span class="stat-removed">-{{ diffStats.deletions }}</span>
        </span>
      </div>
      <div class="diff-header-right">
        <button
          class="diff-btn accept-btn"
          @click="handleAccept"
        >
          {{ $t('ai.diffPreview.accept') || '接受' }}
        </button>
        <button
          class="diff-btn reject-btn"
          @click="handleReject"
        >
          {{ $t('ai.diffPreview.reject') || '拒绝' }}
        </button>
      </div>
    </div>
    <div class="diff-content">
      <div
        v-for="(line, lineIndex) in diffLines"
        :key="lineIndex"
        class="diff-line-wrapper"
        :class="line.type"
      >
        <div class="diff-line-bg-layer" :class="line.type"></div>
        <div class="diff-line">
          <span class="line-marker" :class="line.type">
            <span v-if="line.type === 'added'">+</span>
            <span v-else-if="line.type === 'removed'">-</span>
          </span>
          <span class="line-content">{{ line.content }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import bus from '@/bus'
import { calculateDiffLines } from '@/util/diff'

export default {
  name: 'EditorDiffOverlay',
  data () {
    return {
      diffLines: [],
      diffStats: { additions: 0, deletions: 0 },
      diffLineIndex: -1,
      editorElement: null
    }
  },
  mounted () {
    // 将 diff 插入到编辑器内容区域
    this.$nextTick(() => {
      // 等待编辑器初始化完成
      setTimeout(() => {
        this.insertDiffIntoEditor()
      }, 300)
    })
  },
  updated () {
    // 当 diff 内容更新时，重新插入
    this.$nextTick(() => {
      setTimeout(() => {
        this.insertDiffIntoEditor()
      }, 100)
    })
  },
  beforeDestroy () {
    // 清理：如果 diff 被移到了编辑器内部，需要移除
    if (this.$el && this.$el.parentNode) {
      // 不在这里移除，让 Vue 自己处理
    }
  },
  computed: {
    ...mapState({
      currentFile: state => state.editor.currentFile
    }),
    currentNotification () {
      if (!this.currentFile || !this.currentFile.notifications) {
        return null
      }
      const notifications = this.currentFile.notifications
      if (notifications.length === 0) {
        return null
      }
      // 查找 AI 文件修改通知
      const notification = notifications.find(n => n.exclusiveType === 'ai_file_changed')
      return notification || null
    }
  },
  watch: {
    currentNotification: {
      immediate: true,
      handler (notification) {
        if (notification && notification.aiFileInfo) {
          this.calculateAndShowDiff(notification.aiFileInfo)
          this.$nextTick(() => {
            setTimeout(() => {
              this.insertDiffIntoEditor()
            }, 300)
          })
        } else {
          this.diffLines = []
          this.diffStats = { additions: 0, deletions: 0 }
        }
      }
    },
    'currentNotification.aiFileInfo': {
      deep: true,
      immediate: true,
      handler (aiFileInfo) {
        if (aiFileInfo) {
          this.calculateAndShowDiff(aiFileInfo)
          this.$nextTick(() => {
            setTimeout(() => {
              this.insertDiffIntoEditor()
            }, 300)
          })
        }
      }
    },
    'currentFile.notifications': {
      deep: true,
      immediate: true,
      handler () {
        // 当通知数组变化时，触发重新计算和插入
        this.$nextTick(() => {
          setTimeout(() => {
            this.insertDiffIntoEditor()
          }, 300)
        })
      }
    }
  },
  methods: {
    calculateAndShowDiff (aiFileInfo) {
      if (!aiFileInfo || (!aiFileInfo.oldContent && !aiFileInfo.newContent)) {
        this.diffLines = []
        this.diffStats = { additions: 0, deletions: 0 }
        return
      }
      const result = calculateDiffLines(
        aiFileInfo.oldContent || '',
        aiFileInfo.newContent || ''
      )
      this.diffLines = result.lines
      this.diffStats = result.stats

      // 计算变更在文档中的位置
      this.calculateDiffPosition(aiFileInfo)
    },
    calculateDiffPosition (aiFileInfo) {
      // 找到第一个变更的行号
      if (!this.diffLines || this.diffLines.length === 0) {
        return
      }

      const oldContent = aiFileInfo.oldContent || ''
      const oldLines = oldContent.split('\n')

      // 找到第一个变更行的位置
      let changeLineIndex = -1
      for (let i = 0; i < this.diffLines.length; i++) {
        const diffLine = this.diffLines[i]
        if (diffLine.type === 'removed' || diffLine.type === 'added') {
          // 在旧内容中找到这一行的位置
          for (let j = 0; j < oldLines.length; j++) {
            if (diffLine.type === 'removed' && oldLines[j] === diffLine.content) {
              changeLineIndex = j
              break
            }
          }
          if (changeLineIndex >= 0) break
        }
      }

      this.diffLineIndex = changeLineIndex
    },
    insertDiffIntoEditor () {
      if (!this.currentNotification || !this.currentNotification.aiFileInfo) {
        return
      }

      if (!this.$el) {
        return
      }

      // 将 diff 组件插入到编辑器内容区域
      // 首先尝试从当前元素向上查找
      let editorWrapper = this.$el.closest('.editor-wrapper')

      // 如果找不到，尝试从父组件查找
      if (!editorWrapper && this.$parent && this.$parent.$el) {
        editorWrapper = this.$parent.$el.closest('.editor-wrapper') ||
                       this.$parent.$el.querySelector('.editor-wrapper')
      }

      // 如果还是找不到，尝试在整个文档中查找（作为最后的手段）
      if (!editorWrapper) {
        editorWrapper = document.querySelector('.editor-wrapper')
      }

      if (!editorWrapper) {
        console.log('[EditorDiffOverlay] Cannot find editor-wrapper, current parent:', this.$el.parentNode)
        return
      }

      const editorComponent = editorWrapper.querySelector('.editor-component')
      if (!editorComponent) {
        console.log('[EditorDiffOverlay] Cannot find editor-component')
        return
      }

      // Muya 编辑器会替换 editor-component，所以 editor-component 本身就是 Muya 的容器
      // 但是 Muya 会在内部创建一个 contenteditable 的 div，我们需要找到它
      // 根据 Muya 的代码，container 是 contenteditable 的 div，rootDom 是它的子元素
      let muyaContainer = null

      // 首先检查 editor-component 是否有 contenteditable 属性（说明它已经被 Muya 替换）
      if (editorComponent.hasAttribute('contenteditable')) {
        // editor-component 本身就是 Muya 的容器
        muyaContainer = editorComponent
      } else {
        // 查找 contenteditable 的元素（Muya 的容器）
        muyaContainer = editorComponent.querySelector('[contenteditable="true"]')

        // 如果还是找不到，尝试查找第一个 div 子元素（可能是 Muya 的 rootDom）
        if (!muyaContainer) {
          const firstDiv = editorComponent.querySelector('div')
          if (firstDiv) {
            muyaContainer = firstDiv
          }
        }
      }

      console.log('[EditorDiffOverlay] muyaContainer:', muyaContainer, 'editorComponent:', editorComponent, 'hasContentEditable:', editorComponent.hasAttribute('contenteditable'), 'children:', editorComponent.children.length)

      if (muyaContainer) {
        // 检查是否已经插入
        if (this.$el.parentNode !== muyaContainer) {
          // 将 diff 插入到 Muya 容器的开头，作为文档的一部分
          muyaContainer.insertBefore(this.$el, muyaContainer.firstChild)
          console.log('[EditorDiffOverlay] Inserted into muyaContainer')
        }
      } else {
        // 如果找不到 Muya 容器，插入到 editor-component 的开头
        if (this.$el.parentNode !== editorComponent) {
          editorComponent.insertBefore(this.$el, editorComponent.firstChild)
          console.log('[EditorDiffOverlay] Inserted into editor-component (fallback)')
        }
      }
    },
    getFileName (filePath) {
      if (!filePath) return ''
      const parts = filePath.split(/[/\\]/)
      return parts[parts.length - 1] || filePath
    },
    handleAccept () {
      const notifications = this.currentFile.notifications
      if (!notifications || notifications.length === 0) return

      const notification = notifications.find(n => n.exclusiveType === 'ai_file_changed')
      if (notification && notification.action) {
        if (notification.aiFileInfo) {
          bus.$emit('ai-diff-action', {
            filePath: notification.aiFileInfo.diffPreview && notification.aiFileInfo.diffPreview.filePath,
            action: 'accepted'
          })
        }
        notification.action(true)
      }
    },
    handleReject () {
      const notifications = this.currentFile.notifications
      if (!notifications || notifications.length === 0) return

      const notification = notifications.find(n => n.exclusiveType === 'ai_file_changed')
      if (notification && notification.action) {
        if (notification.aiFileInfo) {
          bus.$emit('ai-diff-action', {
            filePath: notification.aiFileInfo.diffPreview && notification.aiFileInfo.diffPreview.filePath,
            action: 'rejected'
          })
        }
        notification.action(false)
      }
    }
  }
}
</script>

<style scoped>
.editor-diff-overlay {
  position: relative;
  width: 100%;
  background: var(--editorBgColor);
  border: 2px solid var(--themeColor);
  border-radius: 4px;
  margin: 8px 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  pointer-events: auto;
}

.diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--notificationInfoBg);
  border-bottom: 1px solid var(--notificationInfoColor);
  flex-shrink: 0;
}

.diff-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.diff-file-name {
  font-family: monospace;
  font-weight: 500;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diff-stats {
  display: flex;
  gap: 8px;
  font-weight: 600;
  font-size: 11px;
}

.stat-added {
  color: #21b56f;
}

.stat-removed {
  color: #ff6969;
}

.diff-header-right {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.diff-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: opacity 0.2s;
}

.diff-btn:hover {
  opacity: 0.8;
}

.accept-btn {
  background: #21b56f;
  color: #fff;
}

.reject-btn {
  background: #ff6969;
  color: #fff;
}

.diff-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.6;
  background: var(--editorBgColor);
  min-height: 0;
}

.diff-line-wrapper {
  position: relative;
  min-height: 1.6em;
  width: max-content;
  min-width: 100%;
}

.diff-line-bg-layer {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 100%;
  z-index: 0;
  pointer-events: none;
}

.diff-line-bg-layer.added {
  background: rgba(33, 181, 111, 0.15);
}

.diff-line-bg-layer.removed {
  background: rgba(255, 105, 105, 0.15);
}

.diff-line {
  display: flex;
  min-width: 100%;
  width: max-content;
  padding: 2px 0;
  white-space: pre;
  position: relative;
  z-index: 1;
}

.line-marker {
  display: inline-block;
  min-width: 24px;
  padding: 2px 8px;
  text-align: center;
  font-weight: bold;
  font-size: 12px;
  user-select: none;
  flex-shrink: 0;
}

.line-marker.added {
  color: #21b56f;
}

.line-marker.removed {
  color: #ff6969;
}

.line-content {
  flex: 1;
  min-width: 0;
  padding: 2px 8px;
}
</style>
