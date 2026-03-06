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

const parser = new DOMParser()

export function fetch (resource, options = {}) {
  options.headers = Object.assign({
    'x-requested-with': 'XMLHttpRequest'
  }, options.headers)
  return window.fetch(resource, options)
}

window.ajtEventHandlers = Object.assign({
  click: (event) => {
    const target = event.currentTarget || event.target
    const url = target.dataset.href
      ? target.dataset.href
      : target.href
    return [url]
  },
  submit: (event) => {
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

/*
  *
  * Soll mit allen events funktionieren in dem man data attribute nutzt
  */
function processEvent (urlOrEvent, target) {
  if (typeof urlOrEvent === 'string') {
    return fetch(urlOrEvent)
  }
  if (typeof urlOrEvent.type === 'string') {
    if (typeof window.ajtEventHandlers[urlOrEvent.type] === 'function') {
      const [url, data] = window.ajtEventHandlers[urlOrEvent.type](urlOrEvent)
      return fetch(url, data)
    }
  }
  return Promise.reject(new Error('Unsupported event type'))
}

export default function (urlOrEvent, currentTarget) {
  let canceled = false
  const ifNotCanceled = (func) => (...args) => {
    if (canceled) {
      throw 'skip' // eslint-disable-line no-throw-literal
    }
    return func.apply(null, args)
  }
  const target = currentTarget
    || (urlOrEvent instanceof Event)
      ? urlOrEvent.currentTarget || urlOrEvent.target
      : null

  const cancel = () => {
    canceled = true
    if (target) {
      delete target.dataset.ajtStatus
    }
  }

  if (target) {
    if (target.ajtRequest) {
      if (target.dataset.ajtRunning === 'cancel') {
        target.ajtRequest.cancel()
      } else {
        return target.ajtRequest
      }
    }
    target.dataset.ajtStatus = 'loading'
  }

  const loadDomModule = import('./dom.js')

  const promise = processEvent(urlOrEvent, target)
    .then(ifNotCanceled(res => res.text()))
    .then(ifNotCanceled(htmlString => parser.parseFromString(htmlString, 'text/html')))
    .then(ifNotCanceled(doc => loadDomModule.then(ifNotCanceled(domModule => domModule.default(doc)))))
    .catch(err => {
      if (err !== 'skip') {
        console.error(err)
      }
    })
    .finally(() => {
      if (target) {
        delete target.dataset.ajtStatus
        delete target.ajtRequest
      }
    })
  const ajtRequest = Object.assign({ cancel }, promise)
  if (target) {
    target.ajtRequest = ajtRequest
  }
  return ajtRequest
}
