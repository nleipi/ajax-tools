import { expect } from '@playwright/test';
import { test } from './fixtures'

test('url', async ({ page, app }) => {
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
    <div id="test">Div before ajt call</div>
  </body>
</html>
`
    res.send(html)
  })
  app.get('/test2', (req, res) => {
    const html = `
<div id="test" data-ajt-mode="replace">Div after ajt call</div>
`
    res.send(html)
  })
  await page.goto('/test')
  await page.evaluate(() => window.ajt('/test2'))
  await expect(page.getByText('Div after ajt call')).toBeAttached()
})

test.describe('click', () => {
  ['href', 'data-href'].forEach((attr) => {
    test(attr, async ({ page, app }) => {
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
    <a data-testid="btn" ${attr}="/test2" onclick="event.preventDefault(); ajt(event)">Update</a>
    <div id="test">Div before ajt call</div>
  </body>
</html>
`
        res.send(html)
      })
      app.get('/test2', (req, res) => {
        const html = `
<!DOCTYPE html>
<div id="test" data-ajt-mode="replace">Div after ajt call</div>
`
        res.send(html)
      })
      await page.goto('/test')
      await page.getByTestId('btn').click()
      await expect(page.getByText('Div after ajt call')).toBeAttached()
    })
  })
})

test.describe('submit', () => {
  ['get', 'post'].forEach((method) => {
    test.describe(method, () => {
      ['submit', 'image', 'btn', 'with_formmethod', 'with_formenctype', 'with_formaction'].forEach((btnId) => {
        test(btnId, async ({ page, app }) => {
          function createFormRoute (path, useAjax) {
            app.get(path, (req, res) => {
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
      <form action="submit?param1=42" method="${method}" ${useAjax ? 'onsubmit="event.preventDefault(); ajt(event)"' : ''}>
        <input type="hidden" name="hidden_input" value="test">
        <input type="text" name="text_input" value="Lorem ipsum">
        <input data-testid="submit" type="submit" name="submit_input" value="42">
        <input data-testid="image" type="image" name="image_input">
        <button data-testid="btn" name="btn" value="42">Button</button>
        <button data-testid="with_formmethod" name="btn" value="42" formmethod="POST">Button</button>
        <button data-testid="with_formenctype" name="btn" value="42" formenctype="text/plain">Button</button>
        <button data-testid="with_formaction" name="btn" value="42" formaction="/submit2?param1=42">Button</button>
      </form>
  </body>
</html>
`
              res.send(html)
            })
          }
          const results = []
          function submitHandler (req, res) {
            results.push(req)
            res.sendStatus(200)
          }
          app.all('/submit', submitHandler)
          app.all('/submit2', submitHandler)

          createFormRoute('/get-form', false)
          createFormRoute('/get-form-ajax', true)

          await page.goto('/get-form')
          await page.getByTestId(btnId).click()
          await page.waitForURL('**/submit*')

          await page.goto('/get-form-ajax')
          const responsePromise = page.waitForResponse('**/submit*')
          await page.getByTestId(btnId).click()
          const response = await responsePromise
          
          const [origReq, ajaxReq] = results
          expect(ajaxReq.method).toEqual(origReq.method)
          expect(ajaxReq.originalUrl).toEqual(origReq.originalUrl)
          expect(ajaxReq.get('content-type')).toEqual(origReq.get('content-type'))
          expect(ajaxReq.query).toEqual(origReq.query)
          expect(ajaxReq.body).toEqual(origReq.body)
        })
      })
    })
  })
})
