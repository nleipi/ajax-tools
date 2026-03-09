import { expect } from '@playwright/test';
import { test } from './fixtures'

test.describe('loading', () => {
  test('implicit', async ({ page, app }) => {
    app.get('/test', (req, res) => {
      const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module">
      import ajt from './index.js'
      window.ajt = ajt
    </script>
  </head>
  <body>
    <a data-testid="btn" href="/submit" onclick="event.preventDefault(); ajt(event, this)">Update</a>
    <div id="test">Div before ajt call</div>
  </body>
</html>
`
      res.send(html)
    })
    
    const btnLocator = page.getByTestId('btn')
    app.get('/submit', async (req, res) => {
      await expect(btnLocator).toHaveAttribute('data-ajt-status', 'loading')
      const html = `
<!DOCTYPE html>
<div id="test" data-ajt-mode="replace">Div after ajt call</div>
`
      res.send(html)
    })
    await page.goto('/test')
    await expect(btnLocator).not.toHaveAttribute('data-ajt-status', 'loading')
    await page.getByTestId('btn').click()
    await expect(page.getByText('Div after ajt call')).not.toBeAttached()
    await expect(btnLocator).not.toHaveAttribute('data-ajt-status', 'loading')
    await expect(page.getByText('Div after ajt call')).toBeAttached()
  })
})
