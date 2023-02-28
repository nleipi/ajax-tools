function handleRemoveContent (element) {
  for (let i = 0, len = window.ajtElementRemovedHandlers.length; i < len; i++) {
    try {
      window.ajtElementRemovedHandlers[i](element)
    } catch (e) {
      console.warn(e)
    }
  }
}

function replaceScript (original) {
  const copy = document.createElement('script')
  const attributes = original.attributes
  for (let i = 0, len = attributes.length; i < len; i++) {
    const attr = attributes[i]
    copy.setAttribute(attr.name, attr.value)
  }
  copy.textContent = original.textContent
  original.parentNode.replaceChild(copy, original)
}

function handleAddContent (element) {
  for (let i = 0, len = window.ajtElementAddedHandlers.length; i < len; i++) {
    try {
      window.ajtElementAddedHandlers[i](element)
    } catch (e) {
      console.warn(e)
    }
  }
}

function createInsertContentHandler (strategy) {
  return (node, target, handleRemoveContent, handleAddContent) => {
    const fragment = document.createDocumentFragment()
    const nodes = []
    while (node.firstChild) {
      nodes.push(fragment.appendChild(node.firstChild))
    }
    strategy(target, fragment)
    for (let i = 0, len = nodes.length; i < len; i++) {
      handleAddContent(nodes[i])
    }
  }
}

export default function processContent (doc) {
  let node
  while ((node = doc.querySelector('[data-ajt-mode]'))) {
    node = document.adoptNode(node)
    const handler = window.ajtContentHandlers[node.dataset.ajtMode]
    if (handler) {
      let targets;
      if (node.dataset.ajtTarget) {
        targets = document.querySelectorAll(node.dataset.ajtTarget)
      } else if (node.id) {
        const target = document.getElementById(node.id);
        if (target) {
          targets = [target];
        }
      } else {
        console.warn(`No data-ajt-target or id is defined for node ${node}`)
      }
      if (targets) {
        targets.forEach((target) => {
          try {
            handler(node.cloneNode(true), target, handleRemoveContent, handleAddContent)
          } catch (e) {
            console.error(e)
          }
        })
      }
    } else {
      console.warn('Unknown ajt mode: ' + node.dataset.ajtMode)
    }
  }
}

function compareNodes(a, b) {
  if (!a.isEqualNode(b)) {
    if (a.id || b.id) {
      return a.id === b.id
    }
    return false
  }
  return true
}

function diff(from, to, compare) {
  const v = []
  v[1] = {
    xEnd: 0,
    yEnd: 0,
    prev: null
  }
  const n = from.length
  const m = to.length
  for (let d = 0; d <= n + m; d++) {
    for (let k = -d; k <= d; k += 2) {
      const down = k == -d || (k != d && v[k - 1].xEnd < v[k + 1].xEnd)
      const kPrev = down ? k + 1 : k - 1
      const prev = v[kPrev]
      const xStart = prev.xEnd
      const yStart = prev.yEnd
      const xMid = down ? xStart : xStart + 1
      const yMid = xMid - k
      let xEnd = xMid
      let yEnd = yMid
      let snake = 0
      while (xEnd < n && yEnd < m && compare(from[xEnd], to[yEnd])) {
        xEnd += 1
        yEnd += 1
        snake += 1
      }
      v[k] = {
        xStart, yStart,
        xMid, yMid,
        xEnd, yEnd,
        down,
        snake,
        prev
      }
      if (xEnd >= n && yEnd >= m) {
        const operations = []
        let o = v[k]
        while (o.prev) {
          if (o.snake > 0) {
            operations.push({
              name: 'keep',
              fromOld: o.xMid,
              fromNew: o.yMid,
              len: o.snake
            })
          }
          if (o.xMid !== o.xStart || o.yMid !== o.yStart) {
            const lastOperation = operations.length > 0 ? operations[operations.length - 1] : null
            if (o.down) {
              if (lastOperation && lastOperation.name === 'delete') {
                lastOperation.name = 'replace'
                lastOperation.from = o.yStart
              } else {
                operations.push({
                  name: 'insert',
                  at: o.xStart,
                  from: o.yStart
                })
              }
            } else {
              if (lastOperation && lastOperation.name === 'insert') {
                lastOperation.name = 'replace'
                lastOperation.at = o.xStart
              } else {
                operations.push({
                  name: 'delete',
                  at: o.xStart
                })
              }
            }
          }
          o = o.prev
        }
        operations.reverse()
        return operations
      }
    }
  }
}

function replaceAttributes (node, target) {
  const attributes = node.attributes
  for (let i = 0, len = attributes.length; i < len; i++) {
    const attr = attributes[i]
    target.setAttribute(attr.name, attr.value)
  }
  if (node.dataset.ajtRemoveAttr) {
    const removeAttributes = node.dataset.ajtRemoveAttr.split(' ');
    for (let i = 0, len = removeAttributes.length; i < len; i++) {
      target.removeAttribute(removeAttributes[i])
    }
  }
}

function merge (node, target, handleRemoveContent, handleAddContent) {
  replaceAttributes(node, target)
  const newNodes = Array.from(node.children)
  const oldNodes = Array.from(target.children)
  const operations = diff(oldNodes, newNodes, window.ajtCompare || compareNodes)
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i]
    if (op.name === 'insert') {
      const newNode = newNodes[op.from]
      const oldNode = oldNodes[op.at]
      target.insertBefore(newNode, oldNode)
      handleAddContent(newNode)
    } else if (op.name === 'delete') {
      const oldNode = oldNodes[op.at]
      handleRemoveContent(oldNode)
      target.removeChild(oldNode)
    } else if (op.name === 'replace') {
      const newNode = newNodes[op.from]
      const oldNode = oldNodes[op.at]
      handleRemoveContent(oldNode)
      target.replaceChild(newNode, oldNode)
      handleAddContent(newNode)
    } else if (op.name === 'keep') {
      const fromOld = op.fromOld
      const fromNew = op.fromNew
      for (let j = 0; j < op.len; j++) {
        const newNode = newNodes[fromNew + j]
        const oldNode = oldNodes[fromOld + j]
        if (!newNode.isEqualNode(oldNode)) {
          merge(newNode, oldNode, handleRemoveContent, handleAddContent)
        }
      }
    }
  }
}

window.ajtContentHandlers = Object.assign(window.ajtContentHandlers || {}, {
  replace (node, target, handleRemoveContent, handleAddContent) {
    handleRemoveContent(target)
    target.parentNode.replaceChild(node, target)
    handleAddContent(node)
  },
  replaceContent (node, target, handleRemoveContent, handleAddContent) {
    for (let child = target.lastChild; child; child = target.lastChild) {
      handleRemoveContent(child)
      target.removeChild(child)
    }
    const fragment = document.createDocumentFragment()
    while (node.firstChild) {
      fragment.appendChild(node.firstChild)
    }
    target.appendChild(fragment)
    for (let child = target.firstChild; child; child = child.nextSibling) {
      handleAddContent(child)
    }
  },
  prependContent: createInsertContentHandler((target, fragment) => {
    target.insertBefore(fragment, target.firstChild)
  }),
  appendContent: createInsertContentHandler((target, fragment) => {
    target.appendChild(fragment)
  }),
  remove (node, target, handleRemoveContent, handleAddContent) {
    handleRemoveContent(target)
    target.parentNode.removeChild(target)
  },
  update: merge
})

window.ajtElementAddedHandlers = window.ajtElementAddedHandlers || []
window.ajtElementAddedHandlers.push(function handleScriptNodes (element) {
  if (element instanceof HTMLScriptElement) {
    replaceScript(element)
  } else if (element instanceof Element) {
    const nodes = element.querySelectorAll('script')
    for (let i = 0, len = nodes.length; i < len; i++) {
      replaceScript(nodes[i])
    }
  }
})
window.ajtElementAddedHandlers.push(function handleAutofocus (element) {
  if (element instanceof Element) {
    const node = element.matches('*[autofocus]')
      ? element
      : element.querySelector('*[autofocus]')
    if (node) {
      node.focus()
    }
  }
})

window.ajtElementRemovedHandlers = window.ajtElementRemovedHandlers || []
