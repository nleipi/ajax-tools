export default function (el) {
  el.addEventListener('click', (event) => {
    el.previousElementSibling.click()
  })
}
