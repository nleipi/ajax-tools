const { Builder, By, Key, until } = require('selenium-webdriver')

const startServer = require('./server.js')

describe('initial', () => {
  const port = 4444
  const root = `http://localhost:${port}`
  let driver
  let server
  beforeAll(async () => {
    server = await startServer(port)
    driver = await new Builder().forBrowser('firefox').build()
  })

  afterAll(async () => {
    await driver.close()
    await server.close()
  })

  test('open page', async () => {
    await driver.get(root)
    const main = await driver.findElement(By.css('main'))
    const isDisplayed = await main.isDisplayed()
    expect(isDisplayed).toBe(true)
  })
})
