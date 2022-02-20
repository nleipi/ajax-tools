const { Builder, By, until } = require('selenium-webdriver')
const firefox = require('selenium-webdriver/firefox')

const startServer = require('./server.js')

describe('initial', () => {
  const port = 4444
  const root = `http://localhost:${port}`
  let driver
  let server
  let router
  beforeAll(async () => {
    server = await startServer(port)
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
    server.reset()
  })

  test('empty page', async () => {
    server.get('/a', (req, res) => {
      res.send(
`
<!DOCTYPE html>
<html>
  <body>
    <main>Hallo, Welt!</main>
  </body>
</html>
`)
    })

    await driver.get(root + '/a')
    const message = await driver.findElement(By.css('main')).getText()
    expect(message).toEqual('Hallo, Welt!')
  })

  test('submit via button', async () => {
    server.get('/a', (req, res) => {
      res.send(
`
<!DOCTYPE html>
<html>
  <head>
    <script src="index.min.js"></script>
  </head>
  <body>
    <main>
      <form action="submit" method="post">
        <input type="hidden" name="hidden_input" value="13">
        <input type="text" name="text_input" value="test">
        <button id="submitBtn" name="btn1" value="btn1_value">Submit!</btn>
      </form>
    </main>
  </body>
</html>
`)
    })

    let submitReceived = false

    server.post('/submit', (req, res) => {
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
    await driver.get(root + '/a')
    const button = await driver.findElement(By.css('#submitBtn'))
    await button.click()
    await driver.wait(until.titleIs('response'))
    expect(submitReceived).toEqual(true)
  })
})
