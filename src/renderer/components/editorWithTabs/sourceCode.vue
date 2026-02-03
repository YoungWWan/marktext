<template>
  <div
    class="source-code"
    ref="sourceCode"
  >
  </div>
</template>

<script>
import codeMirror, { setMode, setCursorAtLastLine, setTextDirection } from '../../codeMirror'
import { wordCount as getWordCount } from 'muya/lib/utils'
import { mapState } from 'vuex'
import { adjustCursor } from '../../util'
import bus from '../../bus'
import { oneDarkThemes, railscastsThemes } from '@/config'

export default {
  props: {
    markdown: String,
    cursor: Object,
    textDirection: {
      type: String,
      required: true
    }
  },

  computed: {
    ...mapState({
      theme: state => state.preferences.theme,
      sourceCode: state => state.preferences.sourceCode,
      currentTab: state => state.editor.currentFile
    })
  },

  data () {
    return {
      contentState: null,
      editor: null,
      commitTimer: null,
      viewDestroyed: false,
      tabId: null,
      isUserEditing: false,
      editingTimeout: null,
      isExternalUpdate: false, // Flag to track external updates
      isSyncingScroll: false, // Flag to prevent scroll sync loops
      scrollSyncTimer: null, // Timer for debouncing scroll sync
      lastSyncLine: -1, // Last synced line to avoid unnecessary updates
      sizerObserver: null // Observer for CodeMirror-sizer style changes
    }
  },

  watch: {
    textDirection: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        setTextDirection(editor, value)
      }
    },
    'currentTab.id' (newId) {
      // Update tabId when current tab changes
      if (newId) {
        this.tabId = newId
      }
    },
    markdown: {
      handler (newVal) {
        // Update editor content when markdown prop changes (from preview editor or store)
        // But not if user is currently editing in source code editor
        if (this.editor && !this.isUserEditing) {
          const currentValue = this.editor.getValue()
          if (currentValue !== newVal) {
            // Set flag to mark this as external update
            this.isExternalUpdate = true
            // Use replaceRange to preserve cursor position if possible
            const cursor = this.editor.getCursor()
            this.editor.setValue(newVal || '')
            // Try to restore cursor position if it's still valid
            try {
              const lineCount = this.editor.lineCount()
              if (cursor.line < lineCount) {
                const lineLength = this.editor.getLine(cursor.line).length
                const ch = Math.min(cursor.ch, lineLength)
                this.editor.setCursor({ line: cursor.line, ch })
              }
            } catch (e) {
              // If cursor restoration fails, set to end of document
              setCursorAtLastLine(this.editor)
            }
            // Reset flag after update
            this.$nextTick(() => {
              this.isExternalUpdate = false
            })
          }
        }
      },
      immediate: false
    }
  },

  created () {
    // Initialize tabId immediately
    if (this.currentTab && this.currentTab.id) {
      this.tabId = this.currentTab.id
    }
  },
  mounted () {
    // Initialize editor when component is mounted (DOM is ready)
    this.initEditor()
  },
  methods: {
    initEditor () {
      // Skip if editor already initialized
      if (this.editor) {
        return
      }

      this.$nextTick(() => {
        // TODO: Should we load markdown from the tab or mapped vue property?
        const { id } = this.currentTab
        const { markdown = '', theme, cursor, textDirection } = this
        const container = this.$refs.sourceCode

        if (!container) {
          // Retry if container is not ready
          setTimeout(() => this.initEditor(), 100)
          return
        }

        // Ensure tabId is set
        if (id && !this.tabId) {
          this.tabId = id
        }
        const codeMirrorConfig = {
          value: markdown,
          lineNumbers: true,
          autofocus: true,
          lineWrapping: true,
          styleActiveLine: true,
          direction: textDirection,
          // The amount of updates needed when scrolling. Settings this to >Infinity< or use CSS
          // >height: auto< result in bad performance because the whole document is always rendered.
          // Since we are using >height: auto< setting this to >Infinity< to fix #171. The best
          // solution would be to set a fixed height like in #791 but then the scrollbar is not on
          // the right side. Please also see CodeMirror#1104.
          viewportMargin: Infinity,
          lineNumberFormatter (line) {
            return line
          }
        }

        // Set theme
        if (railscastsThemes.includes(theme)) {
          codeMirrorConfig.theme = 'railscasts'
        } else if (oneDarkThemes.includes(theme)) {
          codeMirrorConfig.theme = 'one-dark'
        }

        // Init CodeMirror
        const editor = this.editor = codeMirror(container, codeMirrorConfig)

        // Remove negative margin-bottom from CodeMirror-sizer to fix bottom spacing issue
        // This is needed because CodeMirror automatically adds margin-bottom: -12px to the sizer
        // IMPORTANT: Don't touch margin-left as it's needed for line number spacing
        const removeNegativeMargin = () => {
          const sizer = editor.getWrapperElement().querySelector('.CodeMirror-sizer')
          if (sizer && sizer.style.marginBottom && sizer.style.marginBottom.includes('-')) {
            sizer.style.marginBottom = '0px'
            // Ensure margin-left is preserved (don't override it)
            // margin-left is set by CodeMirror to accommodate line numbers
          }
        }

        // Remove it immediately and after DOM updates
        this.$nextTick(() => {
          removeNegativeMargin()

          const wrapper = editor.getWrapperElement()

          // Hide horizontal scrollbar to prevent bottom spacing
          const hideHorizontalScrollbar = () => {
            const scrollElement = wrapper.querySelector('.CodeMirror-scroll')
            if (scrollElement) {
              scrollElement.style.overflowX = 'hidden'
            }
            // Also hide any horizontal scrollbar elements
            const hscrollbar = wrapper.querySelector('.CodeMirror-hscrollbar')
            if (hscrollbar) {
              hscrollbar.style.display = 'none'
              hscrollbar.style.height = '0'
            }
            const scrollbarFiller = wrapper.querySelector('.CodeMirror-scrollbar-filler')
            if (scrollbarFiller) {
              scrollbarFiller.style.display = 'none'
              scrollbarFiller.style.height = '0'
            }
          }

          hideHorizontalScrollbar()

          // Also listen for updates and remove it if CodeMirror re-adds it
          const sizer = wrapper.querySelector('.CodeMirror-sizer')
          if (sizer) {
            const observer = new MutationObserver(() => {
              removeNegativeMargin()
              hideHorizontalScrollbar()
            })
            observer.observe(sizer, {
              attributes: true,
              attributeFilter: ['style']
            })
            // Store observer for cleanup
            this.sizerObserver = observer

            // Also listen to CodeMirror's update events
            editor.on('update', () => {
              removeNegativeMargin()
              hideHorizontalScrollbar()
            })
            editor.on('renderLine', () => {
              removeNegativeMargin()
              hideHorizontalScrollbar()
            })
          }
        })

        bus.$on('file-loaded', this.handleFileChange)
        bus.$on('invalidate-image-cache', this.handleInvalidateImageCache)
        bus.$on('file-changed', this.handleFileChange)
        bus.$on('selectAll', this.handleSelectAll)
        bus.$on('image-action', this.handleImageAction)
        bus.$on('sync-scroll-to-line', this.handleSyncScrollToLine)

        setMode(editor, 'markdown')
        this.listenChange()

        editor.on('contextmenu', (cm, event) => {
          // Make sure no context menu is shown in source-code mode because we have to handle
          // Muyas menu by Electron.
          event.preventDefault()
          event.stopPropagation()
        })

        // NOTE: Cursor may be not null but the inner values are.
        if (cursor && cursor.anchor && cursor.focus) {
          const { anchor, focus } = cursor
          editor.setSelection(anchor, focus, { scroll: true }) // Scroll the focus into view.
        } else {
          setCursorAtLastLine(editor)
        }
        this.tabId = id
        console.log('[SourceCode] Editor initialized', { tabId: this.tabId, markdownLength: markdown.length })
      })
    },
    beforeDestroy () {
      // NOTE: Clear timer and manually commit changes. After mode switching and cleanup may follow
      // further key inputs, so ignore all inputs.
      this.viewDestroyed = true
      if (this.commitTimer) clearTimeout(this.commitTimer)
      if (this.editingTimeout) clearTimeout(this.editingTimeout)
      if (this.scrollSyncTimer) clearTimeout(this.scrollSyncTimer)
      if (this.scrollSyncTimer) clearTimeout(this.scrollSyncTimer)
      if (this.sizerObserver) {
        this.sizerObserver.disconnect()
        this.sizerObserver = null
      }
      this.cleanupScrollSync()

      bus.$off('file-loaded', this.handleFileChange)
      bus.$off('invalidate-image-cache', this.handleInvalidateImageCache)
      bus.$off('file-changed', this.handleFileChange)
      bus.$off('selectAll', this.handleSelectAll)
      bus.$off('image-action', this.handleImageAction)
      bus.$off('sync-scroll-to-line', this.handleSyncScrollToLine)

      const { editor } = this
      if (editor) {
        const { cursor, markdown } = this.getMarkdownAndCursor(editor)
        bus.$emit('file-changed', { id: this.tabId, markdown, cursor, renderCursor: true })
      }
    },
    handleImageAction ({ id, result, alt }) {
      const { editor } = this
      const value = editor.getValue()
      const focus = editor.getCursor('focus')
      const anchor = editor.getCursor('anchor')
      const lines = value.split('\n')
      const index = lines.findIndex(line => line.indexOf(id) > 0)

      if (index > -1) {
        const oldLine = lines[index]
        lines[index] = oldLine.replace(new RegExp(`!\\[${id}\\]\\(.*\\)`), `![${alt}](${result})`)
        const newValue = lines.join('\n')
        editor.setValue(newValue)
        const match = /(!\[.*\]\(.*\))/.exec(oldLine)
        if (!match) {
          // User maybe delete `![]()` structure, and the match is null.
          return
        }
        const range = {
          start: match.index,
          end: match.index + match[1].length
        }
        const delta = alt.length + result.length + 5 - match[1].length

        const adjust = pointer => {
          if (!pointer) {
            return
          }
          if (pointer.line !== index) {
            return
          }
          if (pointer.ch <= range.start) {
            // do nothing.
          } else if (pointer.ch > range.start && pointer.ch < range.end) {
            pointer.ch = range.start + alt.length + result.length + 5
          } else {
            pointer.ch += delta
          }
        }

        adjust(focus)
        adjust(anchor)
        if (focus && anchor) {
          editor.setSelection(anchor, focus, { scroll: true })
        } else {
          setCursorAtLastLine()
        }
      }
    },
    listenChange () {
      const { editor } = this
      const commitChanges = (cm, immediate = false) => {
        const { cursor, markdown } = this.getMarkdownAndCursor(cm)
        // Attention: the cursor may be `{focus: null, anchor: null}` when press `backspace`
        const wordCount = getWordCount(markdown)

        // Get currentId from store to ensure we're updating the correct file
        const currentId = this.$store.state.editor.currentFile.id
        if (!currentId) {
          console.warn('[SourceCode] Cannot commit changes: no current file id available')
          return
        }

        // Update this.tabId to keep it in sync
        if (currentId !== this.tabId) {
          this.tabId = currentId
        }

        if (immediate) {
          // Immediate commit for real-time sync
          if (!this.viewDestroyed) {
            console.log('[SourceCode] Immediate commit', { currentId, markdownLength: markdown.length })
            // Use currentId to ensure update is applied to currentFile
            this.$store.dispatch('LISTEN_FOR_CONTENT_CHANGE', { id: currentId, markdown, wordCount, cursor })
          }
        } else {
          // Debounced commit for performance
          if (this.commitTimer) clearTimeout(this.commitTimer)
          this.commitTimer = setTimeout(() => {
            // See "beforeDestroy" note
            if (!this.viewDestroyed) {
              // Use currentId to ensure update is applied to currentFile
              this.$store.dispatch('LISTEN_FOR_CONTENT_CHANGE', { id: currentId, markdown, wordCount, cursor })
            }
          }, 300) // Reduced from 1000ms to 300ms for faster sync
        }
      }

      // Listen to content changes (when user edits in source code editor)
      editor.on('change', (cm, changeObj) => {
        // Skip if this is an external update (from markdown prop or file-changed event)
        if (this.isExternalUpdate) {
          return
        }

        const currentId = this.$store.state.editor.currentFile.id
        console.log('[SourceCode] Change event triggered', {
          currentId,
          tabId: this.tabId,
          origin: changeObj ? changeObj.origin : 'unknown'
        })
        this.isUserEditing = true
        // Commit immediately for real-time sync when both views are open
        commitChanges(cm, true)
        // Also schedule a debounced commit for final state
        commitChanges(cm, false)
        // Reset editing flag after a longer delay to prevent file-changed events
        // from user's own edits from triggering updates
        if (this.editingTimeout) clearTimeout(this.editingTimeout)
        this.editingTimeout = setTimeout(() => {
          this.isUserEditing = false
        }, 1000) // Increased delay to prevent race conditions with file-changed events
      })
      // Also listen to cursor activity (for cursor position updates and scroll sync)
      editor.on('cursorActivity', (cm) => {
        // Only commit cursor changes if not currently editing
        if (!this.isUserEditing) {
          commitChanges(cm, false)
        }
        // Sync scroll to preview editor when cursor moves (with debounce)
        this.syncScrollToPreview(cm)
      })
    },
    // Another tab was selected - only listen to get changes but don't set history or other things.
    handleFileChange ({ id, markdown, cursor }) {
      // Skip if user is currently editing to prevent overwriting user changes
      if (this.isUserEditing) {
        console.log('[SourceCode] Skipping handleFileChange: user is editing')
        return
      }

      // Only update if this is for the current tab
      const currentId = this.$store.state.editor.currentFile.id
      if (id && id !== currentId) {
        console.log('[SourceCode] Skipping handleFileChange: different tab', { id, currentId })
        return
      }

      this.prepareTabSwitch()

      const { editor } = this
      if (!editor) {
        return
      }

      if (typeof markdown === 'string') {
        const currentValue = editor.getValue()
        // Only update if content actually changed to prevent unnecessary resets
        if (currentValue !== markdown) {
          // Save current scroll position before updating
          const scrollInfo = editor.getScrollInfo()
          const currentCursor = editor.getCursor()

          // Set flag to mark this as external update
          this.isExternalUpdate = true
          editor.setValue(markdown)

          // Restore scroll position to prevent jumping to top
          // This is especially important when the update comes from user's own edits
          // that were synced back through store
          this.$nextTick(() => {
            // Try to restore cursor position if it's still valid
            if (currentCursor) {
              try {
                const lineCount = editor.lineCount()
                if (currentCursor.line < lineCount) {
                  const lineLength = editor.getLine(currentCursor.line).length
                  const ch = Math.min(currentCursor.ch, lineLength)
                  editor.setCursor({ line: currentCursor.line, ch })
                  // Restore scroll position after cursor is set
                  editor.scrollTo(null, scrollInfo.top)
                } else {
                  // Cursor line is out of bounds, just restore scroll
                  editor.scrollTo(null, scrollInfo.top)
                }
              } catch (e) {
                // If cursor restoration fails, just restore scroll
                editor.scrollTo(null, scrollInfo.top)
              }
            } else {
              // No cursor to restore, just restore scroll
              editor.scrollTo(null, scrollInfo.top)
            }
            this.isExternalUpdate = false
          })
        } else {
          // Content is the same, don't update or scroll
          // This prevents unnecessary scrolling when file-changed event is triggered
          // by the user's own edits that were already applied
          return
        }
      }
      // Cursor is null when loading a file or creating a new tab in source code mode.
      // Handle cursor update for scroll sync (from preview editor)
      // Note: We now rely on scroll event sync for better accuracy, but still handle cursor updates
      if (cursor) {
        const { anchor, focus } = cursor
        if (anchor && focus && typeof anchor.line === 'number' && typeof focus.line === 'number') {
          // Only set selection, don't scroll here - let scroll sync handle it
          // This prevents conflicts with the new scroll event-based sync
          if (typeof markdown !== 'string') {
            // Cursor-only update: set selection without scrolling
            editor.setSelection(anchor, focus, { scroll: false })
          }
        }
      }
      if (id) {
        this.tabId = id
      }
    },
    // Get markdown and cursor from CodeMirror.
    getMarkdownAndCursor (cm) {
      let focus = cm.getCursor('head')
      let anchor = cm.getCursor('anchor')
      const markdown = cm.getValue()
      const convertToMuyaCursor = cursor => {
        const line = cm.getLine(cursor.line)
        const preLine = cm.getLine(cursor.line - 1)
        const nextLine = cm.getLine(cursor.line + 1)
        return adjustCursor(cursor, preLine, line, nextLine)
      }

      anchor = convertToMuyaCursor(anchor) // Selection start as Muya cursor
      focus = convertToMuyaCursor(focus) // Selection end as Muya cursor

      // Normalize cursor that `anchor` is always before `focus` because
      // this is the expected behavior in Muya.
      if (anchor && focus && anchor.line > focus.line) {
        const tmpCursor = focus
        focus = anchor
        anchor = tmpCursor
      }
      return { cursor: { focus, anchor }, markdown }
    },
    // Commit changes from old tab. Problem: tab was already switched, so commit changes with old tab id.
    prepareTabSwitch () {
      if (this.commitTimer) clearTimeout(this.commitTimer)
      const { editor } = this
      if (editor && this.tabId) {
        const { cursor, markdown } = this.getMarkdownAndCursor(editor)
        // Use tabId here because we're committing changes from the old tab
        this.$store.dispatch('LISTEN_FOR_CONTENT_CHANGE', { id: this.tabId, markdown, cursor })
      }
    },

    handleSelectAll () {
      if (!this.sourceCode) {
        return
      }

      const { editor } = this
      if (editor && editor.hasFocus()) {
        this.editor.execCommand('selectAll')
      } else {
        const activeElement = document.activeElement
        const nodeName = activeElement.nodeName
        if (nodeName === 'INPUT' || nodeName === 'TEXTAREA') {
          activeElement.select()
        }
      }
    },

    handleInvalidateImageCache () {
      if (this.editor) {
        this.editor.invalidateImageCache()
      }
    },

    // Sync scroll to preview editor based on cursor position
    syncScrollToPreview (cm) {
      // Only sync when user is actively editing (not during external updates)
      if (this.isExternalUpdate || !this.isUserEditing || this.isSyncingScroll) {
        return
      }

      const cursor = cm.getCursor()
      if (!cursor) return

      // Skip if line hasn't changed (avoid unnecessary updates)
      if (cursor.line === this.lastSyncLine) {
        return
      }

      // Debounce to avoid too frequent updates during typing
      if (this.scrollSyncTimer) {
        clearTimeout(this.scrollSyncTimer)
      }

      this.scrollSyncTimer = setTimeout(() => {
        // Double check conditions after debounce
        if (this.isExternalUpdate || !this.isUserEditing || this.isSyncingScroll) {
          return
        }

        const currentCursor = cm.getCursor()
        if (!currentCursor) return

        // Update last synced line
        this.lastSyncLine = currentCursor.line

        // Emit event to preview editor to scroll to this line
        bus.$emit('sync-scroll-to-line', {
          line: currentCursor.line,
          ch: currentCursor.ch
        })
      }, 200) // Debounce for 200ms to reduce flickering
    },

    // Handle scroll sync from preview editor (scroll to specific line)
    handleSyncScrollToLine ({ line, ch }) {
      const { editor } = this
      if (!editor) return

      // Skip if user is currently editing to avoid interrupting
      if (this.isUserEditing || this.isSyncingScroll) {
        return
      }

      // Check if line is valid
      const lineCount = editor.lineCount()
      if (line < 0 || line >= lineCount) {
        return
      }

      // Skip if already at this line
      const currentCursor = editor.getCursor()
      if (currentCursor && currentCursor.line === line) {
        return
      }

      // Set flag to prevent triggering our own scroll sync
      this.isSyncingScroll = true

      try {
        // Use requestAnimationFrame for smooth scrolling
        requestAnimationFrame(() => {
          try {
            // Get the coordinates of the line
            const coords = editor.charCoords({ line, ch: ch || 0 }, 'local')
            const scrollInfo = editor.getScrollInfo()

            // Calculate target scroll position to keep the line visible
            // Position the line in the upper third of viewport (not center, to avoid too much movement)
            const viewportThird = scrollInfo.clientHeight / 3
            const targetScroll = coords.top + scrollInfo.top - viewportThird

            // Only scroll if the line is not already visible
            const currentScrollTop = scrollInfo.top
            const lineTop = coords.top + currentScrollTop
            const lineBottom = coords.bottom + currentScrollTop
            const viewportTop = currentScrollTop
            const viewportBottom = currentScrollTop + scrollInfo.clientHeight

            // Check if line is already visible
            if (lineTop >= viewportTop && lineBottom <= viewportBottom) {
              return
            }

            // Scroll to the position smoothly
            editor.scrollTo(null, Math.max(0, targetScroll))
          } catch (e) {
            // Fallback: use scrollIntoView
            try {
              editor.scrollIntoView({ line, ch: ch || 0 }, 50)
            } catch (e2) {
              console.warn('[SourceCode] Failed to scroll to line:', e2)
            }
          } finally {
            // Reset flag after a short delay
            setTimeout(() => {
              this.isSyncingScroll = false
            }, 100)
          }
        })
      } catch (e) {
        this.isSyncingScroll = false
        console.warn('[SourceCode] Failed to scroll to line:', e)
      }
    }
  }
}
</script>

<style>
  .source-code {
    height: 100%;
    box-sizing: border-box;
    overflow: auto;
    display: flex;
    flex-direction: column;
    padding-bottom: 0 !important;
    margin-bottom: 0 !important;
  }

  /* In split-view mode, ensure no padding on source-code container */
  .container.split-view .source-code-panel .source-code {
    padding: 0 !important;
  }

  /* Ensure no bottom padding/margin in all modes */
  .source-code-panel .source-code {
    padding-bottom: 0 !important;
    margin-bottom: 0 !important;
  }
  /* Base CodeMirror styles - remove all top and bottom margins/padding */
  .source-code .CodeMirror {
    height: auto;
    margin: 0 auto !important;
    padding: 0 !important;
    max-width: var(--editorAreaWidth);
    background: transparent;
    flex: 1;
  }

  /* In split-view mode, remove all top and bottom margins/padding to match preview editor style */
  .source-code-panel .source-code .CodeMirror {
    margin: 0 20px !important;
    padding: 0 !important;
    max-width: none;
  }

  /* More specific selector for split-view mode */
  .container.split-view .source-code-panel .source-code .CodeMirror {
    margin: 0 20px !important;
    padding: 0 !important;
    max-width: none;
  }

  /* Remove padding from CodeMirror internal elements to match preview editor style */
  .source-code .CodeMirror-scroll {
    padding: 0 !important;
    margin: 0 !important;
    /* Hide horizontal scrollbar to prevent bottom spacing */
    overflow-x: hidden !important;
    overflow-y: auto;
  }

  /* Hide horizontal scrollbar completely */
  .source-code .CodeMirror-scroll::-webkit-scrollbar:horizontal {
    display: none !important;
    height: 0 !important;
  }

  /* Remove any bottom spacing from scrollbar track */
  .source-code .CodeMirror-scroll::-webkit-scrollbar-track:horizontal {
    display: none !important;
    height: 0 !important;
  }

  .source-code .CodeMirror-lines {
    padding: 0 !important;
    margin: 0 !important;
  }

  .source-code .CodeMirror-sizer {
    padding: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    margin-top: 0 !important;
    margin-right: 0 !important;
    margin-bottom: 0 !important;
    /* Keep margin-left for line numbers - don't override it! */
    /* margin-left is set by CodeMirror to accommodate line numbers (usually 30px) */
  }

  /* Force remove negative margin-bottom from CodeMirror-sizer (overrides inline styles) */
  .source-code .CodeMirror-sizer[style*="margin-bottom"] {
    margin-bottom: 0 !important;
  }

  /* Remove padding/margin from all CodeMirror internal elements */
  .source-code .CodeMirror-measure,
  .source-code .CodeMirror-cursor,
  .source-code .CodeMirror-selected {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  /* Remove bottom margin from all lines, especially last line */
  .source-code .CodeMirror-line {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  .source-code .CodeMirror-line:last-child {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  /* Ensure no bottom spacing in CodeMirror content - all pre elements */
  .source-code .CodeMirror pre,
  .source-code .CodeMirror pre.CodeMirror-line {
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Add spacing between line numbers and text content */
  .source-code .CodeMirror-gutters {
    border-right: none;
    background-color: transparent;
    margin: 0 !important;
    padding: 0 !important;
    /* Add right padding to create spacing between line numbers and text */
    padding-right: 16px !important;
  }

  /* Also add spacing to line number elements for better visual separation */
  .source-code .CodeMirror-linenumber {
    padding-right: 8px !important;
  }

  .source-code .CodeMirror-activeline-background,
  .source-code .CodeMirror-activeline-gutter {
    background: var(--floatHoverColor);
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  /* Remove any spacing from CodeMirror pseudo-elements */
  .source-code .CodeMirror::before,
  .source-code .CodeMirror::after {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  .source-code .CodeMirror-scroll::before,
  .source-code .CodeMirror-scroll::after {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  /* Ensure no bottom spacing in any CodeMirror child elements */
  .source-code .CodeMirror > * {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  /* Remove any line-height related spacing at the bottom */
  .source-code .CodeMirror-lines > div:last-child {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  /* Universal rule: remove all bottom spacing from any CodeMirror descendant */
  /* But preserve margin-left for proper line number spacing */
  .source-code .CodeMirror * {
    margin-bottom: 0 !important;
  }

  /* Ensure CodeMirror-sizer keeps its margin-left for line numbers */
  /* Don't override margin-left - it's set by CodeMirror via inline styles */
  .source-code .CodeMirror-sizer[style*="margin-left"] {
    /* Preserve margin-left, only override margin-bottom */
  }

  /* Ensure no bottom spacing from line numbers, but allow right padding for spacing */
  .source-code .CodeMirror-linenumber {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
    /* padding-right is set above to create spacing between line numbers and text */
  }

  /* Ensure no bottom spacing from any CodeMirror wrapper */
  .source-code .CodeMirror-wrap {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  /* Hide horizontal scrollbar and remove its space */
  .source-code .CodeMirror {
    overflow-x: hidden !important;
  }

  /* Remove any bottom spacing from CodeMirror scrollbar area */
  .source-code .CodeMirror-scrollbar-filler {
    display: none !important;
    height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Remove bottom spacing from CodeMirror's horizontal scrollbar container */
  .source-code .CodeMirror-hscrollbar {
    display: none !important;
    height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
</style>
