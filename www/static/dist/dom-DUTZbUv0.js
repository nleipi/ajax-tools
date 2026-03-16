const startViewTransition = document.startViewTransition 
  ? document.startViewTransition.bind(document)
  : (cb => ({
    updateCallbackDone: new Promise((resolve, reject) => {
      try {
        cb();
        resolve();
      } catch (err) {
        reject(err);
      }
    })
  }));

function handleRemoveContent (element) {
  for (let i = 0, len = window.ajtElementRemovedHandlers.length; i < len; i++) {
    try {
      window.ajtElementRemovedHandlers[i](element);
    } catch (e) {
      console.warn(e);
    }
  }
}

function disableScript (script) {
  script.ajtScriptType = script.type;
  script.type = 'application/x-ajt-script';
}

function replaceScript (original) {
  const copy = document.createElement('script');
  const attributes = original.attributes;
  for (let i = 0, len = attributes.length; i < len; i++) {
    const attr = attributes[i];
    copy.setAttribute(attr.name, attr.value);
  }
  if (typeof original.ajtScriptType === 'string') {
    copy.type = original.ajtScriptType;
  }
  copy.textContent = original.textContent;
  original.parentNode.replaceChild(copy, original);
}

function handleAddContent (element) {
  for (let i = 0, len = window.ajtElementAddedHandlers.length; i < len; i++) {
    try {
      window.ajtElementAddedHandlers[i](element);
    } catch (e) {
      console.warn(e);
    }
  }
}

function handlePreAddContent (element) {
  for (let i = 0, len = window.ajtElementPreAddHandlers.length; i < len; i++) {
    try {
      window.ajtElementPreAddHandlers[i](element);
    } catch (e) {
      console.warn(e);
    }
  }
}

function createInsertContentHandler (strategy) {
  return (node, target, handleRemoveContent, handleAddContent, handlePreAddContent) => {
    const fragment = document.createDocumentFragment();
    const nodes = [];
    while (node.firstChild) {
      nodes.push(fragment.appendChild(node.firstChild));
    }
    for (let i = 0, len = nodes.length; i < len; i++) {
      handlePreAddContent(nodes[i]);
    }
    return () => {
      strategy(target, fragment);
      for (let i = 0, len = nodes.length; i < len; i++) {
        handleAddContent(nodes[i]);
      }
    }
  }
}

async function processContent (doc) {
  let element;
  const handlerCallbacks = [];
  const addedElements = [];
  while ((element = doc.querySelector('[data-ajt-mode]'))) {
    element = document.adoptNode(element);
    const handler = window.ajtContentHandlers[element.dataset.ajtMode];
    if (handler) {
      let targets;
      if (element.dataset.ajtTarget) {
        targets = document.querySelectorAll(element.dataset.ajtTarget);
      } else if (element.id) {
        const target = document.getElementById(element.id);
        if (target) {
          targets = [target];
        }
      } else {
        console.warn(`No data-ajt-target or id is defined for element ${element}`);
      }
      if (targets) {
        targets.forEach((target) => {
          try {
            handlerCallbacks.push(handler(
              element.cloneNode(true),
              target,
              handleRemoveContent,
              (el) => {
                addedElements.push(el);
              },
              handlePreAddContent
            ));
          } catch (e) {
            console.error(e);
          }
        });
      }
    } else {
      console.warn('Unknown ajt mode: ' + element.dataset.ajtMode);
    }
  }
  if (handlerCallbacks.length > 0) {
    const transision = startViewTransition(() => {
      for (let callback of handlerCallbacks) {
        callback();
      }
    });
    await transision.ready;
    for (let element of addedElements) {
      handleAddContent(element);
    }
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

function diff (from, to, compare) {
  const v = [];
  v[1] = {
    xEnd: 0,
    yEnd: 0,
    prev: null
  };
  const n = from.length;
  const m = to.length;
  for (let d = 0; d <= n + m; d++) {
    for (let k = -d; k <= d; k += 2) {
      const down = k === -d || (k !== d && v[k - 1].xEnd < v[k + 1].xEnd);
      const kPrev = down ? k + 1 : k - 1;
      const prev = v[kPrev];
      const xStart = prev.xEnd;
      const yStart = prev.yEnd;
      const xMid = down ? xStart : xStart + 1;
      const yMid = xMid - k;
      let xEnd = xMid;
      let yEnd = yMid;
      let snake = 0;
      while (xEnd < n && yEnd < m && compare(from[xEnd], to[yEnd])) {
        xEnd += 1;
        yEnd += 1;
        snake += 1;
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
      };
      if (xEnd >= n && yEnd >= m) {
        const operations = [];
        let o = v[k];
        while (o.prev) {
          if (o.snake > 0) {
            operations.push({
              name: 'keep',
              fromOld: o.xMid,
              fromNew: o.yMid,
              len: o.snake
            });
          }
          if (o.xMid !== o.xStart || o.yMid !== o.yStart) {
            const lastOperation = operations.length > 0 ? operations[operations.length - 1] : null;
            if (o.down) {
              if (lastOperation && lastOperation.name === 'delete') {
                lastOperation.name = 'replace';
                lastOperation.from = o.yStart;
              } else {
                operations.push({
                  name: 'insert',
                  at: o.xStart,
                  from: o.yStart
                });
              }
            } else {
              if (lastOperation && lastOperation.name === 'insert') {
                lastOperation.name = 'replace';
                lastOperation.at = o.xStart;
              } else {
                operations.push({
                  name: 'delete',
                  at: o.xStart
                });
              }
            }
          }
          o = o.prev;
        }
        operations.reverse();
        return operations
      }
    }
  }
}

function replaceAttributes (node, target) {
  if (node.dataset.ajtRemoveAttr) {
    const removeAttributes = node.dataset.ajtRemoveAttr.split(' ');
    for (let i = 0, len = removeAttributes.length; i < len; i++) {
      const attr = removeAttributes[i];
      target.removeAttribute(attr);
    }
  }
  const attributes = node.attributes;
  for (let i = 0, len = attributes.length; i < len; i++) {
    const attr = attributes[i];
    target.setAttribute(attr.name, attr.value);
  }
}

function merge (node, target, handleRemoveContent, handleAddContent, handlePreAddContent) {
  const callbacks = [];
  callbacks.push(() => {
    replaceAttributes(node, target);
  });
  const newNodes = Array.from(node.children);
  const oldNodes = Array.from(target.children);
  const operations = diff(oldNodes, newNodes, window.ajtCompare || compareNodes);
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    if (op.name === 'insert') {
      const newNode = newNodes[op.from];
      const oldNode = oldNodes[op.at];
      handlePreAddContent(newNode);
      callbacks.push(() => {
        target.insertBefore(newNode, oldNode);
        handleAddContent(newNode);
      });
    } else if (op.name === 'delete') {
      const oldNode = oldNodes[op.at];
      handleRemoveContent(oldNode);
      callbacks.push(() => {
        target.removeChild(oldNode);
      });
    } else if (op.name === 'replace') {
      const newNode = newNodes[op.from];
      const oldNode = oldNodes[op.at];
      handleRemoveContent(oldNode);
      handlePreAddContent(newNode);
      callbacks.push(() => {
        target.replaceChild(newNode, oldNode);
        handleAddContent(newNode);
      });
    } else if (op.name === 'keep') {
      const fromOld = op.fromOld;
      const fromNew = op.fromNew;
      for (let j = 0; j < op.len; j++) {
        const newNode = newNodes[fromNew + j];
        const oldNode = oldNodes[fromOld + j];
        if (!newNode.isEqualNode(oldNode)) {
          callbacks.push(merge(
            newNode,
            oldNode,
            handleRemoveContent,
            handleAddContent,
            handlePreAddContent
          ));
        }
      }
    }
  }
  return () => {
    for (let callback of callbacks) {
      try {
        callback();
      } catch (e) {
        console.error(e);
      }
    }
  }
}

window.ajtContentHandlers = Object.assign({
  replace (node, target, handleRemoveContent, handleAddContent, handlePreAddContent) {
    handleRemoveContent(target);
    handlePreAddContent(node);
    return () => {
      target.parentNode.replaceChild(node, target);
      handleAddContent(node);
    }
  },
  replaceContent (node, target, handleRemoveContent, handleAddContent) {
    for (let child = target.firstChild; child; child = child.nextSibling) {
      handleRemoveContent(child);
    }
    const fragment = document.createDocumentFragment();
    while (node.firstChild) {
      handlePreAddContent(node.firstChild);
      fragment.appendChild(node.firstChild);
    }
    return () => {
      target.replaceChildren(fragment);
      for (let child = target.firstChild; child; child = child.nextSibling) {
        try {
          handleAddContent(child);
        } catch (e) {
          console.error(e);
        }
      }
    }
  },
  replaceWithContent (node, target, handleRemoveContent, handleAddContent) {
    handleRemoveContent(target);
    const fragment = document.createDocumentFragment();
    while (node.firstChild) {
      handlePreAddContent(node.firstChild);
      fragment.appendChild(node.firstChild);
    }
    return () => {
      target.replaceWith(fragment);
      for (let child = target.firstChild; child; child = child.nextSibling) {
        try {
          handleAddContent(child);
        } catch (e) {
          console.error(e);
        }
      }
    }
  },
  prependContent: createInsertContentHandler((target, fragment) => {
    target.insertBefore(fragment, target.firstChild);
  }),
  appendContent: createInsertContentHandler((target, fragment) => {
    target.appendChild(fragment);
  }),
  remove (node, target, handleRemoveContent) {
    handleRemoveContent(target);
    return () => {
      target.parentNode.removeChild(target);
    }
  },
  update: merge
}, window.ajtContentHandlers);

window.ajtElementAddedHandlers = window.ajtElementAddedHandlers || [];
window.ajtElementAddedHandlers.push(function handleScriptNodes (element) {
  if (element instanceof HTMLScriptElement) {
    replaceScript(element);
  } else if (element instanceof Element) {
    const nodes = element.querySelectorAll('script');
    for (let i = 0, len = nodes.length; i < len; i++) {
      replaceScript(nodes[i]);
    }
  }
});
window.ajtElementAddedHandlers.push(function handleAutofocus (element) {
  if (element instanceof Element) {
    const node = element.matches('*[autofocus]')
      ? element
      : element.querySelector('*[autofocus]');
    if (node) {
      node.focus();
    }
  }
});

window.ajtElementRemovedHandlers = window.ajtElementRemovedHandlers || [];

window.ajtElementPreAddHandlers = window.ajtElementPreAddHandlers || [];
window.ajtElementPreAddHandlers.push(function disableScriptNodes (element) {
  if (element instanceof HTMLScriptElement) {
    disableScript(element);
  } else if (element instanceof Element) {
    const nodes = element.querySelectorAll('script');
    for (let i = 0, len = nodes.length; i < len; i++) {
      disableScript(nodes[i]);
    }
  }
});

export { processContent as default };
