if (!window.SubmitEvent.prototype.hasOwnProperty('submitter')) { // eslint-disable-line no-prototype-builtins
  let lastClicked
  document.addEventListener('click', function (event) {
    lastClicked = !event.target
      ? null
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
