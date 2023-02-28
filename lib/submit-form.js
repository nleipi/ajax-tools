import _fetch from './fetch.js'

export default async function submitHandler (form, submitter) {
  const method = submitter?.hasAttribute('formmethod') ? submitter.formMethod : form.method
  const action = submitter?.hasAttribute('formaction') ? submitter.formAction : form.action
  const enctype = submitter?.hasAttribute('formenctype') ? submitter.formEnctype : form.enctype
  const params = new URLSearchParams(new FormData(form))

  if (submitter && !submitter.disabled) {
    if (submitter.type && submitter.type.toLowerCase() === 'image') {
      params.append(`${submitter.name}.x`, 0)
      params.append(`${submitter.name}.y`, 0)
    } else {
      params.append(submitter.name, submitter.value)
    }
  }
  const url = new URL(action)
  const init = {
    method: method
  }
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
