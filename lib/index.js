const parser = new DOMParser()

function _fetch (urlStr) {
  const url = new URL(urlStr)
  if (window.nonce) {
    url.searchParams.append('nonce', window.nonce)
  }
  return fetch(url)
}

async function processEvent (event) {
  const target = event.target
    ? event.target
    : event.currentTarget
  if (target.dataset.ajtStatus) {
    return Promise.reject('skip') // eslint-disable-line prefer-promise-reject-errors
  }
  target.dataset.ajtStatus = 'loading'
  return (event.type === 'click'
    ? _fetch(target.dataset.href
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

export default function (urlOrEvent, nonce) {
  let canceled = false
  function ifNotCanceled (func) {
    return function () {
      if (canceled) {
        throw 'skip' // eslint-disable-line no-throw-literal
      }
      return func.apply(null, arguments)
    }
  }
  (typeof urlOrEvent === 'string'
    ? _fetch(urlOrEvent)
    : processEvent(urlOrEvent)
  )
    .then(ifNotCanceled(res => res.text()))
    .then(ifNotCanceled(htmlString => parser.parseFromString(htmlString, 'text/html')))
    .then(ifNotCanceled(doc => import('./dom.js').then(module => module.default(doc))))
    .catch(err => {
      if (err !== 'skip') {
        console.error(err)
      }
    })
  return () => {
    canceled = true
  }
}
