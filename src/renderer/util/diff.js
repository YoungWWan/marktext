/**
 * Diff计算工具
 * 使用jsdiff库计算两个文本之间的差异，类似git diff
 */
import { diffLines } from 'diff'

/**
 * 计算两个文本的差异，只显示差异部分（不显示上下文）
 * 返回包含行信息和统计数据的对象
 * 每行包含：type (removed/added), content, oldLineNumber (在旧文档中的行号，从1开始), newLineNumber (在新文档中的行号，从1开始)
 */
export function calculateDiffLines (oldContent, newContent) {
  if (!oldContent && !newContent) {
    return { lines: [], stats: { additions: 0, deletions: 0 } }
  }

  // 使用jsdiff库计算差异
  const changes = diffLines(oldContent || '', newContent || '')

  // 统计添加和删除的行数
  let additions = 0
  let deletions = 0
  const lines = []

  // 跟踪当前行号
  let oldLineNumber = 1
  let newLineNumber = 1

  // 遍历所有变更
  for (const change of changes) {
    const changeLines = change.value.split('\n')
    // 移除最后一个空行（如果存在），因为split会在末尾产生空字符串
    if (changeLines.length > 0 && changeLines[changeLines.length - 1] === '') {
      changeLines.pop()
    }

    if (change.added) {
      // 添加的行
      for (const line of changeLines) {
        lines.push({
          type: 'added',
          content: line,
          oldLineNumber: null, // 新增的行在旧文档中不存在
          newLineNumber: newLineNumber++
        })
        additions++
      }
    } else if (change.removed) {
      // 删除的行
      for (const line of changeLines) {
        lines.push({
          type: 'removed',
          content: line,
          oldLineNumber: oldLineNumber++, // 行号从1开始
          newLineNumber: null // 删除的行在新文档中不存在
        })
        deletions++
      }
    } else {
      // 未变更的行（上下文），跳过不显示，但需要更新行号
      oldLineNumber += changeLines.length
      newLineNumber += changeLines.length
    }
  }

  return {
    lines,
    stats: {
      additions,
      deletions
    }
  }
}
