import ajt from 'ajax-tools'

import('./dom-diff.js')

window.ajtProcessEvent = function (event) {
  return !(document.getElementById('disable-ajt')?.checked)
}

function openDialog(dialog) {
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    closeDialog(event.target)
  })
  dialog.addEventListener('click', (event) => {
    const closeBtn = event.target.closest('[data-role=close-dialog-btn]')
    if (closeBtn && dialog.contains(closeBtn)) {
      event.preventDefault()
      closeDialog(dialog)
    }
  })
  dialog[dialog.dataset.appDialogOpen]()
}

function closeDialog(el) {
  if (el.dataset.appViewTransitionName) {
    el.style.viewTransitionName = el.dataset.appViewTransitionName
    // this is a fix for iOS, because of course there is a fix for iOS. If the name of the transition stays the same, the transition is cached or whatever, the -old animation won't play and the -new animation won't play when opening dialog second time
    if (el.style.viewTransitionName === 'open-dialog') {
      el.style.viewTransitionName = 'close-dialog'
    }
    let fromEl
    document.startViewTransition(() => {
      if (el.dataset.appViewTransitionFrom) {
        fromEl = document.getElementById(el.dataset.appViewTransitionFrom)
        if (fromEl) {
          fromEl.style.viewTransitionName = el.dataset.appViewTransitionName
          fromEl.style.opacity = null
        }
      }
      el.remove()
    }).finished.then(() => {
        if (fromEl) {
          fromEl.style.viewTransitionName = null
        }
    })
  }
}
window.closeDialog = closeDialog

const viewTransitionFunctions = {
  'product-item': (el) => {
    const columns = 3
    const index = parseInt(el.dataset.appViewTransitionFnIndex)
    document.documentElement.animate(
      [
        {
          transform: 'translateY(-50px) scale(1.1)',
          opacity: 0
        },
        {
          transform: 'translateY(0px) scale(1)',
          opacity: 1
        },
      ], {
        duration: 300,
        delay: Math.floor(index / columns) * 100 + (index % columns * 50),
        easing: 'ease-in-out',
        fill: 'both',
        pseudoElement: `::view-transition-new(${el.style.viewTransitionName})`,
      }
    )
  }
}

document.addEventListener('ajtDomProcess', (event) => {
  const domProcess = event.detail

  domProcess.addEventListener('batch', (event) => {
    const batch = event.detail
    const transitionFnElements = []
    batch.addEventListener('addElement', (event) => {
      const el = event.detail
      if (el.dataset?.appViewTransitionName) {
        el.style.viewTransitionName = el.dataset.appViewTransitionName
        el.dataset.appClearTransitionName = true
        batch.enableViewTransition()

        if (el.dataset.appViewTransitionFrom) {
          const fromEl = document.getElementById(el.dataset.appViewTransitionFrom)
          if (fromEl) {
            fromEl.style.viewTransitionName = el.dataset.appViewTransitionName
            batch.addEventListener('afterApplyDomChanges', () => {
              fromEl.style.opacity = 0
              fromEl.style.viewTransitionName = null
            })
          }
        }
        if (el.dataset.appViewTransitionFn) {
          transitionFnElements.push(el)
        }
      }
      if (el.dataset?.appDialogOpen) {
        batch.addEventListener('afterApplyDomChanges', () => {
          openDialog(el)
        })
      }
    })
    batch.addEventListener('transition', (event) => {
      const transition = event.detail
      transition.ready.then(() => {
        transitionFnElements.forEach((el, index) => {
          viewTransitionFunctions[el.dataset.appViewTransitionFn](el, index)
        })
      })
    })
    batch.addEventListener('afterUpdate', (event) => {
      document.querySelectorAll('[data-app-clear-transition-name]').forEach((el) => {
        el.style.viewTransitionName = null
        delete el.dataset.appClearTransitionName
      })
    })
  })
})

function revalidateForm(event) {
  const form = event.target.form
  if (form) {
    const validateInput = form.elements['validate']
    if (validateInput) {
      validateInput.click()
    }
  }
}
document.addEventListener('input', revalidateForm)
