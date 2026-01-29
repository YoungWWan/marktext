export default {
  preferences: {
    title: '偏好设置',
    searchPlaceholder: '搜索设置'
  },
  sidebar: {
    general: '通用',
    editor: '编辑器',
    markdown: 'Markdown',
    spelling: '拼写检查',
    theme: '主题',
    image: '图片',
    keybindings: '快捷键'
  },
  general: {
    title: '通用',
    autoSave: {
      title: '自动保存：',
      description: '自动保存文档更改',
      delayDescription: '编辑后延迟保存的时间'
    },
    window: {
      title: '窗口：',
      titleBarStyle: '标题栏样式',
      titleBarStyleNotes: '需要重启应用。',
      hideScrollbar: '隐藏滚动条',
      openFilesInNewWindow: '在新窗口中打开文件',
      openFolderInNewWindow: '在新窗口中打开文件夹',
      zoom: '缩放'
    },
    sidebar: {
      title: '侧边栏：',
      wordWrapInToc: '目录中自动换行',
      fileSortBy: '文件夹中文件的排序方式'
    },
    startup: {
      title: '启动时操作：',
      restoreLastSession: '恢复上次编辑会话',
      openDefaultDirectory: '打开默认目录',
      selectFolder: '选择文件夹',
      openBlankPage: '打开空白页'
    },
    misc: {
      title: '其他：',
      language: '界面语言'
    }
  },
  editor: {
    title: '编辑器',
    textEditor: {
      title: '文本编辑器设置：',
      fontSize: '字号',
      lineHeight: '行高',
      fontFamily: '字体',
      maxWidth: '文本编辑器最大宽度',
      maxWidthNotes: '留空使用主题默认值，否则使用带单位的数字：\'ch\'表示字符数，\'px\'表示像素，\'%\'表示百分比。'
    },
    codeBlock: {
      title: '代码块设置：',
      fontSize: '字号',
      fontFamily: '字体',
      showLineNumbers: '显示行号',
      removeEmptyLines: '删除首尾空行'
    },
    writing: {
      title: '书写行为：',
      autoPairBracket: '自动配对括号',
      autoPairMarkdownSyntax: '自动补全 Markdown 语法',
      autoPairQuote: '自动配对引号'
    },
    fileRepresentation: {
      title: '文件表示：',
      tabSize: '首选 Tab 宽度',
      lineEnding: '换行符类型',
      encoding: '默认编码',
      autoDetectEncoding: '自动检测文件编码',
      trailingNewline: '尾部换行符处理'
    },
    misc: {
      title: '其他：',
      textDirection: '文本方向',
      hideQuickInsertHint: '隐藏新段落类型选择提示',
      hideLinkPopup: '光标悬停链接时隐藏弹出框',
      autoCheck: '自动勾选相关任务'
    }
  },
  markdown: {
    title: 'Markdown',
    listSettings: {
      title: '列表设置：',
      preferLooseListItem: '优先使用松散列表项',
      bulletListMarker: '无序列表标记符',
      orderListDelimiter: '有序列表分隔符',
      listIndentation: '列表缩进'
    },
    headingSettings: {
      title: '标题设置：',
      preferHeadingStyle: '首选标题样式'
    },
    frontmatter: {
      title: 'Front Matter：',
      frontmatterType: 'Front Matter 类型'
    },
    diagram: {
      title: '图表：',
      sequenceTheme: '时序图主题'
    },
    extensions: {
      title: '扩展功能：',
      superSubScript: '启用上标和下标',
      footnote: '启用脚注',
      isHtmlEnabled: '启用 HTML 渲染',
      isGitlabCompatibilityEnabled: '启用 GitLab 兼容模式'
    }
  },
  theme: {
    title: '主题',
    themeSettings: {
      title: '主题设置：',
      theme: '主题',
      autoSwitchTheme: '自动切换主题'
    }
  },
  image: {
    title: '图片',
    insertBehavior: {
      title: '插入行为：',
      imageInsertAction: '插入图片时的默认操作'
    },
    folderSettings: {
      title: '文件夹设置：',
      preferRelativeDirectory: '优先使用相对目录',
      relativeDirectoryName: '相对目录名称'
    },
    uploader: {
      title: '图片上传：'
    }
  },
  spellchecker: {
    title: '拼写检查',
    settings: {
      title: '设置：',
      enabled: '启用拼写检查',
      noUnderline: '隐藏拼写错误下划线',
      language: '拼写检查语言'
    }
  },
  keybindings: {
    title: '快捷键',
    description: '自定义 MarkText 快捷键，点击下方保存按钮应用所有更改（需要重启）。所有可用和默认快捷键可在',
    online: '在线文档',
    viewOnline: '查看。',
    tableDescription: '描述',
    tableKeyCombination: '快捷键组合',
    tableOptions: '操作',
    editTitle: '编辑',
    resetTitle: '重置',
    unbindTitle: '解除绑定',
    save: '保存',
    restoreDefaults: '恢复默认快捷键',
    debugOptions: '调试选项：',
    dumpKeyboardInfo: '导出键盘信息',
    failedToSave: '保存失败',
    saveError: '保存时发生意外错误。',
    shortcutInUse: '快捷键已被使用',
    shortcutInUseMessage: '快捷键 "{accelerator}" 已被使用。请先解除该快捷键后再试。',
    pressKeyCombination: '按下快捷键组合',
    pressEnterOrEsc: '按 Enter 确认或按 ESC 退出。',
    invalidKeybinding: '当前快捷键组合无法绑定！'
  },
  titleBarStyle: {
    custom: '自定义',
    native: '原生'
  },
  fileSortBy: {
    created: '创建时间',
    modified: '修改时间',
    title: '标题'
  },
  endOfLine: {
    default: '默认',
    lf: 'LF (Unix)',
    crlf: 'CRLF (Windows)'
  },
  textDirection: {
    ltr: '从左到右',
    rtl: '从右到左'
  },
  trailingNewline: {
    remove: '移除',
    ensure: '确保存在',
    preserve: '保留原样'
  },
  autoSwitchTheme: {
    never: '从不',
    adjustAuto: '自动调整',
    openDark: '打开时为深色'
  },
  imageInsertAction: {
    upload: '上传到云端',
    folder: '复制到指定文件夹',
    path: '使用绝对路径'
  },
  languages: {
    en: 'English',
    zhCN: '简体中文'
  },
  // Sidebar - File Tree
  fileTree: {
    openedFiles: '已打开的文件',
    saveAll: '全部保存',
    closeAll: '全部关闭',
    emptyProject: '空项目',
    createFile: '创建文件'
  },
  // Sidebar - Table of Contents
  toc: {
    title: '目录'
  },
  // Sidebar - Search
  search: {
    placeholder: '搜索',
    searchInFolder: '在文件夹中搜索...',
    selectWholeWord: '选择整个单词',
    caseSensitive: '区分大小写',
    useRegex: '使用正则表达式',
    noFolderOpen: '未打开文件夹',
    noResultsFound: '未找到结果',
    replace: '替换',
    replaceAll: '全部替换'
  },
  // Editor hints
  editorHints: {
    typeToInsert: '输入 @ 插入'
  }
}
