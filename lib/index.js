import processDom from './dom.js';
import _fetch from './fetch.js';

const parser = new DOMParser()

async function processEvent (event, currentTarget) {
  const target = currentTarget
    ? currentTarget
    : event.currentTarget
      ? event.currentTarget
      : event.target
  return (event.type === 'click'
    ? _fetch(target.dataset.href
      ? target.dataset.href
      : target.href
    )
    : event.type === 'submit'
      ? import('./submit-form.js')
        .then(module => module.default(event.target, event.submitter))
      : Promise.reject(new Error('Unsupported event type'))
  )
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

  const promise = (typeof urlOrEvent === 'string'
    ? fetch(urlOrEvent)
    : processEvent(urlOrEvent, currentTarget)
  )
    .then(ifNotCanceled(res => res.text()))
    .then(ifNotCanceled(htmlString => parser.parseFromString(htmlString, 'text/html')))
    .then(ifNotCanceled(doc => processDom(doc)))
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

export function submitForm (form, submitter) {
  import('./submit-form.js')
    .then(module => module.default(form, submitter))
    .then(res => res.text())
    .then(htmlString => parser.parseFromString(htmlString, 'text/html'))
    .then(doc => processDom(doc))
    .catch(err => {
        if (err !== 'skip') {
            console.error(err)
        }
    })
}
