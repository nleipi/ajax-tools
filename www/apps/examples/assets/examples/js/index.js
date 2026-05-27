import ajt from '@ajax-tools/ajt'

let ajtWithDiff;
import('./dom-diff.js').then(module => {
  ajtWithDiff = module.ajtWithDiff
})

window.ajt = (...args) => {
  if (document.getElementById('disable-ajt').checked) {
    return
  }
  if (!document.getElementById('show-diff').checked) {
    return ajt(...args)
  }
  return ajtWithDiff(...args)
}
