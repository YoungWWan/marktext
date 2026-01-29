// NOTE: This are mutable fields that may change at runtime.
import { t } from '../../lang'

export const getCut = () => ({
  label: t('context.cut'),
  id: 'cutMenuItem',
  role: 'cut'
})

export const getCopy = () => ({
  label: t('context.copy'),
  id: 'copyMenuItem',
  role: 'copy'
})

export const getPaste = () => ({
  label: t('context.paste'),
  id: 'pasteMenuItem',
  role: 'paste'
})

export const getCopyAsMarkdown = () => ({
  label: t('context.copyAsMarkdown'),
  id: 'copyAsMarkdownMenuItem',
  click (menuItem, targetWindow) {
    targetWindow.webContents.send('mt::cm-copy-as-markdown')
  }
})

export const getCopyAsHtml = () => ({
  label: t('context.copyAsHtml'),
  id: 'copyAsHtmlMenuItem',
  click (menuItem, targetWindow) {
    targetWindow.webContents.send('mt::cm-copy-as-html')
  }
})

export const getPasteAsPlainText = () => ({
  label: t('context.pasteAsPlainText'),
  id: 'pasteAsPlainTextMenuItem',
  click (menuItem, targetWindow) {
    targetWindow.webContents.send('mt::cm-paste-as-plain-text')
  }
})

export const getInsertBefore = () => ({
  label: t('context.insertParagraphBefore'),
  id: 'insertParagraphBeforeMenuItem',
  click (menuItem, targetWindow) {
    targetWindow.webContents.send('mt::cm-insert-paragraph', 'before')
  }
})

export const getInsertAfter = () => ({
  label: t('context.insertParagraphAfter'),
  id: 'insertParagraphAfterMenuItem',
  click (menuItem, targetWindow) {
    targetWindow.webContents.send('mt::cm-insert-paragraph', 'after')
  }
})

export const SEPARATOR = {
  type: 'separator'
}

// For backward compatibility
export const CUT = getCut()
export const COPY = getCopy()
export const PASTE = getPaste()
export const COPY_AS_MARKDOWN = getCopyAsMarkdown()
export const COPY_AS_HTML = getCopyAsHtml()
export const PASTE_AS_PLAIN_TEXT = getPasteAsPlainText()
export const INSERT_BEFORE = getInsertBefore()
export const INSERT_AFTER = getInsertAfter()
