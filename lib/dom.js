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
      : `#${node.id}`
    document.querySelectorAll(targetSelector).forEach((target) => {
      handler(target, node.cloneNode(true), handleRemoveContent, handleAddContent)
    })
  }
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
  replace: createHandlerWithTarget((target, node, handleRemoveContent, handleAddContent) => {
    handleRemoveContent(target)
    target.parentNode.replaceChild(node, target)
    handleAddContent(node)
  }),
  script (node) {
    if (node instanceof HTMLScriptElement) {
      Function(node.innerText)() // eslint-disable-line no-new-func
    }
  }
}
export const elementAddedHandlers = [
  function (element) {
    if (element instanceof HTMLScriptElement) {
      replaceScript(element)
    } else if (element instanceof Element) {
      const nodes = element.querySelectorAll('script')
      for (let i = 0, len = nodes.length; i < len; i++) {
        replaceScript(nodes[i])
      }
    }
  }
]
export const elementRemovedHandlers = []
