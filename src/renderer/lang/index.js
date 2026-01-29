import Vue from 'vue'
import VueI18n from 'vue-i18n'
import en from './en'
import zhCN from './zh-CN'

// Element UI languages
import elementEnLocale from 'element-ui/lib/locale/lang/en'
import elementZhCNLocale from 'element-ui/lib/locale/lang/zh-CN'
import elementLocale from 'element-ui/lib/locale'

Vue.use(VueI18n)

const messages = {
  en: {
    ...en
  },
  'zh-CN': {
    ...zhCN
  }
}

// Element UI language mapping
const elementLocales = {
  en: elementEnLocale,
  'zh-CN': elementZhCNLocale
}

// Get saved language or default to 'en'
const getDefaultLanguage = () => {
  try {
    // Try to get from localStorage first (for renderer process)
    const saved = localStorage.getItem('marktext-language')
    if (saved && messages[saved]) {
      return saved
    }
  } catch (e) {
    // Ignore errors
  }
  return 'en'
}

const defaultLang = getDefaultLanguage()

const i18n = new VueI18n({
  locale: defaultLang,
  fallbackLocale: 'en',
  messages,
  silentTranslationWarn: true
})

// Set Element UI language
elementLocale.use(elementLocales[i18n.locale] || elementEnLocale)

// Initialize global marktext preferences for muya
if (global.marktext && global.marktext.preferences) {
  global.marktext.preferences.language = defaultLang
}

// Function to change language
export const setLanguage = (lang) => {
  if (messages[lang]) {
    i18n.locale = lang
    localStorage.setItem('marktext-language', lang)
    // Update Element UI language
    elementLocale.use(elementLocales[lang] || elementEnLocale)
    // Update global marktext preferences for muya
    if (global.marktext && global.marktext.preferences) {
      global.marktext.preferences.language = lang
    }
    return true
  }
  return false
}

// Get available languages
export const getAvailableLanguages = () => {
  return [
    { label: 'English', value: 'en' },
    { label: '简体中文', value: 'zh-CN' }
  ]
}

export default i18n
