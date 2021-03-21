describe('initial', () => {
  beforeEach(async () => {
    await page.goto(PATH, { waitUntil: 'load' })
  })

  test('test', async () => {
    const res = await page.evaluate(() => {
      return window.ajt.submit()
    })
    expect(res).toBe(42)
  })
})
