function handleRemoveContent (element) {
  for (let i = 0, len = elementRemovedHandlers.length; i < len; i++) {
    try {
      elementRemovedHandlers[i](element)
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
  for (let i = 0, len = elementAddedHandlers.length; i < len; i++) {
    try {
      elementAddedHandlers[i](element)
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
  return createHandlerWithTarget((node, target, handleRemoveContent, handleAddContent) => {
    const fragment = document.createDocumentFragment()
    const nodes = []
    while (node.firstChild) {
      nodes.push(fragment.appendChild(node.firstChild))
    }
    strategy(target, fragment)
    for (let i = 0, len = nodes.length; i < len; i++) {
      handleAddContent(nodes[i])
    }
  })
}

export default function processContent (doc) {
  let node
  while ((node = doc.querySelector('[data-ajt-mode]'))) {
    node = document.adoptNode(node)
    const handler = contentHandlers[node.dataset.ajtMode]
    if (handler) {
      try {
        handler(node, handleRemoveContent, handleAddContent)
      } catch (e) {
        console.error(e)
      }
    } else {
      console.warn('Unknown ajt mode: ' + node.dataset.ajtMode)
    }
  }
}

export const contentHandlers = {
  replace: createHandlerWithTarget((node, target, handleRemoveContent, handleAddContent) => {
    handleRemoveContent(target)
    target.parentNode.replaceChild(node, target)
    handleAddContent(node)
  }),
  replaceContent: createHandlerWithTarget((node, target, handleRemoveContent, handleAddContent) => {
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
  }),
  prependContent: createInsertContentHandler((target, fragment) => {
    target.insertBefore(fragment, target.firstChild)
  }),
  appendContent: createInsertContentHandler((target, fragment) => {
    target.appendChild(fragment)
  }),
  remove: createHandlerWithTarget((node, target, handleRemoveContent, handleAddContent) => {
    handleRemoveContent(target)
    target.parentNode.removeChild(target)
  }),
  script (node) {
    if (node instanceof HTMLScriptElement) {
      Function(node.innerText)() // eslint-disable-line no-new-func
    }
  }
}
export const elementAddedHandlers = [
  function handleScriptNodes (element) {
    if (element instanceof HTMLScriptElement) {
      replaceScript(element)
    } else if (element instanceof Element) {
      const nodes = element.querySelectorAll('script')
      for (let i = 0, len = nodes.length; i < len; i++) {
        replaceScript(nodes[i])
      }
    }
  },
  function handleAutofocus (element) {
    if (element instanceof Element) {
      const node = element.matches('*[autofocus]')
        ? element
        : element.querySelector('*[autofocus]')
      if (node) {
        node.focus()
      }
    }
  }
]
export const elementRemovedHandlers = []
