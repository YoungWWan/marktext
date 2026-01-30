import App from '@/pages/app'
import Preference from '@/pages/preference'
import General from '@/prefComponents/general'
import Editor from '@/prefComponents/editor'
import Markdown from '@/prefComponents/markdown'
import SpellChecker from '@/prefComponents/spellchecker'
import Theme from '@/prefComponents/theme'
import Image from '@/prefComponents/image'
import Keybindings from '@/prefComponents/keybindings'
import AI from '@/prefComponents/ai'

const parseSettingsPage = type => {
  let pageUrl = '/preference'
  // 支持 settings/ai, settings/spelling 等格式
  const match = type.match(/\/(\w+)$/)
  if (match) {
    const category = match[1]
    // 验证是有效的偏好设置类别
    const validCategories = ['general', 'editor', 'markdown', 'spelling', 'theme', 'image', 'keybindings', 'ai']
    if (validCategories.includes(category)) {
      pageUrl += '/' + category
    }
  }
  return pageUrl
}

const routes = type => ([{
  path: '/', redirect: type === 'editor' ? '/editor' : parseSettingsPage(type)
}, {
  path: '/editor', component: App
}, {
  path: '/preference',
  component: Preference,
  children: [{
    path: '', component: General
  }, {
    path: 'general', component: General, name: 'general'
  }, {
    path: 'editor', component: Editor, name: 'editor'
  }, {
    path: 'markdown', component: Markdown, name: 'markdown'
  }, {
    path: 'spelling', component: SpellChecker, name: 'spelling'
  }, {
    path: 'theme', component: Theme, name: 'theme'
  }, {
    path: 'image', component: Image, name: 'image'
  }, {
    path: 'keybindings', component: Keybindings, name: 'keybindings'
  }, {
    path: 'ai', component: AI, name: 'ai'
  }]
}])

export default routes
