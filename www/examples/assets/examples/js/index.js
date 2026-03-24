import ajt from 'ajax-tools'
import { diff } from 'ajax-tools/dom'
import { diffWords, diffWordsWithSpace, createTwoFilesPatch } from 'diff'
import diffable from 'diffable-html'
import { html } from 'diff2html'


let removed = []
;(window.ajtElementRemovedHandlers = window.ajtElementRemovedHandlers || []).push((el) => {
  removed.push((el.outerHTML || el.textContent).replace(' data-ajt-status="loading"', ''))
})

let added = []
;(window.ajtElementAddedHandlers = window.ajtElementAddedHandlers || []).push((el) => {
  added.push(el.outerHTML || el.textContent)
})

window.ajt = (...args) => {
  removed = []
  added = []
  const changeMap = {}
  const exampleRoot = document.documentElement
  markNodes(exampleRoot, 'old')
  const rootClone = exampleRoot.cloneNode(true)
  markNodes(rootClone, 'old')
  return ajt(...args).then(() => {
    diffChanges(rootClone, exampleRoot)
    const changes = collectChanges(rootClone)
    const patch = createPatch(changes)
    const targetElement = document.getElementById('display');
    const configuration = {
      drawFileList: false,
      matching: 'lines',
      highlight: true,
      outputFormat: 'side-by-side',
      synchronisedScroll: true,
      highlight: true,
      renderNothingWhenEmpty: false,
      colorScheme: 'auto'
    }
    // const diff2htmlUi = new Diff2HtmlUI(targetElement, patch, configuration)
    // diff2htmlUi.draw()
    // diff2htmlUi.highlightCode()

    targetElement.innerHTML = Diff2Html.html(patch, configuration)
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

function collectChanges(node, depth = 0) {
  const padding = depth * 4
  const changes = []
  if (node.ajtDebug === 'inserted') {
    changes.push(createChange(diffable(node.outerHTML || node.textContent), '+', padding))
  } else if (node.ajtDebug === 'deleted') {
    changes.push(createChange(diffable(node.outerHTML || node.textContent), '-', padding))
  } else {
    if (node.innerHTML) {
      const html = diffable(node.cloneNode().outerHTML)
      const openingTag = html.substring(0, html.lastIndexOf('\n', html.length - 2))
      changes.push(createChange(openingTag, ' ', padding))
      Array.from(node.childNodes).forEach((child) => {
        changes.push(...collectChanges(child, depth + 1))
      })
      const closingTag = html.substring(html.lastIndexOf('\n', html.length - 2))
      changes.push(createChange(closingTag, ' ', padding))
    } else {
      changes.push(createChange(diffable(node.textContent), ' ', padding))
    }
  }
  return changes.filter((change) => change.count > 0)
}

function createPatch(changes) {
  const buffer = [
    '--- document',
    '+++ document',
  ]
  let oldLines = 0
  let newLines = 0
  let currentHunk = null
  const hunks = []
  for (let change of changes) {
    if (!currentHunk) {
      if (change.state === ' ') {
        hunks.push([change])
      } else {
        currentHunk = hunks.pop() || []
        currentHunk.isHunk = true
        currentHunk.push(change)
        hunks.push(currentHunk)
      }
    } else {
      currentHunk.push(change)
      if (change.state === ' ') {
        currentHunk = null
      }
    }
  }
  hunks.forEach((hunk) => {
    console.log(hunk)
    if (!hunk.isHunk) {
      const lines = hunk.reduce((lines, change) => lines + change.count, 0)
      oldLines += lines
      newLines += lines
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
