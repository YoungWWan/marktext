<template>
    <div
      class="editor-with-tabs"
      :style="{'max-width': showSideBar ? `calc(100vw - ${sideBarWidth}px` : '100vw' }"
    >
      <tabs v-show="showTabBar"></tabs>
      <div class="container">
        <editor
          :markdown="markdown"
          :cursor="cursor"
          :text-direction="textDirection"
          :platform="platform"
        >
          <!-- AI Diff 作为编辑器内容的一部分，通过 slot 插入 -->
          <template slot="diff-overlay">
            <editor-diff-overlay></editor-diff-overlay>
          </template>
        </editor>
        <source-code
          v-if="sourceCode"
          :markdown="markdown"
          :cursor="cursor"
          :text-direction="textDirection"
        ></source-code>
      </div>
      <tab-notifications></tab-notifications>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import Tabs from './tabs.vue'
import Editor from './editor.vue'
import SourceCode from './sourceCode.vue'
import TabNotifications from './notifications.vue'
import EditorDiffOverlay from './editorDiffOverlay.vue'

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
  computed: {
    ...mapState({
      showSideBar: state => state.layout.showSideBar,
      sideBarWidth: state => state.layout.sideBarWidth
    })
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
</style>
