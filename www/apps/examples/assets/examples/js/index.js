import ajt from '@ajax-tools/ajt'

let ajtWithDiff;
import('./dom-diff.js').then(module => {
  ajtWithDiff = module.ajtWithDiff
})

window.ajtProcessEvent = function (event) {
  return !(document.getElementById('disable-ajt')?.checked)
}

window.ajt = (...args) => {
  if (document.getElementById('show-diff')?.checked) {
    return ajtWithDiff(...args)
  }
  return ajt(...args)
}
