import ajt from '@ajax-tools/ajt'

import('./dom-diff.js')

window.ajtProcessEvent = function (event) {
  return !(document.getElementById('disable-ajt')?.checked)
}
