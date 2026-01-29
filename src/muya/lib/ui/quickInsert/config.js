import paragraphIcon from '../../assets/pngicon/paragraph/2.png'
import htmlIcon from '../../assets/pngicon/html/2.png'
import hrIcon from '../../assets/pngicon/horizontal_line/2.png'
import frontMatterIcon from '../../assets/pngicon/front_matter/2.png'
import header1Icon from '../../assets/pngicon/heading_1/2.png'
import header2Icon from '../../assets/pngicon/heading_2/2.png'
import header3Icon from '../../assets/pngicon/heading_3/2.png'
import header4Icon from '../../assets/pngicon/heading_4/2.png'
import header5Icon from '../../assets/pngicon/heading_5/2.png'
import header6Icon from '../../assets/pngicon/heading_6/2.png'
import newTableIcon from '../../assets/pngicon/new_table/2.png'
import bulletListIcon from '../../assets/pngicon/bullet_list/2.png'
import codeIcon from '../../assets/pngicon/code/2.png'
import quoteIcon from '../../assets/pngicon/quote_block/2.png'
import todoListIcon from '../../assets/pngicon/todolist/2.png'
import mathblockIcon from '../../assets/pngicon/math/2.png'
import orderListIcon from '../../assets/pngicon/order_list/2.png'
import flowchartIcon from '../../assets/pngicon/flowchart/2.png'
import sequenceIcon from '../../assets/pngicon/sequence/2.png'
import plantumlIcon from '../../assets/pngicon/plantuml/2.png'
import mermaidIcon from '../../assets/pngicon/mermaid/2.png'
import vegaIcon from '../../assets/pngicon/chart/2.png'
import { isOsx } from '../../config'

const COMMAND_KEY = isOsx ? '⌘' : 'Ctrl'
const OPTION_KEY = isOsx ? '⌥' : 'Alt'
const SHIFT_KEY = isOsx ? '⇧' : 'Shift'

// Command (or Cmd) ⌘
// Shift ⇧
// Option (or Alt) ⌥
// Control (or Ctrl) ⌃
// Caps Lock ⇪
// Fn

// i18n translations
const i18n = {
  en: {
    basicBlock: 'basic block',
    header: 'header',
    advancedBlock: 'advanced block',
    listBlock: 'list block',
    diagram: 'diagram',
    paragraph: 'Paragraph',
    paragraphSub: 'Lorem Ipsum is simply dummy text',
    horizontalLine: 'Horizontal Line',
    frontMatter: 'Front Matter',
    frontMatterSub: '--- Lorem Ipsum ---',
    header1: 'Header 1',
    header2: 'Header 2',
    header3: 'Header 3',
    header4: 'Header 4',
    header5: 'Header 5',
    header6: 'Header 6',
    headerSub: 'Lorem Ipsum is simply ...',
    tableBlock: 'Table Block',
    tableSub: '|Lorem | Ipsum is simply |',
    displayMath: 'Display Math',
    mathSub: '$$ Lorem Ipsum is simply $$',
    htmlBlock: 'HTML Block',
    htmlSub: '<div> Lorem Ipsum is simply </div>',
    codeBlock: 'Code Block',
    codeSub: '```java Lorem Ipsum is simply ```',
    quoteBlock: 'Quote Block',
    quoteSub: '>Lorem Ipsum is simply ...',
    orderList: 'Order List',
    orderListSub: '1. Lorem Ipsum is simply ...',
    bulletList: 'Bullet List',
    bulletListSub: '- Lorem Ipsum is simply ...',
    todoList: 'To-do List',
    todoListSub: '- [x] Lorem Ipsum is simply ...',
    vegaChart: 'Vega Chart',
    vegaChartSub: 'Render flow chart by vega-lite.js.',
    flowChart: 'Flow Chart',
    flowChartSub: 'Render flow chart by flowchart.js.',
    sequenceDiagram: 'Sequence Diagram',
    sequenceDiagramSub: 'Render sequence diagram by js-sequence.',
    plantumlDiagram: 'PlantUML Diagram',
    plantumlDiagramSub: 'Render PlantUML diagrams',
    mermaid: 'Mermaid',
    mermaidSub: 'Render Diagram by mermaid.',
    noResult: 'No result'
  },
  'zh-CN': {
    basicBlock: '基础块',
    header: '标题',
    advancedBlock: '高级块',
    listBlock: '列表块',
    diagram: '图表',
    paragraph: '段落',
    paragraphSub: '普通文本段落',
    horizontalLine: '分割线',
    frontMatter: 'Front Matter',
    frontMatterSub: '--- 文档元数据 ---',
    header1: '一级标题',
    header2: '二级标题',
    header3: '三级标题',
    header4: '四级标题',
    header5: '五级标题',
    header6: '六级标题',
    headerSub: '标题文本...',
    tableBlock: '表格',
    tableSub: '|列1 | 列2 |',
    displayMath: '数学公式块',
    mathSub: '$$ 数学公式 $$',
    htmlBlock: 'HTML 块',
    htmlSub: '<div> HTML 内容 </div>',
    codeBlock: '代码块',
    codeSub: '```java 代码内容 ```',
    quoteBlock: '引用块',
    quoteSub: '>引用文本...',
    orderList: '有序列表',
    orderListSub: '1. 列表项...',
    bulletList: '无序列表',
    bulletListSub: '- 列表项...',
    todoList: '任务列表',
    todoListSub: '- [x] 任务项...',
    vegaChart: 'Vega 图表',
    vegaChartSub: '使用 vega-lite.js 渲染图表',
    flowChart: '流程图',
    flowChartSub: '使用 flowchart.js 渲染流程图',
    sequenceDiagram: '时序图',
    sequenceDiagramSub: '使用 js-sequence 渲染时序图',
    plantumlDiagram: 'PlantUML 图',
    plantumlDiagramSub: '渲染 PlantUML 图表',
    mermaid: 'Mermaid 图',
    mermaidSub: '使用 Mermaid 渲染图表',
    noResult: '无结果'
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

const t = (key) => {
  const lang = getLang()
  return i18n[lang]?.[key] || i18n.en[key] || key
}

export const getQuickInsertObj = () => ({
  [t('basicBlock')]: [{
    title: t('paragraph'),
    subTitle: t('paragraphSub'),
    label: 'paragraph',
    shortCut: `${COMMAND_KEY}+0`,
    icon: paragraphIcon
  }, {
    title: t('horizontalLine'),
    subTitle: '---',
    label: 'hr',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+-`,
    icon: hrIcon
  }, {
    title: t('frontMatter'),
    subTitle: t('frontMatterSub'),
    label: 'front-matter',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+Y`,
    icon: frontMatterIcon
  }],
  [t('header')]: [{
    title: t('header1'),
    subTitle: `# ${t('headerSub')}`,
    label: 'heading 1',
    shortCut: `${COMMAND_KEY}+1`,
    icon: header1Icon
  }, {
    title: t('header2'),
    subTitle: `## ${t('headerSub')}`,
    label: 'heading 2',
    shortCut: `${COMMAND_KEY}+2`,
    icon: header2Icon
  }, {
    title: t('header3'),
    subTitle: `### ${t('headerSub')}`,
    label: 'heading 3',
    shortCut: `${COMMAND_KEY}+3`,
    icon: header3Icon
  }, {
    title: t('header4'),
    subTitle: `#### ${t('headerSub')}`,
    label: 'heading 4',
    shortCut: `${COMMAND_KEY}+4`,
    icon: header4Icon
  }, {
    title: t('header5'),
    subTitle: `##### ${t('headerSub')}`,
    label: 'heading 5',
    shortCut: `${COMMAND_KEY}+5`,
    icon: header5Icon
  }, {
    title: t('header6'),
    subTitle: `###### ${t('headerSub')}`,
    label: 'heading 6',
    shortCut: `${COMMAND_KEY}+6`,
    icon: header6Icon
  }],
  [t('advancedBlock')]: [{
    title: t('tableBlock'),
    subTitle: t('tableSub'),
    label: 'table',
    shortCut: `${SHIFT_KEY}+${COMMAND_KEY}+T`,
    icon: newTableIcon
  }, {
    title: t('displayMath'),
    subTitle: t('mathSub'),
    label: 'mathblock',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+M`,
    icon: mathblockIcon
  }, {
    title: t('htmlBlock'),
    subTitle: t('htmlSub'),
    label: 'html',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+J`,
    icon: htmlIcon
  }, {
    title: t('codeBlock'),
    subTitle: t('codeSub'),
    label: 'pre',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+C`,
    icon: codeIcon
  }, {
    title: t('quoteBlock'),
    subTitle: t('quoteSub'),
    label: 'blockquote',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+Q`,
    icon: quoteIcon
  }],
  [t('listBlock')]: [{
    title: t('orderList'),
    subTitle: t('orderListSub'),
    label: 'ol-order',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+O`,
    icon: orderListIcon
  }, {
    title: t('bulletList'),
    subTitle: t('bulletListSub'),
    label: 'ul-bullet',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+U`,
    icon: bulletListIcon
  }, {
    title: t('todoList'),
    subTitle: t('todoListSub'),
    label: 'ul-task',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+X`,
    icon: todoListIcon
  }],
  [t('diagram')]: [{
    title: t('vegaChart'),
    subTitle: t('vegaChartSub'),
    label: 'vega-lite',
    icon: vegaIcon
  }, {
    title: t('flowChart'),
    subTitle: t('flowChartSub'),
    label: 'flowchart',
    icon: flowchartIcon
  }, {
    title: t('sequenceDiagram'),
    subTitle: t('sequenceDiagramSub'),
    label: 'sequence',
    icon: sequenceIcon
  }, {
    title: t('plantumlDiagram'),
    subTitle: t('plantumlDiagramSub'),
    label: 'plantuml',
    icon: plantumlIcon
  }, {
    title: t('mermaid'),
    subTitle: t('mermaidSub'),
    label: 'mermaid',
    icon: mermaidIcon
  }]
})

// For backward compatibility
export const quickInsertObj = getQuickInsertObj()

export { t as getQuickInsertText }
