let polyfillFormData = true
try {
  new FormData(document.createElement('form'), {})
} catch (e) {
  if (e instanceof TypeError) {
    polyfillFormData = false
  }
}

if (polyfillFormData) {
  class FormDataPolyfill extends window.FormData {
    constructor(form, submitter) {
      super(form)
      if (form && submitter) {
        const isSubmitButton = submitter instanceof HTMLInputElement
          ? (submitter.type === 'submit' || submitter.type === 'image')
          : submitter instanceof HTMLButtonElement
            ? submitter.type === 'submit'
            : false
        if (!isSubmitButton) {
          throw new TypeError('FormData constructor: Argument 2 does not implement interface HTMLElement.')
        }
        if (submitter.form !== form) {
          throw new DOMException('FormData constructor: The submitter is not owned by this form.', 'NotFoundError')
        }
        if (submitter.type && submitter.type.toLowerCase() === 'image' && !this.has(`${submitter.name}.x`)) {
          this.append(`${submitter.name}.x`, 0)
          this.append(`${submitter.name}.y`, 0)
        } else if (this.getAll(submitter.name).every(val => val !== submitter.value)) { // avoid adding the value twice in older safari
          this.append(submitter.name, submitter.value)
        }
      }
    }
  }
  window.FormData = FormDataPolyfill
}

function getContextElement(el) {
  let context = el
  if (el.dataset.ajtContextClosest) {
    context = el.closest(el.dataset.ajtContextClosest) || context
  }
  if (el.dataset.ajtContextSelector) {
    context = document.querySelector(el.dataset.ajtContextSelector) || context
  }
  return context
}

export function createListener(createBuilder) {
  return async function(event) {
    const builder = createBuilder(event)
    const targets = builder.getTargets()
    const handleEvent = targets.some(el =>
      el.dataset.viaAjt === '' || el.dataset.viaAjt === 'true'
    )
    if (!handleEvent) {
       return
     }
    if (typeof window.ajtProcessEvent === 'function') {
      if (!window.ajtProcessEvent(event)) {
        return
      }
    }
    event.preventDefault()

    const cancelRunning = targets.some(el => typeof el.dataset.ajtCancelRunning !== 'undefined')

    const context = getContextElement(builder.getContextElement())
    if (context.ajtProcess) {
      if (!cancelRunning) {
        return
      }
      context.ajtProcess.cancel()
      await context.finished
    }

    const [url, options] = builder.getFetchData()


    const ajtProcess = window.ajt(url, Object.assign(options || {}, {
      delay: parseInt(targets.find(el => typeof el.dataset.ajtDelay !== 'undefined')?.dataset.ajtDelay || 0),
      data: {
        origin: event
      },
    }))
    ajtProcess.finished.finally(() => {
      delete context.dataset.ajtStatus
      delete context.ajtProcess
    })

    context.dataset.ajtStatus = 'loading'
    context.ajtProcess = ajtProcess
  }
}

if (!window.ajtNoTriggers) {
  document.addEventListener('click', createListener(event => {
    const target = event.target.closest('a[data-href]') || event.target.closest('a[href]')
    return {
      getTargets() {
        if (target) {
          return [target]
        }
        return []
      },
      getContextElement() {
        return target
      },
      getFetchData() {
        const url = target.dataset.href
          ? target.dataset.href
          : target.href
        return [url]
      }
    }
  }))
  document.addEventListener('submit', createListener(event => {
    const submitter = event.submitter
    const form = event.target
    return {
      getTargets() {
        if (submitter) {
          return [submitter, form]
        }
        return [form]
      },
      getContextElement() {
        return form
      },
      getFetchData() {
        const method = submitter?.dataset.ajtFormmethod
          || (submitter?.hasAttribute('formmethod')
          ? submitter.formMethod
          : form.method)
        const action = submitter?.dataset.ajtFormaction
          || (submitter?.hasAttribute('formaction')
          ? submitter.formAction
          : form.action)
        const enctype = submitter.dataset.ajtFormenctype
          || (submitter?.hasAttribute('formenctype')
          ? submitter.formEnctype
          : form.enctype)
        const params = new URLSearchParams(new FormData(form, submitter))

        const url = new URL(action)
        const options = { method }
        if (method.toLowerCase() === 'get') {
          url.search = params.toString()
        } else {
          options.body = params
          options.headers = {
            'Content-Type': enctype
          }
        }
        return [url.href, options]
      }
    }
  }))
}
    
window.ajt = ajt

const parser = new DOMParser()

function fetch (resource, options = {}) {
  options.headers = Object.assign({
    'x-requested-with': 'ajt'
  }, options.headers)
  return window.fetch(resource, options)
}

function getNonces(res) {
  const map = res.headers.get('content-security-policy')?.split(';')
    .map(s => s.trim())
    .reduce((accumulator, str) => {
      const [, directiveName, directiveValue] = str.match(/([a-z-]*)\s*(.*)/);
      accumulator[directiveName] = directiveValue.split(' ').map(val => val.trim());
      return accumulator
    }, {})
  return {
    scriptNonces: getNonceValues(map?.['script-src']),
    styleNonces: getNonceValues(map?.['style-src']),
  }
}

function getNonceValues(values) {
  return values?.map(value => value.match(/'nonce-([^']+)'/)?.[1])
    .filter(value => value)
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

class AjtProcess {
  #finished
  #resolveFinished
  #rejectFinished
  #canceled = false

  constructor(resource, options) {
    this.#finished = new Promise((resolve, reject) => {
      this.#resolveFinished = resolve
      this.#rejectFinished = reject
    })
    this.#process(resource, options)
      .then(this.#resolveFinished)
      .catch(this.#rejectFinished)
  }

  cancel() {
    this.#resolveFinished(false)
    this.#canceled = true
  }

  get finished() {
    return this.#finished
  }
  
  async #process(resource, options) {
    if (options?.delay) {
      await wait(options.delay)
    }
    if (this.#canceled) {
      return false
    }
    const loadDomModule = import('./dom.js')
    const res = await fetch(resource, options)
    if (this.#canceled) {
      return false
    }
    const nonces = getNonces(res)
    const doc = await res.text()
      .then(async (htmlString) => {
        if (window.ajtResponseHandlers) {
          for (let handler of window.ajtResponseHandlers) {
            htmlString = await handler(htmlString)
          }
        }
        return htmlString
      })
      .then(htmlString => parser.parseFromString(htmlString, 'text/html'))
    const domModule = await loadDomModule
    if (this.#canceled) {
      return false
    }
    const domProcess = new domModule.DomProcess(doc, Object.assign({
      data: options?.data,
      handleDom: window.ajtHandleDom,
      scriptNonceReplacement: window.ajtNonce,
    }, nonces))
    window.currentDomProcess = domProcess
    document.dispatchEvent(new CustomEvent('ajtDomProcess', {
      detail: domProcess
    }))

    domProcess.run()
    await domProcess.finished.then(() => {
      document.querySelectorAll('[data-ajt-apply-trigger]').forEach(el => {
        el.dataset.viaAjt = el.dataset.ajtApplyTrigger
      })
    })
    window.currentDomProcess = null
    return true
  }
}

export default function ajt(resource, options) {
  return new AjtProcess(resource, options)
}
window.ajt = ajt
