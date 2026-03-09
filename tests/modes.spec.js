import { expect } from '@playwright/test';
import { test } from './fixtures'

test.describe('loading context', () => {
  [
    ['implicit', 'implicit'],
    ['closest', 'closest-context'],
    ['selector', 'global-context'],
  ].forEach(([btnId, contextId]) => {
    test(btnId, async ({ page, app }) => {
      app.get('/test', (req, res) => {
        const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
  </head>
  <body>
    <a data-testid="implicit" href="/submit" data-ajt-trigger="click">Update</a>
    <div class="my-context">dummy context to verify closest</div>
    <div class="my-context" data-testid="closest-context">
      <span>My context</span>
      <a data-testid="closest" href="/submit" data-ajt-trigger="click" data-ajt-context-closest=".my-context">Update</a>
    </div>
    <a data-testid="selector" href="/submit" data-ajt-trigger="click" data-ajt-context-selector=".global-context">Update</a>
    <div class="global-context" data-testid="global-context">Global context</div>
    <div id="test">Div before ajt call</div>
  </body>
</html>
`
        res.send(html)
      })
      
      const contextLocactor = page.getByTestId(contextId)
      app.get('/submit', async (req, res) => {
        await expect(contextLocactor).toHaveAttribute('data-ajt-status', 'loading')
        const html = `
<!DOCTYPE html>
<div id="test" data-ajt-mode="replace">Div after ajt call</div>
`
        res.send(html)
      })
      await page.goto('/test')
      await expect(contextLocactor).not.toHaveAttribute('data-ajt-status', 'loading')
      await page.getByTestId(btnId).click()
      await expect(page.getByText('Div after ajt call')).not.toBeAttached()
      await expect(contextLocactor).not.toHaveAttribute('data-ajt-status', 'loading')
      await expect(page.getByText('Div after ajt call')).toBeAttached()
    })
  })
})
