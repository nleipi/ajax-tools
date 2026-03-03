const express = require('express')
import { test as base, expect } from '@playwright/test';


const test = base.extend({
  app: async ({}, use) => {
    const app = express()
    app.use(express.static('lib'))
    app.get('/', (req, res) => {
      res.send('Hello, world!')
    })
    await use(app)
  },
  server: async ({ app }, use) => {
    const server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s))
    })
    await use(server)
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  },
  baseURL: async ({ server }, use) => {
    const addr = server.address()
    use(`http://hostmachine:${addr.port}`)
  }
})

test.describe('submit-form', () => {
  ['get', 'post'].forEach((method) => {
    test.describe(method, () => {
      ['btn1', 'btn2', 'btn3'].forEach((btnId) => {
        test(btnId, async ({ page, app, server }) => {
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
        <input data-testid="btn1" type="submit" name="submit_input" value="42">
        <input data-testid="btn2" type="image" name="image_input">
        <button data-testid="btn3" name="btn" value="42">Button</button>
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

          await page.goto('/get-form')
          await page.getByTestId(btnId).click()
          await page.waitForURL('**/submit?*')

          await page.goto('/get-form-ajax')
          const responsePromise = page.waitForResponse('**/submit?*')
          await page.getByTestId(btnId).click()
          const response = await responsePromise
          
          const [resp, ajaxResp] = results
          expect(ajaxResp.query).toEqual(resp.query)
          expect(ajaxResp.body).toEqual(resp.body)
          expect(ajaxResp.get('content-type')).toEqual(resp.get('content-type'))
        })
      })
    })
  })
})

// test('has title', async ({ page }) => {
//   await page.goto('https://playwright.dev/');
// 
//   // Expect a title "to contain" a substring.
//   await expect(page).toHaveTitle(/Playwright/);
// });
// 
// test('get started link', async ({ page }) => {
//   await page.goto('https://playwright.dev/');
// 
//   // Click the get started link.
//   await page.getByRole('link', { name: 'Get started' }).click();
// 
//   // Expects page to have a heading with the name of Installation.
//   await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
// });
