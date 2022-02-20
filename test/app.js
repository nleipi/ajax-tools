const express = require('express')
const webpack = require('webpack')
const middleware = require('webpack-dev-middleware')
const compiler = webpack(require('../webpack.config.js'))
const bodyParser = require('body-parser')

const port = 4444

const app = express()

app.use(middleware(compiler, {
  onInfo: true
}))
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/a', (req, res) => {
  res.send(
`
<!DOCTYPE html>
<html>
  <head>
    <script src="index.min.js"></script>
  </head>
  <body>
    <main>
      <form action="submit" method="post" onsubmit="ajtools.submit(event).then(res => parse(res).then(res => ajtools.updateDom(res))">
        <input type="hidden" name="hidden_input" value="13">
        <input type="checkbox" name="ckb1" checked disabled>
        <input type="text" name="text_input" value="test">
        <button id="submitBtn" name="btn1" value="btn1_value">Submit!</button>
        <input type="submit" name="sbm">
        <input type="image" name="img">
      </form>
    </main>
  </body>
</html>
`)
})

app.post('/submit', (req, res) => {
  submitReceived = true
  res.send(
`
<!DOCTYPE html>
<html>
  <head>
    <title>response</title>
  </head>
</html>
`)
})

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}/`)
})
