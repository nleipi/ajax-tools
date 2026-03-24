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
  const exampleRoot = document.getElementById('example')
  markNodes(exampleRoot, 'old')
  const rootClone = exampleRoot.cloneNode(true)
  markNodes(rootClone, 'old')
  return ajt(...args).then(() => {
    diffChanges(rootClone, exampleRoot)
    const ajtDiff = printDiff(rootClone).join('\n')
    const display = document.getElementById('display')
    display.textContent = ajtDiff
  })
}

function printChunk(chunk, prefix, padding) {
  return chunk.split('\n')
    .filter((line) => !!line)
    .map((line) => {
      console.log(line)
      return `${prefix.padEnd(padding)}${line}`
    })
    .join('\n')
}

function printDiff(node, depth = 0) {
  const padding = depth * 4
  const parts = []
  if (node.ajtDebug === 'inserted') {
    parts.push(printChunk(diffable(node.outerHTML || node.textContent), '+', padding))
  } else if (node.ajtDebug === 'deleted') {
    parts.push(printChunk(diffable(node.outerHTML || node.textContent), '-', padding))
  } else {
    if (node.innerHTML) {
      const html = diffable(node.cloneNode().outerHTML)
      const openingTag = html.substring(0, html.lastIndexOf('\n', html.length - 2))
      parts.push(printChunk(openingTag, '', padding))
      Array.from(node.childNodes).forEach((child) => {
        parts.push(...printDiff(child, depth + 1))
      })
      const closingTag = html.substring(html.lastIndexOf('\n', html.length - 2))
      parts.push(printChunk(closingTag, '', padding))
    } else {
      parts.push(printChunk(diffable(node.textContent), '', padding))
    }
  }
  return parts
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
