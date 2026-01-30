<template>
  <div
    v-show="showAiPanel"
    class="ai-panel-container"
    :style="{ width: `${panelWidth}px` }"
  >
    <div class="drag-bar" ref="dragBar"></div>
    <ai-chat></ai-chat>
  </div>
</template>

<script>
import AiChat from './chat.vue'
import { mapState, mapMutations } from 'vuex'

export default {
  name: 'AiPanel',
  components: {
    AiChat
  },
  data () {
    return {
      panelWidth: 400
    }
  },
  computed: {
    ...mapState({
      showAiPanel: state => state.layout.showAiPanel
    })
  },
  mounted () {
    this.initDragBar()
  },
  methods: {
    ...mapMutations(['SET_LAYOUT']),
    initDragBar () {
      const dragBar = this.$refs.dragBar
      if (!dragBar) return

      let startX = 0
      let startWidth = this.panelWidth

      const onMouseMove = (e) => {
        const diff = startX - e.clientX
        const newWidth = Math.max(300, Math.min(800, startWidth + diff))
        this.panelWidth = newWidth
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      dragBar.addEventListener('mousedown', (e) => {
        startX = e.clientX
        startWidth = this.panelWidth
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
      })
    }
  }
}
</script>

<style scoped>
.ai-panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--sideBarBgColor);
  border-left: 1px solid var(--sideBarTitleBorder);
  position: relative;
  box-sizing: border-box;
}

.drag-bar {
  position: absolute;
  left: 0;
  top: var(--titleBarHeight);
  bottom: 0;
  height: calc(100% - var(--titleBarHeight));
  width: 3px;
  cursor: col-resize;
  z-index: 10;
}

.drag-bar:hover {
  border-left: 2px solid var(--iconColor);
}
</style>
