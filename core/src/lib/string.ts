export function nthIndexOf(str: string, char: string, count: number, from = 0, backwards = false) {
  let i
  if (backwards) {
    let startIndex = 0
    let matchCount = 0
    for (i = from; i >= 0; --i) {
      if (str[i] === char) {
        startIndex = i
        ++matchCount
      }
      if (matchCount === count) {
        break
      }
    }
    if (i === -1) {
      startIndex = 0
    }
    return startIndex
  }

  let matchCount = 0
  const len = str.length
  let endIndex = len - 1
  for (i = from; i < len; ++i) {
    if (str[i] === char) {
      endIndex = i
      ++matchCount
    }
    if (matchCount === count) {
      break
    }
  }
  if (i === len) {
    endIndex = len - 1
  }

  return endIndex
}
