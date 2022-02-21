export const contentHandlers = []
export const elementAddedHandlers = []
export const elementRemovedHandlers = []

function handleRemoveContent (element) {
  for (let i = 0, len = elementRemovedHandlers.length; i < len; i++) {
    try {
      elementRemovedHandlers[i](element)
    } catch (e) {
      console.warn(e)
    }
  }
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

export function processContent (doc) {
  let node
  while ((node = doc.querySelector('[data-ajt-target]'))) {
    const handler = contentHandlers[node.dataset.ajtTarget]
    if (handler) {
      try {
        handler(document.adoptNode(node), handleRemoveContent, handleAddContent)
      } catch (e) {
        console.error(e)
      }
    } else {
      console.warn('Unknown ajt target: ' + node.dataset.ajtTarget)
    }
  }
}
