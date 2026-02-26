import _fetch from './fetch.js'

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

export default async function submitHandler (form, submitter) {
  const method = submitter?.hasAttribute('formmethod') ? submitter.formMethod : form.method
  const action = submitter?.hasAttribute('formaction') ? submitter.formAction : form.action
  const enctype = submitter?.hasAttribute('formenctype') ? submitter.formEnctype : form.enctype
  const params = new URLSearchParams(new FormData(form))

  const url = new URL(action)
  const init = { method }
  if (method.toLowerCase() === 'get') {
    url.search = params.toString()
  } else {
    init.body = params
    init.headers = {
      'Content-Type': enctype
    }
  }

  const res = await _fetch(url, init)
  return res
}
