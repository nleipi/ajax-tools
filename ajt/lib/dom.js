
function createInsertContentHandler (strategy) {
  return (node, target, handleRemoveContent, handleAddContent) => {
    const fragment = document.createDocumentFragment()
    const nodes = []
    while (node.firstChild) {
      nodes.push(fragment.appendChild(node.firstChild))
    }
    for (let i = 0, len = nodes.length; i < len; i++) {
      handleAddContent(nodes[i])
    }
    return () => {
      strategy(target, fragment)
    }
  }
}

function createForEachTargetHandler (strategy) {
  return (element, handleRemoveContent, handleAddContent) => {
    const targets = window.ajtGetTargets(element)
    if (targets.length === 0) {
      console.warn(`No data-ajt-target or id is defined for element ${element}`)
    }
    const clone = targets.length > 1
    return targets.map((target) => {
      return strategy(
        clone ? element.cloneNode(true) : element,
        target,
        handleRemoveContent,
        handleAddContent,
      )
    })
  }
}

class Batch extends EventTarget {
  #process
  #id
  #elements
  #transitionPromises = []
  
  constructor(process, id, elements) {
    super()
    this.#process = process
    this.#id = id
    this.#elements = elements
  }

  get process() {
    return this.#process
  }

  get id() {
    return this.#id
  }

  addTransitionPromise(promise) {
    this.#transitionPromises.push(promise)
  }

  async run(nodesHandler) {
    const handlerCallbacks = []
    const viewTransitionTypes = new Set()
    for (let element of this.#elements) {
      const handler = window.ajtContentHandlers[element.dataset.ajtMode]
      if (handler) {
        try {
          element = nodesHandler(element)
          element.dataset.ajtViewTransitionTypes?.split(/ +/)
            .forEach(type => {
              viewTransitionTypes.add(type)
            })
          const result = handler(
            element,
            (el) => {
              this.dispatchEvent(new CustomEvent('removeElement', {
                detail: el
              }))
            },
            (el) => {
              this.dispatchEvent(new CustomEvent('addElement', {
                detail: el,
                bubbles: true
              }))
            },
          )
          if (typeof result === 'function') {
            handlerCallbacks.push(result)
          } else {
            handlerCallbacks.push(...result)
          }
        } catch (e) {
          console.error(e)
        }
      } else {
        console.warn('Unknown ajt mode: ' + element.dataset.ajtMode)
      }
    }
    if (handlerCallbacks.length > 0) {
      const update = () => {
        this.dispatchEvent(new Event('beforeApplyDomChanges'))
        for (let callback of handlerCallbacks) {
          try {
            callback()
          } catch (e) {
            console.error(e)
          }
        }
        this.dispatchEvent(new Event('afterApplyDomChanges'))
        if (this.#transitionPromises.length > 0) {
          return Promise.all(this.#transitionPromises)
        }
      }
      this.dispatchEvent(new Event('beforeUpdate'))
      if (!document.startViewTransition) {
        await update()
      } else {
        const transition = viewTransitionTypes.size > 0
          ? document.startViewTransition({ update, types: Array.from(viewTransitionTypes) })
          : document.startViewTransition(update)
        this.dispatchEvent(new CustomEvent('transition', {
          detail: transition
        }))
        await transition.finished
      }
      this.dispatchEvent(new Event('afterUpdate'))
    }
  }
}

export class DomProcess extends EventTarget {
  #html
  #scriptNonces
  #scriptNonceReplacement
  #styleNonces
  #handleDom
  #finished
  #resolveFinished
  #rejectFinished
  #beforePromises = []

  static parser = new DOMParser()

  constructor(html, options) {
    super()
    this.#html = html
    this.#scriptNonces = options.scriptNonces
    this.#scriptNonceReplacement = options.scriptNonceReplacement
    this.#styleNonces = options.styleNonces
    this.#handleDom = options.handleDom
    this.data = options.data
    this.#finished = new Promise((resolve, reject) => {
      this.#resolveFinished = resolve
      this.#rejectFinished = reject
    })
  }

  get finished() {
    return this.#finished
  }

  #copyScript (original) {
    const copy = document.createElement('script')
    const attributes = original.attributes
    for (let i = 0, len = attributes.length; i < len; i++) {
      const attr = attributes[i]
      copy.setAttribute(attr.name, attr.value)
    }

    if (original.type === 'application/x-ajt-script') {
      copy.type = original.dataset.ajtScriptType || ''
    }
    if (!window.ajtAllowUnsafeScripts) {
      const valid = this.#scriptNonces?.find((nonce) => original.nonce === nonce)
      if (!valid) {
        return original
      }
      copy.nonce = this.#scriptNonceReplacement
    }
    copy.textContent = original.textContent
    return copy
  }

  #handleScriptNodes (element) {
    if (element instanceof HTMLScriptElement) {
      return this.#copyScript(element)
    }
    const nodes = element.querySelectorAll('script')
    for (let original of nodes) {
      const copy = this.#copyScript(original)
      original.replaceWith(copy)
    }
    return element
  }

  addBeforePromise(promise) {
    this.#beforePromises.push(promise)
  }

  async run() {
    const doc = this.#html
    this.#handleDom?.(doc)

    let element
    while ((element = doc.querySelector('script[data-ajt-script=before-dom]'))) {
      element = document.adoptNode(element)
      element = this.#handleScriptNodes(element)
      document.body.append(element)
    }
    if (this.#beforePromises.length > 0) {
      await Promise.all(this.#beforePromises)
    }
    const elements = []
    while ((element = doc.querySelector('[data-ajt-mode]'))) {
      elements.push(document.adoptNode(element))
    }
    const batches = elements.reduce((batches, element) => {
      let batchOrder;
      if (typeof element.dataset.ajtBatch === 'string') {
        batchOrder = parseInt(element.dataset.ajtBatch)
        if (Number.isNaN(batchOrder)) {
          console.warn(`data-ajt-batch="${element.dataset.ajtBatch}" is not a valid number`)
        }
      }
      if (!batchOrder) {
        batchOrder = 0
      }
      let batch = batches.get(batchOrder)
      if (!batch) {
        batch = []
        batches.set(batchOrder, batch)
      }
      batch.push(element)
      return batches
    }, new Map())
    const sortedBatches = Array.from(batches.keys())
      .sort()
      .map(key => new Batch(this, key, batches.get(key)))
    for (const batch of sortedBatches) {
      this.dispatchEvent(new CustomEvent('batch', { detail: batch }))
      await batch.run((...args) => this.#handleScriptNodes(...args))
    }
    while ((element = doc.querySelector('script[data-ajt-script=after-dom]'))) {
      element = document.adoptNode(element)
      element = this.#handleScriptNodes(element)
      document.body.append(element)
    }
    this.#resolveFinished()
  }
}

function compareNodes (a, b) {
  if (!a.isEqualNode(b)) {
    if (a.dataset.ajtCompare || b.dataset.ajtCompare) {
      return a.dataset.ajtCompare === b.dataset.ajtCompare
    }
    if (a.id || b.id) {
      return a.id === b.id
    }
    return false
  }
  return true
}

export function diff (from, to, compare) {
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
      const down = k === -d || (k !== d && v[k - 1].xEnd < v[k + 1].xEnd)
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
        xStart,
        yStart,
        xMid,
        yMid,
        xEnd,
        yEnd,
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
  if (node.dataset.ajtRemoveAttr) {
    const removeAttributes = node.dataset.ajtRemoveAttr.split(/\W+/);
    for (let i = 0, len = removeAttributes.length; i < len; i++) {
      const attr = removeAttributes[i]
      target.removeAttribute(attr)
    }
  }
  const attributes = node.attributes
  for (let i = 0, len = attributes.length; i < len; i++) {
    const attr = attributes[i]
    target.setAttribute(attr.name, attr.value)
  }
}

function merge (node, target, handleRemoveContent, handleAddContent) {
  const callbacks = []
  callbacks.push(() => {
    replaceAttributes(node, target)
  })
  const newNodes = Array.from(node.children)
  const oldNodes = Array.from(target.children)
  const operations = diff(oldNodes, newNodes, window.ajtCompare || compareNodes)
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i]
    if (op.name === 'insert') {
      const newNode = newNodes[op.from]
      const oldNode = oldNodes[op.at]
      handleAddContent(newNode)
      callbacks.push(() => {
        target.insertBefore(newNode, oldNode)
      })
    } else if (op.name === 'delete') {
      const oldNode = oldNodes[op.at]
      handleRemoveContent(oldNode)
      callbacks.push(() => {
        target.removeChild(oldNode)
      })
    } else if (op.name === 'replace') {
      const newNode = newNodes[op.from]
      const oldNode = oldNodes[op.at]
      handleRemoveContent(oldNode)
      handleAddContent(newNode)
      callbacks.push(() => {
        target.replaceChild(newNode, oldNode)
      })
    } else if (op.name === 'keep') {
      const fromOld = op.fromOld
      const fromNew = op.fromNew
      for (let j = 0; j < op.len; j++) {
        const newNode = newNodes[fromNew + j]
        const oldNode = oldNodes[fromOld + j]
        if (!newNode.isEqualNode(oldNode)) {
          callbacks.push(merge(
            newNode,
            oldNode,
            handleRemoveContent,
            handleAddContent,
          ))
        }
      }
    }
  }
  return () => {
    for (let callback of callbacks) {
      try {
        callback()
      } catch (e) {
        console.error(e)
      }
    }
  }
}

window.ajtContentHandlers = Object.assign({
  replace: createForEachTargetHandler((node, target, handleRemoveContent, handleAddContent) => {
    handleRemoveContent(target)
    handleAddContent(node)
    return () => {
      target.parentNode.replaceChild(node, target)
    }
  }),
  replaceContent: createForEachTargetHandler((node, target, handleRemoveContent, handleAddContent) => {
    for (let child = target.firstChild; child; child = child.nextSibling) {
      handleRemoveContent(child)
    }
    const fragment = document.createDocumentFragment()
    while (node.firstChild) {
      handleAddContent(node.firstChild)
      fragment.appendChild(node.firstChild)
    }
    return () => {
      target.replaceChildren(fragment)
    }
  }),
  replaceWithContent: createForEachTargetHandler((node, target, handleRemoveContent, handleAddContent) => {
    handleRemoveContent(target)
    const fragment = document.createDocumentFragment()
    const nodes = []
    while (node.firstChild) {
      handleAddContent(node.firstChild)
      nodes.push(fragment.appendChild(node.firstChild))
    }
    for (let node of nodes) {
      handleAddContent(node)
    }
    return () => {
      target.replaceWith(fragment)
    }
  }),
  prependContent: createForEachTargetHandler(createInsertContentHandler((target, fragment) => {
    target.insertBefore(fragment, target.firstChild)
  })),
  appendContent: createForEachTargetHandler(createInsertContentHandler((target, fragment) => {
    target.appendChild(fragment)
  })),
  remove: createForEachTargetHandler((node, target, handleRemoveContent) => {
    handleRemoveContent(target)
    return () => {
      target.parentNode.removeChild(target)
    }
  }),
  update: createForEachTargetHandler(merge)
}, window.ajtContentHandlers)


window.ajtGetTargets = window.ajtGetTargets || function getTargets (element) {
  if (element.dataset.ajtTarget) {
    return Array.from(document.querySelectorAll(element.dataset.ajtTarget))
  } else if (element.id) {
    const target = document.getElementById(element.id)
    if (target) {
      return [target]
    }
  }
  return []
}

window.ajtElementAddedHandlers = window.ajtElementAddedHandlers || []
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
window.ajtElementPreAddHandlers = window.ajtElementPreAddHandlers || []
