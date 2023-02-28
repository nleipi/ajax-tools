const headers = {
  'x-requested-with': 'XMLHttpRequest'
}

export default function (resource, options = {}) {
  options.headers = Object.assign({}, options.headers, headers)
  return fetch(resource, options)
}
