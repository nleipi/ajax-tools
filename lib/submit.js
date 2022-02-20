export default async function submit (event) {
  event.preventDefault()

  const form = event.target
  const submitter = event.submitter

  const method = submitter?.hasAttribute('formmethod') ? submitter.formMethod : form.method
  const action = submitter?.hasAttribute('formaction') ? submitter.formAction : form.action
  const enctype = submitter?.hasAttribute('formenctype') ? submitter.formEnctype : form.enctype
  const params = new URLSearchParams(new FormData(form))

  if (submitter && !submitter.disabled) {
    params.append(submitter.name, submitter.value)
  }

  const res = await fetch(action, {
    method: method,
    headers: {
      'Content-Type': enctype
    },
    body: params
  })
  console.log(res.headers.get('Content-Type'))
  return res
}
