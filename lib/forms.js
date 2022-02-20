export function submitterPolyfil () {
  if (!window.SubmitEvent.prototype.hasOwnProperty('submitter')) { // eslint-disable-line no-prototype-builtins
    let lastClicked
    document.addEventListener('click', function (event) {
      lastClicked = !event.target
        ? null
        : event.target.matches('button, input[type=submit], input[type=image]')
          ? event.target
          : event.target.closest('button, input[type=button], input[type=image]')
    }, true)
    document.addEventListener('submit', function (event) {
      const form = event.target
      for (const el of [document.activeElement, lastClicked]) {
        if (el && el.form === form && el.matches('button, input[type=submit], input[type=image]')) {
          Object.defineProperty(event, 'submitter', {
            value: el,
            writable: false
          })
          break
        }
      }
    }, true)
  }
}

export async function submitHandler (event) {
  const form = event.target
  const submitter = event.submitter

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
  console.log(action)
  console.log(enctype)
  console.log(params)
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

  const res = await fetch(url, init)
  return res
}
