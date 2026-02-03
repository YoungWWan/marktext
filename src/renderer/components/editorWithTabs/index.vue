<template>
    <div
      class="editor-with-tabs"
      :style="{'max-width': showSideBar ? `calc(100vw - ${sideBarWidth}px` : '100vw' }"
    >
      <tabs v-show="showTabBar"></tabs>
      <div class="container" :class="{ 'split-view': showPreview && showSourceCode && !sourceCode }">
        <editor
          v-show="showPreview && !sourceCode"
          :markdown="markdown"
          :cursor="cursor"
          :text-direction="textDirection"
          :platform="platform"
          class="preview-panel"
        >
          <!-- AI Diff 作为编辑器内容的一部分，通过 slot 插入 -->
          <template slot="diff-overlay">
            <editor-diff-overlay></editor-diff-overlay>
          </template>
        </editor>
        <source-code
          v-if="sourceCode || showSourceCode"
          :markdown="markdown"
          :cursor="cursor"
          :text-direction="textDirection"
          class="source-code-panel"
        ></source-code>
      </div>
      <tab-notifications></tab-notifications>
      <!-- 预览和源码切换按钮 -->
      <div class="view-toggle-container">
        <button
          class="view-toggle-btn preview-btn"
          :class="{ 'active': showPreview && !sourceCode }"
          @click="togglePreview"
          :title="previewText"
        >
          <span class="btn-icon">{{ previewText }}</span>
        </button>
        <button
          class="view-toggle-btn source-code-btn"
          :class="{ 'active': sourceCode || showSourceCode }"
          @click="toggleSourceCode"
          :title="sourceCodeText"
        >
          <span class="btn-icon">{{ sourceCodeText }}</span>
        </button>
      </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import Tabs from './tabs.vue'
import Editor from './editor.vue'
import SourceCode from './sourceCode.vue'
import TabNotifications from './notifications.vue'
import EditorDiffOverlay from './editorDiffOverlay.vue'
import bus from '@/bus'

export default {
  props: {
    markdown: {
      type: String,
      required: true
    },
    cursor: {
      validator (value) {
        return typeof value === 'object'
      },
      required: true
    },
    sourceCode: {
      type: Boolean,
      required: true
    },
    showTabBar: {
      type: Boolean,
      required: true
    },
    textDirection: {
      type: String,
      required: true
    },
    platform: {
      type: String,
      required: true
    }
  },
  components: {
    Tabs,
    Editor,
    SourceCode,
    TabNotifications,
    EditorDiffOverlay
  },
  data () {
    return {
      showPreview: true,
      showSourceCode: false
    }
  },
  computed: {
    ...mapState({
      showSideBar: state => state.layout.showSideBar,
      sideBarWidth: state => state.layout.sideBarWidth,
      showAiPanel: state => state.layout.showAiPanel
    }),
    previewText () {
      return this.$t('view.preview') || '预览'
    },
    sourceCodeText () {
      return this.$t('view.sourceCode') || '源码'
    }
  },
  watch: {
    sourceCode (newVal) {
      // 当通过菜单切换到源码模式时，同步状态
      if (newVal) {
        this.showPreview = false
        this.showSourceCode = true
      } else {
        // 切换回预览模式时，恢复默认状态
        if (!this.showPreview && !this.showSourceCode) {
          this.showPreview = true
        }
      }
    }
  },
  methods: {
    togglePreview () {
      // 如果当前是源码模式（通过菜单切换），先切换回预览模式
      if (this.sourceCode) {
        bus.$emit('view:toggle-view-entry', 'sourceCode')
      }
      // 切换预览显示状态
      this.showPreview = !this.showPreview
      // 如果两个都关闭，至少保持一个打开
      if (!this.showPreview && !this.showSourceCode) {
        this.showSourceCode = true
      }
    },
    toggleSourceCode () {
      // 如果当前是源码模式（通过菜单切换），切换回预览模式
      if (this.sourceCode) {
        bus.$emit('view:toggle-view-entry', 'sourceCode')
        this.showSourceCode = true
        return
      }
      // 切换源码显示状态
      this.showSourceCode = !this.showSourceCode
      // 如果两个都关闭，至少保持一个打开
      if (!this.showPreview && !this.showSourceCode) {
        this.showPreview = true
      }
    }
  }
}
</script>

<style scoped>
  .editor-with-tabs {
    position: relative;
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;

    overflow: hidden;
    background: var(--editorBgColor);
    & > .container {
      position: relative;
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    & > .container > .editor-container-wrapper {
      position: relative;
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  }

  .container.split-view {
    display: flex;
    flex-direction: row;
  }

  .container.split-view .preview-panel {
    flex: 1;
    min-width: 0;
    border-right: 1px solid var(--floatBorderColor, rgba(0, 0, 0, 0.1));
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .container.split-view .source-code-panel {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .container:not(.split-view) .source-code-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .view-toggle-container {
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 100;
    pointer-events: none;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .view-toggle-btn {
    position: relative;
    min-width: 50px;
    height: 28px;
    padding: 0 10px;
    border-radius: 14px;
    border: 1px solid var(--floatBorderColor, rgba(0, 0, 0, 0.1));
    background: var(--editorBgColor);
    color: var(--editorColor);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
    opacity: 0.85;
    font-size: 11px;
    font-weight: 500;
    user-select: none;
    pointer-events: auto;
  }

  .view-toggle-btn:hover {
    opacity: 1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  .view-toggle-btn.active {
    background: var(--themeColor, #007acc);
    color: #fff;
    border-color: var(--themeColor, #007acc);
    opacity: 1;
  }

  .view-toggle-btn .btn-icon {
    display: inline-block;
    line-height: 1;
    white-space: nowrap;
  }
</style>
