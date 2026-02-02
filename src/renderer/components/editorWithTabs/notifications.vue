<template>
  <div
    v-if="currentNotification && (currentNotification.msg || currentNotification.aiFileInfo)"
    class="editor-notifications"
    :class="currentNotification.style"
    :style="{'max-width': showSideBar ? `calc(100vw - ${sideBarWidth}px` : '100vw' }"
  >
    <div class="notification-content">
      <!-- 普通通知消息 -->
      <div v-if="currentNotification.msg && !currentNotification.aiFileInfo" class="msg">
        {{ currentNotification.msg }}
      </div>
      <!-- AI文件修改提示（diff在编辑器覆盖层中显示） -->
      <div v-if="currentNotification.aiFileInfo" class="ai-file-modified-hint">
        {{ $t('fileChange.changedByAI') || '文件已被AI修改，请在编辑器上方查看diff并确认' }}
      </div>
    </div>
    <div class="controls">
      <div>
        <span
          v-if="currentNotification.showConfirm && currentNotification.aiFileInfo"
          class="inline-button accept-btn"
          @click.stop="handleClick(true)"
        >
          {{ $t('ai.diffPreview.accept') || '接受' }}
        </span>
        <span
          v-if="currentNotification.showConfirm && currentNotification.aiFileInfo"
          class="inline-button reject-btn"
          @click.stop="handleClick(false)"
        >
          {{ $t('ai.diffPreview.reject') || '拒绝' }}
        </span>
        <span
          v-else-if="currentNotification.showConfirm"
          class="inline-button"
          @click.stop="handleClick(true)"
        >
          Ok
        </span>
        <span
          class="inline-button"
          @click.stop="handleClick(false)"
        >
          <svg class="close-icon icon" aria-hidden="true">
            <use id="default-close-icon" xlink:href="#icon-close-small"></use>
          </svg>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import bus from '@/bus'

export default {
  data () {
    return {
    }
  },
  computed: {
    ...mapState({
      currentFile: state => state.editor.currentFile,
      showSideBar: state => state.layout.showSideBar,
      sideBarWidth: state => state.layout.sideBarWidth
    }),
    currentNotification () {
      const notifications = this.currentFile.notifications
      if (!notifications || notifications.length === 0) {
        return null
      }
      return notifications[0]
    }
  },
  watch: {
  },
  methods: {
    handleClick (status) {
      const notifications = this.currentFile.notifications
      if (!notifications || notifications.length === 0) {
        console.error('notifications::handleClick: Cannot find notification on stack.')
        return
      }

      const item = notifications.shift()
      const action = item.action

      // 如果是AI文件修改，发送事件通知聊天框
      if (item.aiFileInfo) {
        bus.$emit('ai-diff-action', {
          filePath: item.aiFileInfo.diffPreview && item.aiFileInfo.diffPreview.filePath,
          action: status ? 'accepted' : 'rejected'
        })
      }

      if (action) {
        action(status)
      }
    }
  }
}
</script>

<style scoped>
  .editor-notifications {
    position: relative;
    display: flex;
    flex-direction: row;
    max-height: 400px;
    margin-top: 4px;
    background: var(--notificationPrimaryBg);
    color: var(--notificationPrimaryColor);
    padding: 8px 10px;
    user-select: none;
    overflow: hidden;
    &.warn {
      background: var(--notificationWarningBg);
      color: var(--notificationWarningColor);
    }
    &.crit {
      background: var(--notificationErrorBg);
      color: var(--notificationErrorColor);
    }
    &.info {
      background: var(--notificationInfoBg);
      color: var(--notificationInfoColor);
    }
  }
  .notification-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .msg {
    font-size: 13px;
  }
  .ai-file-modified-hint {
    font-size: 13px;
    color: var(--notificationInfoColor);
  }
  .diff-preview-container {
    width: 100%;
  }
  .diff-preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 11px;
  }
  .diff-stats {
    display: flex;
    gap: 8px;
    font-weight: 600;
  }
  .stat-added {
    color: #21b56f;
  }
  .stat-removed {
    color: #ff6969;
  }
  .toggle-diff {
    cursor: pointer;
    user-select: none;
    padding: 2px 6px;
  }
  .diff-preview-content {
    max-height: 200px;
    overflow-y: auto;
    overflow-x: auto;
    font-family: monospace;
    font-size: 11px;
    line-height: 1.5;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    padding: 4px;
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
    font-family: 'Courier New', monospace;
    line-height: 1.6;
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
  .controls {
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin-left: 12px;
    & > div {
      display: flex;
      flex-direction: row;
    }
    & .inline-button:not(:last-child) {
      margin-right: 3px;
    }
    & .inline-button {
      display: flex;
      justify-content: center;
      align-items: center;
      min-width: 50px;
      height: 24px;
      font-size: 12px;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      padding: 0 8px;
    }
    & .inline-button:hover {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.6);
    }
    & .accept-btn {
      background: rgba(33, 181, 111, 0.3);
      border-color: rgba(33, 181, 111, 0.5);
    }
    & .reject-btn {
      background: rgba(255, 105, 105, 0.3);
      border-color: rgba(255, 105, 105, 0.5);
    }
  }
</style>
