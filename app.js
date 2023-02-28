const express = require('express')
const bodyParser = require('body-parser')

const port = 4444

const app = express()

app.use(express.static('lib'))
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/a', (req, res) => {
  res.send(
`
<!DOCTYPE html>
<html>
  <body>
    <main>
      <form action="submit?test=42" method="get" onsubmit="event.preventDefault(); import('./submit-form.js').then(module => { module.default(event.target, event.submitter) })">
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

app.all('/submit', (req, res) => {
  console.log(req.query)
  console.log(req.is('application/x-www-form-urlencoded'))
  res.sendStatus(200)
})

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}/`)
})
