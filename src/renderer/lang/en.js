export default {
  preferences: {
    title: 'Preferences',
    searchPlaceholder: 'Search preferences'
  },
  sidebar: {
    general: 'General',
    editor: 'Editor',
    markdown: 'Markdown',
    spelling: 'Spelling',
    theme: 'Theme',
    image: 'Image',
    keybindings: 'Key Bindings',
    ai: 'AI'
  },
  general: {
    title: 'General',
    autoSave: {
      title: 'Auto Save:',
      description: 'Automatically save document changes',
      delayDescription: 'Delay following document edit before automatically saving'
    },
    window: {
      title: 'Window:',
      titleBarStyle: 'Title bar style',
      titleBarStyleNotes: 'Requires restart.',
      hideScrollbar: 'Hide scrollbars',
      openFilesInNewWindow: 'Open files in new window',
      openFolderInNewWindow: 'Open folders in new window',
      zoom: 'Zoom'
    },
    sidebar: {
      title: 'Sidebar:',
      wordWrapInToc: 'Wrap text in table of contents',
      fileSortBy: 'Sort field for files in open folders'
    },
    startup: {
      title: 'Action on startup:',
      restoreLastSession: 'Restore last editor session',
      openDefaultDirectory: 'Open the default directory',
      selectFolder: 'Select Folder',
      openBlankPage: 'Open a blank page'
    },
    misc: {
      title: 'Misc:',
      language: 'User interface language'
    }
  },
  editor: {
    title: 'Editor',
    textEditor: {
      title: 'Text editor settings:',
      fontSize: 'Font size',
      lineHeight: 'Line height',
      fontFamily: 'Font family',
      maxWidth: 'Maximum width of text editor',
      maxWidthNotes: 'Leave empty for theme default, otherwise use number with unit suffix, which is one of \'ch\' for characters, \'px\' for pixels, or \'%\' for percentage.'
    },
    codeBlock: {
      title: 'Code block settings:',
      fontSize: 'Font size',
      fontFamily: 'Font family',
      showLineNumbers: 'Show line numbers',
      removeEmptyLines: 'Remove leading and trailing empty lines'
    },
    writing: {
      title: 'Writing behavior:',
      autoPairBracket: 'Automatically close brackets when writing',
      autoPairMarkdownSyntax: 'Automatically complete markdown syntax',
      autoPairQuote: 'Automatically close quotation marks'
    },
    fileRepresentation: {
      title: 'File representation:',
      tabSize: 'Preferred tab width',
      lineEnding: 'Line separator type',
      encoding: 'Default encoding',
      autoDetectEncoding: 'Automatically detect file encoding',
      trailingNewline: 'Handling of trailing newline characters'
    },
    misc: {
      title: 'Misc:',
      textDirection: 'Text direction',
      hideQuickInsertHint: 'Hide hint for selecting type of new paragraph',
      hideLinkPopup: 'Hide popup when cursor is over link',
      autoCheck: 'Whether to automatically check any related tasks'
    }
  },
  markdown: {
    title: 'Markdown',
    listSettings: {
      title: 'List settings:',
      preferLooseListItem: 'Prefer loose list item',
      bulletListMarker: 'Bullet list marker',
      orderListDelimiter: 'Order list delimiter',
      listIndentation: 'List indentation'
    },
    headingSettings: {
      title: 'Heading settings:',
      preferHeadingStyle: 'Prefer heading style'
    },
    frontmatter: {
      title: 'Front Matter:',
      frontmatterType: 'Front matter type'
    },
    diagram: {
      title: 'Diagram:',
      sequenceTheme: 'Sequence diagram theme'
    },
    extensions: {
      title: 'Extensions:',
      superSubScript: 'Enable superscript and subscript',
      footnote: 'Enable footnote',
      isHtmlEnabled: 'Enable HTML rendering',
      isGitlabCompatibilityEnabled: 'Enable GitLab compatibility'
    }
  },
  theme: {
    title: 'Theme',
    themeSettings: {
      title: 'Theme settings:',
      theme: 'Theme',
      autoSwitchTheme: 'Auto switch theme'
    }
  },
  image: {
    title: 'Image',
    insertBehavior: {
      title: 'Insert behavior:',
      imageInsertAction: 'Default action when inserting images'
    },
    folderSettings: {
      title: 'Folder settings:',
      preferRelativeDirectory: 'Prefer relative directory',
      relativeDirectoryName: 'Relative directory name'
    },
    uploader: {
      title: 'Image uploader:'
    }
  },
  spellchecker: {
    title: 'Spelling',
    settings: {
      title: 'Settings:',
      enabled: 'Enable spellchecker',
      noUnderline: 'Hide underline for misspelled words',
      language: 'Spellchecker language'
    }
  },
  keybindings: {
    title: 'Key Bindings',
    description: 'Customize MarkText shortcuts and click on the save button below to apply all changes (requires a restart). All available and default key binding can be found',
    online: 'online',
    viewOnline: '.',
    tableDescription: 'Description',
    tableKeyCombination: 'Key Combination',
    tableOptions: 'Options',
    editTitle: 'Edit',
    resetTitle: 'Reset',
    unbindTitle: 'Unbind',
    save: 'Save',
    restoreDefaults: 'Restore default key bindings',
    debugOptions: 'Debug options:',
    dumpKeyboardInfo: 'Dump keyboard information',
    failedToSave: 'Failed to save',
    saveError: 'An unexpected error occurred while saving.',
    shortcutInUse: 'Shortcut already in use',
    shortcutInUseMessage: 'The shortcut "{accelerator}" is already in use. Please unset the shortcut and try again.',
    pressKeyCombination: 'Press a key combination',
    pressEnterOrEsc: 'Press Enter to continue or ESC to exit.',
    invalidKeybinding: 'Current key combination cannot be bound!'
  },
  titleBarStyle: {
    custom: 'Custom',
    native: 'Native'
  },
  fileSortBy: {
    created: 'Creation time',
    modified: 'Modification time',
    title: 'Title'
  },
  endOfLine: {
    default: 'Default',
    lf: 'LF (Unix)',
    crlf: 'CRLF (Windows)'
  },
  textDirection: {
    ltr: 'Left to Right',
    rtl: 'Right to Left'
  },
  trailingNewline: {
    remove: 'Remove',
    ensure: 'Ensure exactly one',
    preserve: 'Preserve'
  },
  autoSwitchTheme: {
    never: 'Never',
    adjustAuto: 'Adjust automatically',
    openDark: 'Open in dark mode'
  },
  imageInsertAction: {
    upload: 'Upload to cloud',
    folder: 'Copy to designated folder',
    path: 'Use absolute path'
  },
  languages: {
    en: 'English',
    zhCN: '简体中文'
  },
  // Sidebar - File Tree
  fileTree: {
    openedFiles: 'Opened files',
    saveAll: 'Save All',
    closeAll: 'Close All',
    emptyProject: 'Empty project',
    createFile: 'Create File'
  },
  // Sidebar - Table of Contents
  toc: {
    title: 'Table Of Contents'
  },
  // Sidebar - Search
  search: {
    placeholder: 'Search',
    searchInFolder: 'Search in folder...',
    selectWholeWord: 'Select whole word',
    caseSensitive: 'Case sensitive',
    useRegex: 'Use regular expression',
    noFolderOpen: 'No folder open',
    noResultsFound: 'No results found.',
    replace: 'Replace',
    replaceAll: 'Replace All'
  },
  // Editor hints
  editorHints: {
    typeToInsert: 'Type @ to insert'
  },
  // AI Settings Page
  aiSettings: {
    title: 'AI',
    provider: {
      title: 'Provider:',
      description: 'AI service provider'
    },
    model: {
      title: 'Model:',
      description: 'AI model to use',
      placeholder: 'e.g. claude-sonnet-4-20250514, gpt-4o'
    },
    apiKey: {
      title: 'API Key:',
      description: 'API key for the selected provider',
      notes: 'Your API key is stored locally and never shared.',
      placeholder: 'Enter your API key'
    },
    agent: {
      title: 'Agent:',
      description: 'Default agent type'
    },
    baseUrl: {
      title: 'Custom Base URL:',
      description: 'Custom API endpoint (optional)',
      notes: 'Leave empty to use the default endpoint.',
      placeholder: 'https://api.example.com/v1'
    },
    test: {
      title: 'Test Connection:',
      description: 'Test if your AI configuration is correct',
      button: 'Test Connection',
      testing: 'Testing...',
      success: 'Connected ✓',
      failed: 'Failed ✗',
      successMessage: 'Configuration is correct and ready to use',
      errorMessage: 'Connection failed, please check your configuration'
    }
  },
  // AI Agent
  ai: {
    title: 'AI',
    settings: 'Settings',
    newSession: 'New Session',
    sessions: 'Sessions',
    noSessions: 'No sessions yet',
    deleteSession: 'Delete session',
    deleteConfirm: 'Are you sure you want to delete this session?',
    startNew: 'Start a new session to begin',
    agent: 'Agent',
    selectAgent: 'Select Agent',
    mcpStatus: 'MCP Status',
    noMcp: 'No MCP servers configured',
    connected: 'Connected',
    disconnected: 'Disconnected',
    processing: 'Processing...',
    cancel: 'Cancel',
    send: 'Send',
    inputPlaceholder: 'Type your message... (Shift+Enter for new line)',
    you: 'You',
    assistant: 'Assistant',
    thinking: 'Thinking...',
    toolPending: 'Pending',
    toolRunning: 'Running',
    toolDone: 'Done',
    toolError: 'Error',
    input: 'Input',
    tokens: 'Tokens',
    permissionRequest: 'Permission Request',
    allow: 'Allow',
    deny: 'Deny',
    diffPreview: {
      title: 'AI Edit Preview',
      accept: 'Accept',
      reject: 'Reject'
    },
    alwaysAllow: 'Always Allow',
    error: 'Error',
    noApiKey: 'Please configure your API key in Preferences → AI',
    openSettings: 'Open Settings'
  }
}
