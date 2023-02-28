const express = require('express')
const { Builder, By } = require('selenium-webdriver')
const { promiseSettled } = require('./selenium-utils.js')
const firefox = require('selenium-webdriver/firefox')

const app = express()
app.use(express.static('lib'))

const stack = app._router.stack.concat([])

const port = 4444
const root = `http://localhost:${port}`
let driver
let server
beforeAll(async () => {
  server = app.listen(port)
  driver = await new Builder()
    .setFirefoxOptions(new firefox.Options()
      .headless()
    )
    .forBrowser('firefox')
    .build()
})

afterAll(async () => {
  await driver.close()
  await server.close()
})

afterEach(() => {
  app._router.stack = stack.concat([])
})

describe('compare content-type, query string and body', () => {
  describe.each(['get', 'post'])('when submitted with method: %s', (method) => {
    test.each(['btn2', 'btn2', 'btn3'])('and submitter: %s', async (btnId) => {
      function createFormRoute (path, useAjax) {
        app.get(path, (req, res) => {
          const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <script type="module">
        import s from './submit-form.js'
        window.submitHandler = s
      </script>
    </head>
    <body>
        <form action="submit?param1=42" method="${method}" ${useAjax ? 'onsubmit="event.preventDefault(); window.promise = submitHandler(event.target, event.submitter)"' : ''}>
          <input type="hidden" name="hidden_input" value="test">
          <input type="text" name="text_input" value="Lorem ipsum">
          <input id="btn1" type="submit" name="submit_input" value="42">
          <input id="btn2" type="image" name="image_input">
          <button id="btn3" name="btn" value="42">Button</button>
        </form>
    </body>
  </html>
  `
          res.send(html)
        })
      }
      const results = []
      app.all('/submit', (req, res) => {
        results.push(req)
        res.sendStatus(200)
      })
      createFormRoute('/get-form', false)
      createFormRoute('/get-form-ajax', true)

      const btnSelector = By.css(`#${btnId}`)

      await driver.get(root + '/get-form')
      let button = await driver.findElement(btnSelector)
      await button.click()

      await driver.get(root + '/get-form-ajax')
      button = await driver.findElement(btnSelector)
      await button.click()
      await driver.wait(promiseSettled('promise'))

      const [resp, ajaxResp] = results
      expect(ajaxResp.query).toEqual(resp.query)
      expect(ajaxResp.body).toEqual(resp.body)
      expect(ajaxResp.get('content-type')).toEqual(resp.get('content-type'))
    })
  })
})
