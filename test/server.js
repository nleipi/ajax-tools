const express = require('express')
const webpack = require('webpack')
const middleware = require('webpack-dev-middleware')
const compiler = webpack(require('../webpack.config.js'))

module.exports = function (port) {
  return new Promise((resolve, reject) => {
    const app = express()

    const instance = middleware(compiler, {
      stats: false
    })
    app.use(instance)

    const server = app.listen(port, () => {
      app.close = function () {
        return new Promise((resolve, reject) => {
          instance.close(err => {
            if (err) {
              return reject(err)
            }
            server.close(err => {
              if (err) {
                return reject(err)
              }
              resolve()
            })
          })
        })
      }
      const stack = app._router.stack.concat([])
      app.reset = function () {
        app._router.stack = stack.concat([])
      }
      resolve(app)
    })
  })
}
