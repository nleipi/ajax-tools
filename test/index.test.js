const { Builder, By, Key, until } = require('selenium-webdriver')
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
      .forBrowser('firefox').build()
  })

  afterAll(async () => {
    await driver.close()
    await server.close()
  })

  afterEach(() => {
    server.reset()
  })

  test('routeA', async () => {
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

  test('routeA2', async () => {
    server.get('/a', (req, res) => {
      res.send(
`
<!DOCTYPE html>
<html>
  <body>
    <main>Hallo, world!</main>
  </body>
</html>
`)
    })
    await driver.get(root + '/a')
    const message = await driver.findElement(By.css('main')).getText()
    expect(message).toEqual('Hallo, world!')
  })

  test('open page', async () => {
    await driver.get(root)
    const main = await driver.findElement(By.css('main'))
    const isDisplayed = await main.isDisplayed()
    expect(isDisplayed).toBe(true)
  })
})
