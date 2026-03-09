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

if (!window.ajtNoTriggers) {
  const wsregex = /\W+/
  const registeredEvents = new Set()
  function initListeners() {
    document.querySelectorAll('[data-ajt-trigger]').forEach(el => {
      el.dataset.ajtTrigger.split(wsregex).filter(s => s).forEach(eventName => {
        if (!registeredEvents.has(eventName)) {
          registeredEvents.add(eventName)
          document.addEventListener(eventName, async (event) => {
            if (event.target.closest(`[data-ajt-trigger~=${eventName}]`)) {
              ajt(event)
            }
          })
        }
      })
    })
  }
  const observer = new MutationObserver(() => {
    initListeners()
  })
  observer.observe(document, { childList: true, subtree: true });

  initListeners()
}

window.ajt = ajt

const parser = new DOMParser()

export function fetch (resource, options = {}) {
  options.headers = Object.assign({
    'x-requested-with': 'XMLHttpRequest'
  }, options.headers)
  return window.fetch(resource, options)
}

window.ajtEventHandlers = Object.assign({
  click: (event) => {
    event.preventDefault()
    const target = event.target.closest('a[data-href]') || event.target.closest('a[href]')
    const url = target.dataset.href
      ? target.dataset.href
      : target.href
    return [url]
  },
  submit: (event) => {
    event.preventDefault()
    const form = event.target
    const submitter = event.submitter
    const method = submitter?.hasAttribute('formmethod') ? submitter.formMethod : form.method
    const action = submitter?.hasAttribute('formaction') ? submitter.formAction : form.action
    const enctype = submitter?.hasAttribute('formenctype') ? submitter.formEnctype : form.enctype
    const params = new URLSearchParams(new FormData(form, submitter))

    const url = new URL(action)
    const init = { method }
    if (method.toLowerCase() === 'get') {
      url.search = '?' + params.toString()
    } else {
      init.body = params
      init.headers = {
        'Content-Type': enctype
      }
    }
    return [url.href, init]
  },
  input: (event) => {
    const target = event.target
    const url = new URL(target.dataset.ajtAction, document.baseURI)
    const method = target.dataset.ajtMethod || 'POST'

    const formData = new FormData()
    formData.append(target.dataset.ajtName || target.name, target.value)
    const params = new URLSearchParams(formData)

    const init = { method }
    if (method.toLowerCase() === 'get') {
      url.search = '?' + params.toString()
    } else {
      init.body = params
    }
    return [url.href, init]
  }
}, window.ajtEventHandlers)

function processEvent (urlOrEvent) {
  if (typeof urlOrEvent === 'string') {
    return [urlOrEvent]
  }
  if (typeof urlOrEvent.type === 'string') {
    if (typeof window.ajtEventHandlers[urlOrEvent.type] === 'function') {
      const [url, data] = window.ajtEventHandlers[urlOrEvent.type](
        urlOrEvent,
        urlOrEvent.target.closest('[data-ajt-trigger~=click]')
      )
      return [url, data]
    }
  }
  throw new Error('Unsupported event type')
}

export default async function ajt(urlOrEvent, context) {
  let canceled = false

  if (context) {
    if (context.ajtRequest) {
      if (context.dataset.ajtRunning === 'cancel') {
        context.ajtRequest.cancel()
      } else {
        return
      }
    }
    context.dataset.ajtStatus = 'loading'
    context.ajtRequest = {
      cancel() {
        canceled = true
        if (context) {
          delete context.dataset.ajtStatus
          delete context.ajtRequest
        }
      }
    }
  }

  const loadDomModule = import('./dom.js')

  try {
    const [url, data] = processEvent(urlOrEvent)
    if (!url) {
      return
    }
    const doc = await fetch(url, data)
      .then(res => res.text())
      .then(htmlString => parser.parseFromString(htmlString, 'text/html'))
    const domModule = await loadDomModule
    if (canceled) {
      return
    }
    await domModule.default(doc)
  } finally {
    if (context) {
      delete context.dataset.ajtStatus
      delete context.ajtRequest
    }
  }
}
