export default function (main) {
  main.addEventListener('dblclick', (event) => {
    const view = event.target.closest('.view')
    if (view) {
      view.closest('li').classList.add('editing')
      view.nextElementSibling.focus()
    }
  })
  main.addEventListener('change', (event) => {
    const target = event.target
    if (target.matches('.toggle-all')) {
      target.previousElementSibling.click()
    } else if (target.matches('.toggle')) {
      target.closest('form').querySelector('input[type=submit]').click()
    }
  })
  main.addEventListener('focusin', (event) => {
    const target = event.target
    if (target.matches('.edit')) {
      target.select()
    }
  })
  main.addEventListener('focusout', (event) => {
    const form = event.target.closest('.todo-form')
    if (form) {
      form.querySelector('input[type="submit"]').click()
    }
  })
}
