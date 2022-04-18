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

function createHandlerWithTarget (handler) {
  return function (node, handleRemoveContent, handleAddContent) {
    const dataset = node.dataset
    const targetSelector = dataset.ajtTarget
      ? dataset.ajtTarget
      : node.id
        ? `#${node.id}`
        : null

    if (targetSelector) {
      document.querySelectorAll(targetSelector).forEach((target) => {
        handler(node.cloneNode(true), target, handleRemoveContent, handleAddContent)
      })
    } else {
      console.warn(`No data-ajt-target or id is defined for node ${node}`)
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
      const dataset = node.dataset
      const targetSelector = dataset.ajtTarget
        ? dataset.ajtTarget
        : node.id
          ? `#${node.id}`
          : null

      if (targetSelector) {
        document.querySelectorAll(targetSelector).forEach((target) => {
          try {
            handler(node.cloneNode(true), target, handleRemoveContent, handleAddContent)
          } catch (e) {
            console.error(e)
          }
        })
      } else {
        console.warn(`No data-ajt-target or id is defined for node ${node}`)
      }
    } else {
      console.warn('Unknown ajt mode: ' + node.dataset.ajtMode)
    }
  }
}

function isMergeable (node, target) {
  if (node.nodeType != target.nodeType) {
    return false
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.tagName !== target.tagName) {
      return false
    }
    if (node.id || target.id) {
      return node.id === target.id
    }
  }
  return true
}

function merge (node, target, handleRemoveContent, handleAddContent) {
  console.log('start merge')
  if (node.nodeType === Node.TEXT_NODE) {
    target.textContent = node.textContent
    console.log('copy textContent')
    return
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const oldAttributes = target.getAttributeNames()
    for (let i = 0, len = oldAttributes.length; i < len; i++) {
      const name = oldAttributes[i]
      if (!node.hasAttribute(name)) {
        target.removeAttribute(name)
      }
    }
    const newAttributes = target.getAttributeNames()
    for (let i = 0, len = newAttributes.length; i < len; i++) {
      const name = newAttributes[i]
      target.setAttribute(name, node.getAttribute(name))
    }
  }

  const oldNodes = Array.from(target.childNodes)
  const newNodes = Array.from(node.childNodes)
  let j = 0
  for (let i = 0; i < newNodes.length; i++) {
    const newNode = newNodes[i]
    console.log('new', newNode.outerHTML || newNode.textContent)
    if (j < oldNodes.length) {
      const oldNode = oldNodes[j]
      console.log('old', oldNode.outerHTML || oldNode.textContent)
      if (newNode.isEqualNode(oldNode)) {
        console.log('next same')
        j += 1
        continue
      }
      if (isMergeable(newNode, oldNode)) {
        console.log('next mergeable')
        merge(newNode, oldNode, handleRemoveContent, handleAddContent)
        j += 1
        continue
      }
      if (j < oldNodes.length - 1) {
        const nextOldNode = oldNodes[j + 1]
        if (newNode.isEqualNode(nextOldNode)) {
          console.log('next next same')
          handleRemoveContent(oldNode)
          oldNode.parentNode.removeChild(oldNode)
          j += 2
        } else if (isMergeable(newNode, nextOldNode)) {
          console.log('next next mergeable')
          handleRemoveContent(oldNode)
          oldNode.parentNode.removeChild(oldNode)
          merge(newNode, nextOldNode, handleRemoveContent, handleAddContent)
          j += 2
        } else {
          console.log('insert')
          oldNode.parentNode.insertBefore(newNode, oldNode)
          handleAddContent(newNode)
        }
        continue
      }
    }
    console.log('append')
    target.appendChild(newNode)
    handleAddContent(newNode)
  }
  for (; j < oldNodes.length; j++) {
    const oldNode = oldNodes[j]
    handleRemoveContent(oldNode)
    oldNode.parentNode.removeChild(oldNode)
  }
  console.log('end merge')
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
  update (node, target, handleRemoveContent, handleAddContent) {
    if (node.isEqualNode(target)) {
      return
    }
    if (isMergeable(node, target)) {
      node.normalize()
      target.normalize()
      merge(node, target, handleRemoveContent, handleAddContent)
      return
    }
    handleRemoveContent(target)
    target.parentNode.replaceChild(node, target)
    handleAddContent(node)
  }
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
