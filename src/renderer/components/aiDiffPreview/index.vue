<template>
  <div v-if="visible" class="ai-diff-preview">
    <div class="diff-header">
      <div class="diff-title">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>{{ $t('ai.diffPreview.title') || 'AI 编辑预览' }}</span>
      </div>
      <div class="diff-file">{{ filePath }}</div>
    </div>
    <div class="diff-content" ref="diffContent">
      <div
        v-for="(line, index) in diffLines"
        :key="index"
        class="diff-line"
        :class="line.type"
      >
        <span class="line-number">{{ line.oldLine || ' ' }}</span>
        <span class="line-number">{{ line.newLine || ' ' }}</span>
        <span class="line-content">{{ line.content }}</span>
      </div>
    </div>
    <div class="diff-footer">
      <button class="diff-btn reject-btn" @click="reject">
        {{ $t('ai.diffPreview.reject') || '拒绝' }}
      </button>
      <button class="diff-btn accept-btn" @click="accept">
        {{ $t('ai.diffPreview.accept') || '接受' }}
      </button>
    </div>
  </div>
</template>

<script>
import { diffLines } from 'diff'

export default {
  name: 'AiDiffPreview',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    filePath: {
      type: String,
      default: ''
    },
    oldContent: {
      type: String,
      default: ''
    },
    newContent: {
      type: String,
      default: ''
    },
    toolCallId: {
      type: String,
      default: ''
    }
  },
  computed: {
    diffLines () {
      if (!this.oldContent && !this.newContent) return []

      // 使用jsdiff库计算差异
      const changes = diffLines(this.oldContent || '', this.newContent || '')
      const lines = []

      // 跟踪当前行号
      let oldLineNum = 1
      let newLineNum = 1

      // 遍历所有变更
      for (const change of changes) {
        const changeLines = change.value.split('\n')
        // 移除最后一个空行（如果存在），因为split会在末尾产生空字符串
        if (changeLines.length > 0 && changeLines[changeLines.length - 1] === '') {
          changeLines.pop()
        }

        if (change.added) {
          // 添加的行
          for (const line of changeLines) {
            lines.push({
              type: 'added',
              content: line,
              oldLine: '',
              newLine: newLineNum++
            })
          }
        } else if (change.removed) {
          // 删除的行
          for (const line of changeLines) {
            lines.push({
              type: 'removed',
              content: line,
              oldLine: oldLineNum++,
              newLine: ''
            })
          }
        } else {
          // 未变更的行（上下文）
          for (const line of changeLines) {
            lines.push({
              type: 'context',
              content: line,
              oldLine: oldLineNum++,
              newLine: newLineNum++
            })
          }
        }
      }

      return lines
    }
  },
  methods: {
    accept () {
      // 通过事件通知父组件确认
      this.$emit('accept', {
        toolCallId: this.toolCallId,
        filePath: this.filePath,
        newContent: this.newContent
      })
    },
    reject () {
      // 通过事件通知父组件拒绝
      this.$emit('reject', {
        toolCallId: this.toolCallId
      })
    }
  }
}
</script>

<style scoped>
.ai-diff-preview {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  max-width: 900px;
  max-height: 80vh;
  background: var(--floatBgColor);
  border: 1px solid var(--floatBorderColor);
  box-shadow: var(--floatShadow);
  border-radius: 8px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.diff-header {
  padding: 16px;
  border-bottom: 1px solid var(--floatBorderColor);
  background: var(--sideBarBgColor);
}

.diff-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--editorColor);
  margin-bottom: 8px;
}

.diff-file {
  font-size: 12px;
  color: var(--editorColor50);
  font-family: monospace;
}

.diff-content {
  flex: 1;
  overflow-y: auto;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.5;
  background: var(--editorBgColor);
}

.diff-line {
  display: flex;
  padding: 2px 0;
  white-space: pre;
}

.diff-line.context {
  background: var(--editorBgColor);
  color: var(--editorColor);
}

.diff-line.added {
  background: rgba(33, 181, 111, 0.1);
  color: var(--editorColor);
}

.diff-line.removed {
  background: rgba(255, 105, 105, 0.1);
  color: var(--editorColor);
}

.line-number {
  display: inline-block;
  width: 50px;
  text-align: right;
  padding: 0 12px;
  color: var(--editorColor50);
  user-select: none;
  flex-shrink: 0;
}

.line-content {
  flex: 1;
  padding-right: 16px;
}

.diff-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--floatBorderColor);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: var(--sideBarBgColor);
}

.diff-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s;
}

.diff-btn:hover {
  opacity: 0.9;
}

.reject-btn {
  background: var(--deleteColor);
  color: #fff;
}

.accept-btn {
  background: var(--themeColor);
  color: #fff;
}
</style>
