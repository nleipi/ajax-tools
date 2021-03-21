const express = require('express')
const webpack = require('webpack')
const middleware = require('webpack-dev-middleware')
const compiler = webpack(require('../webpack.config.js'))

const port = 4444

const app = express()

app.use(middleware(compiler, {}))

app.get('/', (req, res) => {
  res.send(
`
<!DOCTYPE html>
<html>
  <head>
    <script src="index.min.js"></script>
  </head>
  <body>
    <main>Hallo, Welt!</main>
  </body>
</html>
`)
})

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}/`)
})
