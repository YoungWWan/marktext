/**
 * Diff计算工具
 * 用于计算两个文本之间的差异，类似git diff
 */

/**
 * 计算最长公共子序列 (LCS)
 * 返回匹配点的数组，每个匹配点包含 {oldIndex, newIndex}
 */
export function computeLCS (oldLines, newLines) {
  const m = oldLines.length
  const n = newLines.length

  if (m === 0 || n === 0) {
    return []
  }

  // 使用动态规划计算 LCS
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // 回溯找到所有匹配点
  const matches = []
  let i = m
  let j = n

  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      matches.unshift({ oldIndex: i - 1, newIndex: j - 1 })
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return matches
}

/**
 * 计算两个文本的差异，只显示差异部分（不显示上下文）
 * 返回包含行信息和统计数据的对象
 */
export function calculateDiffLines (oldContent, newContent) {
  if (!oldContent && !newContent) {
    return { lines: [], stats: { additions: 0, deletions: 0 } }
  }

  const oldLines = oldContent ? oldContent.split('\n') : []
  const newLines = newContent ? newContent.split('\n') : []

  // 使用 LCS 算法找到所有匹配的行
  const matches = computeLCS(oldLines, newLines)

  // 统计添加和删除的行数
  let additions = 0
  let deletions = 0
  const lines = []

  // 将匹配点转换为 diff 行，只显示差异部分
  let oldIndex = 0
  let newIndex = 0
  let matchIndex = 0

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    // 找到下一个匹配点
    const nextMatch = matchIndex < matches.length ? matches[matchIndex] : null
    const nextMatchOldIndex = nextMatch ? nextMatch.oldIndex : oldLines.length
    const nextMatchNewIndex = nextMatch ? nextMatch.newIndex : newLines.length

    // 收集删除的行
    while (oldIndex < oldLines.length && oldIndex < nextMatchOldIndex) {
      lines.push({
        type: 'removed',
        content: oldLines[oldIndex]
      })
      deletions++
      oldIndex++
    }

    // 收集添加的行
    while (newIndex < newLines.length && newIndex < nextMatchNewIndex) {
      lines.push({
        type: 'added',
        content: newLines[newIndex]
      })
      additions++
      newIndex++
    }

    // 跳过匹配的行（不显示上下文）
    if (nextMatch && oldIndex === nextMatch.oldIndex && newIndex === nextMatch.newIndex) {
      oldIndex++
      newIndex++
      matchIndex++
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
