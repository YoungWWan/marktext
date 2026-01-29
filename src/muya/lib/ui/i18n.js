// Muya UI i18n translations
const i18n = {
  en: {
    noResult: 'No result',
    select: 'Select',
    embedLink: 'Embed link',
    unsplash: 'Unsplash',
    chooseImage: 'Choose an Image',
    chooseImageDesc: 'Choose image from your computer.',
    altText: 'Alt text',
    imageLinkOrPath: 'Image link or local path',
    imageTitle: 'Image title',
    searchUnsplash: 'Search photos on Unsplash',
    // Front menu
    duplicate: 'Duplicate',
    turnInto: 'Turn Into',
    newParagraph: 'New Paragraph',
    delete: 'Delete',
    // Format picker
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    strikethrough: 'Strikethrough',
    highlight: 'Highlight',
    inlineCode: 'Inline Code',
    inlineMath: 'Inline Math',
    link: 'Link',
    image: 'Image',
    clearFormatting: 'Clear Formatting'
  },
  'zh-CN': {
    noResult: '无结果',
    select: '选择图片',
    embedLink: '嵌入链接',
    unsplash: 'Unsplash',
    chooseImage: '选择图片',
    chooseImageDesc: '从电脑中选择图片',
    altText: '替代文本',
    imageLinkOrPath: '图片链接或本地路径',
    imageTitle: '图片标题',
    searchUnsplash: '在 Unsplash 搜索图片',
    // Front menu
    duplicate: '复制',
    turnInto: '转换为',
    newParagraph: '新建段落',
    delete: '删除',
    // Format picker
    bold: '粗体',
    italic: '斜体',
    underline: '下划线',
    strikethrough: '删除线',
    highlight: '高亮',
    inlineCode: '行内代码',
    inlineMath: '行内公式',
    link: '链接',
    image: '图片',
    clearFormatting: '清除格式'
  }
}

// Get current language from global marktext settings
const getLang = () => {
  try {
    return global.marktext?.preferences?.language || 'en'
  } catch (e) {
    return 'en'
  }
}

export const t = (key) => {
  const lang = getLang()
  return i18n[lang]?.[key] || i18n.en[key] || key
}

export default i18n
