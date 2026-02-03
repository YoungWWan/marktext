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
          <span
            class="line-content"
            :class="line.type"
            v-html="renderMarkdownLine(line.content)"
          ></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import bus from '@/bus'
import { calculateDiffLines } from '@/util/diff'
import marked from 'muya/lib/parser/marked'

export default {
  name: 'EditorDiffOverlay',
  data () {
    return {
      diffLines: [],
      diffStats: { additions: 0, deletions: 0 },
      diffLineIndex: -1,
      editorElement: null,
      targetLineElement: null,
      isInserting: false,
      insertTimer: null
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
    // 当 diff 内容更新时，重新插入（使用防抖）
    if (this.insertTimer) {
      clearTimeout(this.insertTimer)
    }
    this.insertTimer = setTimeout(() => {
      this.insertDiffIntoEditor()
    }, 200)
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
          // 使用防抖，避免重复调用
          if (this.insertTimer) {
            clearTimeout(this.insertTimer)
          }
          this.insertTimer = setTimeout(() => {
            this.insertDiffIntoEditor()
          }, 300)
        }
      }
    },
    'currentFile.notifications': {
      deep: true,
      immediate: true,
      handler () {
        // 当通知数组变化时，触发重新计算和插入（使用防抖）
        if (this.insertTimer) {
          clearTimeout(this.insertTimer)
        }
        this.insertTimer = setTimeout(() => {
          this.insertDiffIntoEditor()
        }, 300)
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
      // 找到第一个变更的行号（使用新的行号信息）
      if (!this.diffLines || this.diffLines.length === 0) {
        this.diffLineIndex = -1
        return
      }

      // 找到第一个有行号的变更行（优先使用oldLineNumber，因为我们要在旧文档中定位）
      let changeLineNumber = -1
      for (let i = 0; i < this.diffLines.length; i++) {
        const diffLine = this.diffLines[i]
        if (diffLine.oldLineNumber !== null && diffLine.oldLineNumber !== undefined) {
          changeLineNumber = diffLine.oldLineNumber
          break
        } else if (diffLine.newLineNumber !== null && diffLine.newLineNumber !== undefined) {
          // 如果只有newLineNumber，使用它（但需要减去之前删除的行数）
          changeLineNumber = diffLine.newLineNumber
          break
        }
      }

      this.diffLineIndex = changeLineNumber > 0 ? changeLineNumber - 1 : -1 // 转换为0-based索引
    },
    insertDiffIntoEditor () {
      if (!this.currentNotification || !this.currentNotification.aiFileInfo) {
        return
      }

      if (!this.$el) {
        return
      }

      // 防止重复插入
      if (this.isInserting) {
        return
      }

      this.isInserting = true

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

      // Muya 编辑器结构：
      // container (contenteditable div) -> rootDom (div#ag-editor-id) -> 段落元素
      // 我们需要找到 rootDom，因为段落元素是 rootDom 的直接子节点
      let muyaContainer = null
      let muyaRootDom = null

      // 首先检查 editor-component 是否有 contenteditable 属性（说明它已经被 Muya 替换）
      if (editorComponent.hasAttribute('contenteditable')) {
        // editor-component 本身就是 Muya 的 container
        muyaContainer = editorComponent
        // 查找 rootDom（id 为 ag-editor-id 的 div）
        muyaRootDom = editorComponent.querySelector('div#ag-editor-id') || editorComponent.querySelector('div')
      } else {
        // 查找 contenteditable 的元素（Muya 的 container）
        muyaContainer = editorComponent.querySelector('[contenteditable="true"]')
        if (muyaContainer) {
          // 在 container 中查找 rootDom
          muyaRootDom = muyaContainer.querySelector('div#ag-editor-id') || muyaContainer.querySelector('div')
        } else {
          // 如果找不到 container，尝试直接查找 rootDom
          muyaRootDom = editorComponent.querySelector('div#ag-editor-id') || editorComponent.querySelector('div')
          if (muyaRootDom) {
            muyaContainer = muyaRootDom.parentNode
          }
        }
      }

      if (!muyaContainer) {
        console.log('[EditorDiffOverlay] Cannot find muyaContainer')
        return
      }

      // 如果没有找到 rootDom，使用 container 作为插入目标
      const insertTarget = muyaRootDom || muyaContainer
      console.log('[EditorDiffOverlay] Insert target:', {
        container: muyaContainer,
        rootDom: muyaRootDom,
        insertTarget: insertTarget,
        containerChildren: Array.from(muyaContainer.children).map(c => c.tagName + (c.id ? '#' + c.id : '')),
        rootDomChildren: muyaRootDom ? Array.from(muyaRootDom.children).map(c => c.tagName + (c.className || '')) : []
      })

      // 检查元素是否已经在正确位置
      // 如果元素已经在 insertTarget 中，且位置正确，就不需要重新插入
      if (this.$el.parentNode === insertTarget) {
        // 检查是否在正确位置（在目标元素之前）
        const targetElement = this.findLineElementInEditor(insertTarget)
        if (targetElement) {
          // 检查当前元素是否在目标元素之前
          const currentIndex = Array.from(insertTarget.children).indexOf(this.$el)
          const targetIndex = Array.from(insertTarget.children).indexOf(targetElement)
          if (currentIndex >= 0 && targetIndex >= 0 && currentIndex < targetIndex) {
            // 已经在正确位置，不需要重新插入
            this.isInserting = false
            return
          }
        } else {
          // 如果找不到目标元素，但元素已经在容器中，也认为位置正确
          this.isInserting = false
          return
        }
      }

      // 尝试定位到编辑器中的特定行（在 insertTarget 中查找）
      this.targetLineElement = this.findLineElementInEditor(insertTarget)

      // 如果元素已经在DOM中，先移除它
      if (this.$el.parentNode) {
        this.$el.parentNode.removeChild(this.$el)
      }

      if (this.targetLineElement) {
        // 验证目标元素是否是 insertTarget 的直接子节点
        if (this.targetLineElement.parentNode === insertTarget) {
          try {
            insertTarget.insertBefore(this.$el, this.targetLineElement)
            console.log('[EditorDiffOverlay] Inserted before target line element:', this.targetLineElement.textContent?.substring(0, 30))
            this.isInserting = false
            return
          } catch (error) {
            console.warn('[EditorDiffOverlay] Failed to insert before target element:', error)
            // 如果失败，继续执行fallback逻辑
          }
        } else {
          // 目标元素不是直接子节点，向上查找直到找到 insertTarget 的直接子节点
          let insertBeforeElement = this.targetLineElement
          let parent = this.targetLineElement.parentNode

          while (parent && parent !== insertTarget && parent !== document.body && parent !== document) {
            insertBeforeElement = parent
            parent = parent.parentNode
          }

          // 如果找到了 insertTarget 的直接子节点，使用它
          if (insertBeforeElement.parentNode === insertTarget) {
            try {
              insertTarget.insertBefore(this.$el, insertBeforeElement)
              console.log('[EditorDiffOverlay] Inserted before target parent element:', insertBeforeElement.textContent?.substring(0, 30))
              this.isInserting = false
              return
            } catch (error) {
              console.warn('[EditorDiffOverlay] Failed to insert before target parent element:', error)
            }
          } else {
            console.warn('[EditorDiffOverlay] Target element is not a descendant of insertTarget', {
              targetParent: this.targetLineElement.parentNode,
              insertTarget: insertTarget,
              targetElement: this.targetLineElement
            })
          }
        }
      }

      // 如果找不到目标行或插入失败，尝试插入到文档中第一个匹配的位置
      // 或者插入到开头
      try {
        // 再次尝试查找，这次使用更宽松的匹配
        const fallbackElement = this.findLineElementInEditor(insertTarget)
        if (fallbackElement && fallbackElement.parentNode === insertTarget) {
          insertTarget.insertBefore(this.$el, fallbackElement)
          console.log('[EditorDiffOverlay] Inserted into insertTarget (fallback match)')
          this.isInserting = false
          return
        }

        // 如果还是找不到，插入到第一个块元素之前
        const firstBlock = insertTarget.querySelector('p, h1, h2, h3, h4, h5, h6, blockquote, pre, li, div.ag-paragraph')
        if (firstBlock && firstBlock.parentNode === insertTarget) {
          insertTarget.insertBefore(this.$el, firstBlock)
          console.log('[EditorDiffOverlay] Inserted into insertTarget (before first block)')
          this.isInserting = false
          return
        }

        // 最后的fallback：插入到开头
        if (insertTarget.firstChild) {
          insertTarget.insertBefore(this.$el, insertTarget.firstChild)
          console.log('[EditorDiffOverlay] Inserted into insertTarget (fallback to first)')
        } else {
          insertTarget.appendChild(this.$el)
          console.log('[EditorDiffOverlay] Inserted into insertTarget (fallback append)')
        }
      } catch (error) {
        console.error('[EditorDiffOverlay] Failed to insert diff overlay:', error)
        // 最后的fallback：尝试直接append
        try {
          insertTarget.appendChild(this.$el)
          console.log('[EditorDiffOverlay] Inserted via appendChild (last resort)')
        } catch (appendError) {
          console.error('[EditorDiffOverlay] All insertion methods failed:', appendError)
        }
      } finally {
        this.isInserting = false
      }
    },
    findLineElementInEditor (insertTarget) {
      // 尝试通过内容匹配找到对应的行元素
      if (this.diffLineIndex < 0 || !this.diffLines || this.diffLines.length === 0) {
        return null
      }

      // 获取第一个变更行的内容（用于匹配），优先使用removed行
      const firstDiffLine = this.diffLines.find(line =>
        line.type === 'removed' && line.oldLineNumber !== null && line.oldLineNumber !== undefined
      ) || this.diffLines.find(line =>
        line.oldLineNumber !== null && line.oldLineNumber !== undefined
      ) || this.diffLines[0]

      if (!firstDiffLine) {
        return null
      }

      // 在Muya编辑器中查找包含该内容的块元素
      // Muya使用块结构，每个块可能包含多行，我们需要找到最接近的块
      const searchText = firstDiffLine.content.trim()
      if (!searchText) {
        // 如果内容为空，尝试通过行号定位
        return this.findElementByLineNumber(insertTarget)
      }

      // 查找所有块元素（p, h1-h6, blockquote等）
      const blockElements = insertTarget.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, pre, li, div.ag-paragraph')

      // 首先尝试精确匹配
      for (const block of blockElements) {
        const blockText = (block.textContent || '').trim()
        // 精确匹配或包含匹配
        if (blockText === searchText || blockText.includes(searchText) || searchText.includes(blockText)) {
          console.log('[EditorDiffOverlay] Found matching block by content:', blockText.substring(0, 50))
          return block
        }
      }

      // 如果找不到精确匹配，尝试通过行号定位
      return this.findElementByLineNumber(insertTarget)
    },
    findElementByLineNumber (insertTarget) {
      // 通过行号估算位置
      const allBlocks = Array.from(insertTarget.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, pre, li, div.ag-paragraph'))
      if (allBlocks.length > 0) {
        // 使用行号索引，但确保不越界
        const targetIndex = Math.min(this.diffLineIndex, allBlocks.length - 1)
        const targetBlock = allBlocks[targetIndex]
        console.log('[EditorDiffOverlay] Found block by line number:', targetIndex, targetBlock.textContent?.substring(0, 50))
        return targetBlock
      }
      return null
    },
    renderMarkdownLine (content) {
      if (!content) return ''

      try {
        // 使用marked渲染单行markdown
        const html = marked(content)

        // 清理HTML，移除可能的p标签包装（因为单行可能被包装在p中）
        let cleanedHtml = html.replace(/^<p>|<\/p>$/g, '').trim()

        // 如果清理后为空，说明可能是纯文本，返回原内容
        if (!cleanedHtml) {
          cleanedHtml = this.escapeHtml(content)
        }

        return cleanedHtml
      } catch (error) {
        console.error('[EditorDiffOverlay] Error rendering markdown:', error)
        // 如果渲染失败，返回转义的HTML
        return this.escapeHtml(content)
      }
    },
    escapeHtml (text) {
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
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
  position: relative;
  z-index: 1;
  align-items: flex-start;
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
  word-wrap: break-word;
}

/* 删除行的样式 - 红色删除线 */
.line-content.removed {
  color: #ff6969;
  text-decoration: line-through;
  opacity: 0.8;
}

/* 新增行的样式 - 绿色 */
.line-content.added {
  color: #21b56f;
}

/* 确保markdown渲染的内容也能正确显示样式 */
.line-content.removed ::v-deep h1,
.line-content.removed ::v-deep h2,
.line-content.removed ::v-deep h3,
.line-content.removed ::v-deep h4,
.line-content.removed ::v-deep h5,
.line-content.removed ::v-deep h6,
.line-content.removed ::v-deep p,
.line-content.removed ::v-deep span,
.line-content.removed ::v-deep div,
.line-content.removed ::v-deep strong,
.line-content.removed ::v-deep em {
  color: #ff6969 !important;
  text-decoration: line-through !important;
  opacity: 0.8;
}

.line-content.added ::v-deep h1,
.line-content.added ::v-deep h2,
.line-content.added ::v-deep h3,
.line-content.added ::v-deep h4,
.line-content.added ::v-deep h5,
.line-content.added ::v-deep h6,
.line-content.added ::v-deep p,
.line-content.added ::v-deep span,
.line-content.added ::v-deep div,
.line-content.added ::v-deep strong,
.line-content.added ::v-deep em {
  color: #21b56f !important;
}
</style>
