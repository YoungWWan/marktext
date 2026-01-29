import en from './en'
import zhCN from './zh-CN'

const messages = {
  en,
  'zh-CN': zhCN
}

let currentLanguage = 'en'

/**
 * Set the current language
 * @param {string} lang - Language code (e.g., 'en', 'zh-CN')
 */
export const setLanguage = (lang) => {
  if (messages[lang]) {
    currentLanguage = lang
    return true
  }
  return false
}

/**
 * Get the current language
 * @returns {string} Current language code
 */
export const getLanguage = () => currentLanguage

/**
 * Get a translated string
 * @param {string} key - Translation key (e.g., 'file.newTab')
 * @returns {string} Translated string or the key if not found
 */
export const t = (key) => {
  const keys = key.split('.')
  let result = messages[currentLanguage]
  
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k]
    } else {
      // Fallback to English
      result = messages.en
      for (const k2 of keys) {
        if (result && typeof result === 'object' && k2 in result) {
          result = result[k2]
        } else {
          return key
        }
      }
      break
    }
  }
  
  return typeof result === 'string' ? result : key
}

/**
 * Initialize language from preferences
 * @param {Object} preferences - Preferences object
 */
export const initLanguage = (preferences) => {
  if (preferences && preferences.language) {
    setLanguage(preferences.language)
  }
}

export default {
  t,
  setLanguage,
  getLanguage,
  initLanguage
}
