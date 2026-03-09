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

test.describe('builtin event handlers', () => {
  test.describe('click event', () => {
    ['href', 'data-href', 'inline', 'nested'].forEach((testId) => {
      test(testId, async ({ page, app }) => {
        app.get('/test', (req, res) => {
          const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module">
      import ajt from './index.js'
      window.ajt = ajt
      document.addEventListener('click', (event) => {
        if (event.target.closest('[data-ajt-trigger~=click]')) {
          ajt(event)
        }
      })
    </script>
  </head>
  <body>
    <a data-testid="inline" href="/submit" onclick="ajt(event)">Update</a>
    <a data-testid="href" href="/submit" data-ajt-trigger="click">Update</a>
    <a data-testid="data-href" href="/noop" data-href="/submit" data-ajt-trigger="click">Update</a>
    <a href="/submit" data-ajt-trigger="click">
      <span data-testid="nested">Update<span>
    </a>
    <div>Original page</div>
    <div id="test">Div to be replaced</div>
  </body>
</html>
`
          res.send(html)
        })
        app.get('/submit', (req, res) => {
          const html = `
<!DOCTYPE html>
<div id="test" data-ajt-mode="replace">Div after ajt call</div>
`
          res.send(html)
        })
        await page.goto('/test')
        await page.getByTestId(testId).click()
        await expect(page.getByText('Original page')).toBeAttached()
        await expect(page.getByText('Div to be replaced')).not.toBeAttached()
        await expect(page.getByText('Div after ajt call')).toBeAttached()
      })
    })
  })

  test.describe('submit event', () => {
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

  test.describe('input event', () => {
    [
      { testId: 'no_method', expectedMethod: 'POST' },
      { testId: 'get', expectedMethod: 'GET' },
      { testId: 'post', expectedMethod: 'POST' },
      { testId: 'data_name', expectedMethod: 'POST' },
    ].forEach(({ testId, expectedMethod }) => {
      test(testId, async ({ page, app }) => {
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
      <form>
        <input data-testid="no_method" data-ajt-action="/submit?q=test" oninput="ajt(event)" name="txt" value="Lorem ipsum">
        <input data-testid="get" data-ajt-action="/submit?q=test" data-ajt-method="GET" oninput="ajt(event)" name="txt" value="Lorem ipsum">
        <input data-testid="post" data-ajt-action="/submit?q=test" data-ajt-method="POST" oninput="ajt(event)" name="txt" value="Lorem ipsum">
        <input data-testid="data_name" data-ajt-action="/submit?q=test" oninput="ajt(event)" data-ajt-name="txt" name="txt2" value="Lorem ipsum">
      </form>
      <div id="test">Div before ajt call</div>
    </body>
  </html>
  `
          res.send(html)
        })
        let actualReq
        app.all('/submit', (req, res) => {
          actualReq = req
          const txt = req.method === 'GET' ? req.query.txt : req.body.txt
          const html = `
  <!DOCTYPE html>
  <div id="test" data-ajt-mode="replace">${txt}</div>
  `
          res.send(html)
        })
        await page.goto('/test')
        const responsePromise = page.waitForResponse('**/submit*')
        await page.getByTestId(testId).fill('Div after ajt call')
        await responsePromise

        await expect(page.getByText('Div after ajt call')).toBeAttached()
        expect(actualReq.method).toEqual(expectedMethod)
      })
    })
  })
})

test.describe('ajtEventHandlers', () => {
  test('focus', async ({ page, app }) => {
    app.get('/test', (req, res) => {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <script>
    window.ajtEventHandlers = Object.assign({
      focus: (event) => {
        const url = new URL(event.target.dataset.url, document.baseURI)
        return [url.href]
      }
    }, window.ajtEventHandlers)
  </script>
  <script type="module">
    import ajt from './index.js'
    window.ajt = ajt
  </script>
</head>
<body>
  <div tabindex="1" data-testid="btn" onfocus="console.log(this); ajt(event)" data-url="/test2">Update</div>
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
    await page.getByTestId('btn').focus()
    await expect(page.getByText('Div after ajt call')).toBeAttached()
  })
})
