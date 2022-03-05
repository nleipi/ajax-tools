const parser = new DOMParser()

async function processEvent (event) {
  const target = event.target
    ? event.target
    : event.currentTarget
  if (target.dataset.ajtStatus) {
    return null
  }
  target.dataset.ajtStatus = 'loading'
  return (event.type === 'click'
    ? fetch(target.dataset.href
      ? target.dataset.href
      : target.href
    )
    : event.type === 'submit'
      ? import('./submit-form.js')
        .then(module => module.default(event))
      : Promise.reject(new Error('Unsupported event type'))
  ).finally(() => {
    delete target.dataset.ajtStatus
  })
}

export default function (urlOrEvent) {
  let canceled = false
  function ifNotCanceled (func) {
    return function () {
      if (canceled) {
        throw 'canceled' // eslint-disable-line no-throw-literal
      }
      return func.apply(null, arguments)
    }
  }
  (typeof urlOrEvent === 'string'
    ? fetch(urlOrEvent)
    : processEvent(urlOrEvent)
  )
    .then(ifNotCanceled(res => res.text()))
    .then(ifNotCanceled(htmlString => parser.parseFromString(htmlString, 'text/html')))
    .then(ifNotCanceled(doc => import('./dom.js').then(module => module.default(doc))))
    .catch(err => {
      if (err !== 'canceled') {
        console.error(err)
      }
    })
  return () => {
    canceled = true
  }
}
