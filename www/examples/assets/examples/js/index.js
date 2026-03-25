import ajt from 'ajax-tools'
import { diff } from 'ajax-tools/dom'
import { diffWords, diffWordsWithSpace, createTwoFilesPatch } from 'diff'
import diffable from 'diffable-html'
import { html } from 'diff2html'
import hljs from 'highlight.js'


let removed = []
;(window.ajtElementRemovedHandlers = window.ajtElementRemovedHandlers || []).push((el) => {
  removed.push((el.outerHTML || el.textContent).replace(' data-ajt-status="loading"', ''))
})

let added = []
;(window.ajtElementAddedHandlers = window.ajtElementAddedHandlers || []).push((el) => {
  added.push(el.outerHTML || el.textContent)
})

;(window.ajtResponseHandlers = window.ajtResponseHandlers || []).push((str) => {
  window.lastAjtResponse = str
  return str
})


window.ajt = (...args) => {
  if (document.getElementById('disable-ajt').checked) {
    return
  }
  removed = []
  added = []
  const changeMap = {}
  const exampleRoot = document.documentElement
  markNodes(exampleRoot, 'old')
  const rootClone = exampleRoot.cloneNode(true)
  markNodes(rootClone, 'old')
  return ajt(...args).then(() => {
    diffChanges(rootClone, exampleRoot)
    const changes = collectChanges(rootClone, 0, 2)
    const patch = createPatch(changes, 2)
    const targetElement = document.getElementById('diff');
    const configuration = {
      drawFileList: false,
      matching: 'lines',
      diffStyle: 'char',
      highlight: true,
      outputFormat: 'side-by-side',
      synchronisedScroll: true,
      highlight: true,
      renderNothingWhenEmpty: false,
      colorScheme: 'auto',
      maxLineLengthHighlight: 0,
      highlight: true,
      synchronisedScroll: true,
    }

    const diff2htmlUI = new Diff2HtmlUI(targetElement, patch, configuration)
    diff2htmlUI.draw()
    diff2htmlUI.highlightCode()

    const el = document.getElementById('response')
    const resp = diffable(window.lastAjtResponse)
      .split('\n')
      .filter((line) => line.trim())
      .join('\n')
    el.innerHTML = hljs.highlight(resp, { language: 'html' }).value
  })
}

function createChange(value, state, padding) {
  const lines = value.split('\n')
    .filter((line) => !!line)
    .map((line) => {
      return `${''.padEnd(padding)}${line}`
    })
  return {
    state: state,
    value: lines,
    count: lines.length,
  }
}

function limitDepth(node, depth) {
  if (depth === 0) {
    node.textContent = '...'
  } else {
    if (node.children) {
      Array.from(node.children).forEach((child) => {
        limitDepth(child, depth - 1)
      })
    }
  }
}

function collectChanges(node, depth = 0, limit = 2) {
  const padding = depth * 4
  const changes = []
  if (node.ajtDebug === 'inserted') {
    limitDepth(node, limit)
    changes.push(createChange(diffable(node.outerHTML || node.textContent), '+', padding))
  } else if (node.ajtDebug === 'deleted') {
    limitDepth(node, limit)
    changes.push(createChange(diffable(node.outerHTML || node.textContent), '-', padding))
  } else {
    if (node.innerHTML) {
      const html = diffable(node.cloneNode().outerHTML)

      const openingTag = html.substring(0, html.lastIndexOf('\n', html.length - 2))
      changes.push(createChange(openingTag, ' ', padding))
      Array.from(node.childNodes).forEach((child) => {
        changes.push(...collectChanges(child, depth + 1, limit))
      })
      const closingTag = html.substring(html.lastIndexOf('\n', html.length - 2))
      changes.push(createChange(closingTag, ' ', padding))
    } else {
      changes.push(createChange(diffable(node.textContent), ' ', padding))
    }
  }
  return changes.filter((change) => change.count > 0)
}

function createHunk(hunks, i) {
  if (hunks.length === 0 || i === 0) {
    const hunk = []
    hunk.isHunk = true
    return hunk
  }
  const item = hunks.pop()
  if (item.isHunk) {
    return item
  }
  const hunk = createHunk(hunks, i - 1)
  hunk.push(item)
  return hunk
}

function createPatch(changes, contextSize = 3) {
  const buffer = [
    '--- document.html',
    '+++ document.html',
  ]

  let currentHunk = null
  const hunks = []
  let hunkResetCounter = 0
  for (let change of changes) {
    if (!currentHunk) {
      if (change.state === ' ') {
        hunks.push(change)
      } else {
        const hunk = createHunk(hunks, contextSize)
        hunk.push(change)
        hunks.push(hunk)
        currentHunk = hunk
        hunkResetCounter = contextSize
      }
    } else {
      currentHunk.push(change)
      if (change.state === ' ') {
        hunkResetCounter -= 1
        if (hunkResetCounter === 0) {
          currentHunk = null
        }
      } else {
        hunkResetCounter = contextSize
      }
    }
  }

  let oldLines = 0
  let newLines = 0
  hunks.forEach((hunk) => {
    if (!hunk.isHunk) {
      oldLines += hunk.count
      newLines += hunk.count
    } else {
      const oldStart = oldLines + 1
      const newStart = newLines + 1
      hunk.forEach((change) => {
        if (change.state === '-') {
          oldLines += change.count
        } else if (change.state === '+') {
          newLines += change.count
        } else {
          oldLines += change.count
          newLines += change.count
        }
      })
      const oldSize = oldLines - oldStart
      const newSize = newLines - newStart
      buffer.push(`@@ -${oldStart},${oldSize} +${newStart},${newSize} @@`)
      hunk.forEach((change) => change.value.forEach((value) => {
        buffer.push(`${change.state}${value}`)
      }))
    }
  })
  return buffer.join('\n')
}

function markNodes(root, prefix) {
  const treeWalker = document.createTreeWalker(root)
  for (let node = treeWalker.nextNode(), i = 0; node; node = treeWalker.nextNode(), i++) {
    node.ajtDebugId = `${prefix}_${i}`
  }
}

function diffChanges(from, to) {
  const oldNodes = Array.from(from.childNodes)
  const newNodes = Array.from(to.childNodes)

  const operations = diff(oldNodes, newNodes, (a, b) => {
    return a.ajtDebugId === b.ajtDebugId
  })
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i]
    if (op.name === 'insert') {
      const newNode = newNodes[op.from].cloneNode(true)
      const oldNode = oldNodes[op.at]
      newNode.ajtDebug = 'inserted'
      from.insertBefore(newNode, oldNode)
    } else if (op.name === 'delete') {
      const oldNode = oldNodes[op.at]
      oldNode.ajtDebug = 'deleted'
    } else if (op.name === 'replace') {
      const newNode = newNodes[op.from].cloneNode(true)
      const oldNode = oldNodes[op.at]
      oldNode.ajtDebug = 'deleted'
      newNode.ajtDebug = 'inserted'
      oldNode.after(newNode)
    } else if (op.name === 'keep') {
      const fromOld = op.fromOld
      const fromNew = op.fromNew
      for (let j = 0; j < op.len; j++) {
        const newNode = newNodes[fromNew + j]
        const oldNode = oldNodes[fromOld + j]
        diffChanges(oldNode, newNode)
      }
    }
  }
}
