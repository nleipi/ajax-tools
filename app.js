const express = require('express')
const bodyParser = require('body-parser')

const port = 4444

const app = express()

app.use(express.static('lib'))
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/a', (req, res) => {
  res.append('Content-Security-Policy', "script-src 'nonce-foobar'")
  res.send(
`
<!DOCTYPE html>
<html>
  <head>
    <script type="module" nonce="foobar">
      window.nonce = "foobar"
      new MutationObserver((mutations) => {
        console.log(mutations)
      }).observe(document, { childList: true, subtree: true })
    </script>
    <script type="module" nonce="foobar" src="./index.js"></script>
  </head>
  <body>
    <main>
      <form action="submit?test=42" method="get" data-ajt-trigger="submit">
        <input type="hidden" name="hidden_input" value="13">
        <input type="checkbox" name="ckb1" checked disabled>
        <input type="text" name="text_input" value="test">
        <button id="submitBtn" name="btn1" value="btn1_value">Submit!</button>
        <input type="submit" name="sbm">
        <input type="image" name="img">
      </form>
      <div id="test" data-testid="el">Lorem <span>Div before ajt call<span>inner</span></span> ipsum</div>
    </main>
  </body>
</html>
`)
})

app.all('/submit', (req, res) => {
  console.log(req.query)
  console.log(req.is('application/x-www-form-urlencoded'))
  const html = `
<div id="test" data-testid="newEl" data-ajt-mode="replace">Dolor <span>Div after ajt call</span> sit</div>
`
  res.send(html)
})

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}/`)
})
