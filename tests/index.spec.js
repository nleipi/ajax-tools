import { expect } from '@playwright/test';
import { test } from './fixtures'

test('url', async ({ page, app }) => {
  app.get('/test', (req, res) => {
    const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
  </head>
  <body>
    <div id="test">Div before ajt call</div>
  </body>
</html>
`
    res.send(html)
  })
  app.get('/submit', (req, res) => {
    const html = `
<div id="test" data-ajt-mode="replace">Div after ajt call</div>
`
    res.send(html)
  })
  await page.goto('/test')
  await page.evaluate(() => window.ajt('/submit'))
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
    <script type="module" src="./index.js"></script>
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

  test.describe('submit event parity', () => {
    ['get', 'post'].forEach((method) => {
      test.describe(method, () => {
        ['submit', 'image', 'btn', 'with_formmethod', 'with_formenctype', 'with_formaction'].forEach((btnId) => {
          test(btnId, async ({ page, app }) => {
            app.get('/test', (req, res) => {
              const useAjax = typeof req.query.ajax !== 'undefined'
              const html = `
  <!DOCTYPE html>
  <html>
    <head>
      ${useAjax ? '<script type="module" src="./index.js"></script>' : ''}
    </head>
    <body>
        <form action="submit?param1=42" method="${method}" data-ajt-trigger="submit">
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
            const results = []
            function submitHandler (req, res) {
              results.push(req)
              res.sendStatus(200)
            }
            app.all('/submit', submitHandler)
            app.all('/submit2', submitHandler)

            await page.goto('/test')
            await page.getByTestId(btnId).click()
            await page.waitForURL('**/submit*')

            await page.goto('/test?ajax')
            const responsePromise = page.waitForResponse('**/submit*')
            await page.getByTestId(btnId).click()
            await responsePromise
            
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
      <script type="module" src="./index.js"></script>
    </head>
    <body>
      <form>
        <input data-testid="no_method" data-ajt-action="/submit?q=test" data-ajt-trigger="input" name="txt" value="Lorem ipsum">
        <input data-testid="get" data-ajt-action="/submit?q=test" data-ajt-method="GET" data-ajt-trigger="input" name="txt" value="Lorem ipsum">
        <input data-testid="post" data-ajt-action="/submit?q=test" data-ajt-method="POST" data-ajt-trigger="input" name="txt" value="Lorem ipsum">
        <input data-testid="data_name" data-ajt-action="/submit?q=test" data-ajt-trigger="input" data-ajt-name="txt" name="txt2" value="Lorem ipsum">
      </form>
      <div>Original page</div>
      <div id="test">Div to be replaced</div>
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

        expect(actualReq.method).toEqual(expectedMethod)
        await expect(page.getByText('Original page')).toBeAttached()
        await expect(page.getByText('Div to be replaced')).not.toBeAttached()
        await expect(page.getByText('Div after ajt call')).toBeAttached()
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
      focusin: (event) => {
        const url = new URL(event.target.dataset.url, document.baseURI)
        return [url.href]
      }
    }, window.ajtEventHandlers)
  </script>
  <script type="module" src="./index.js"></script>
</head>
<body>
  <div tabindex="1" data-testid="btn" data-ajt-trigger="focusin" data-url="/submit">Update</div>
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
    await page.getByTestId('btn').focus()

    await expect(page.getByText('Original page')).toBeAttached()
    await expect(page.getByText('Div to be replaced')).not.toBeAttached()
    await expect(page.getByText('Div after ajt call')).toBeAttached()
  })
})

test.describe('data-ajt-triggers', () => {
  test('mutation observer', async ({ page, app }) => {
    app.get('/test', (req, res) => {
      const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
  </head>
  <body>
    <a data-testid="btn" data-ajt-trigger="click" href="/submit">Update</a>
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
<form id="test" data-ajt-mode="replace" data-ajt-trigger="submit" action="/submit-form" method="POST">
  <input type="submit" data-testid="btn2" name="foo" value="bar">
</form>
`
      res.send(html)
    })
    app.post('/submit-form', (req, res) => {
      const html = `
<!DOCTYPE html>
<div id="test" data-ajt-mode="replace">Div after ajt call</div>
`
      res.send(html)
    })
    await page.goto('/test')
    await page.getByTestId('btn').click()
    await page.getByTestId('btn2').click()

    await expect(page.getByText('Original page')).toBeAttached()
    await expect(page.getByText('Div to be replaced')).not.toBeAttached()
    await expect(page.getByText('Div after ajt call')).toBeAttached()
  })

  test('ajtNoTriggers', async ({ page, app }) => {
    app.get('/test', (req, res) => {
      const html = `
<!DOCTYPE html>
<html>
  <head>
    <script>
      window.ajtNoTriggers = true
    </script>
    <script type="module" src="./index.js"></script>
  </head>
  <body>
    <a data-testid="btn" data-ajt-trigger="click" href="/submit">Update</a>
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
    await page.getByTestId('btn').click()

    await expect(page.getByText('Original page')).not.toBeAttached()
    await expect(page.getByText('Div to be replaced')).not.toBeAttached()
    await expect(page.getByText('Div after ajt call')).toBeAttached()
  });

  ['wrong_trigger', 'no_trigger'].forEach((testId) => {
    test(testId, async ({ page, app }) => {
      app.get('/test', (req, res) => {
        const html = `
<!DOCTYPE html>
<html>
  <head>
    <script>
      window.ajtNoTriggers = true
    </script>
    <script type="module" src="./index.js"></script>
  </head>
  <body>
    <a data-ajt-trigger="click" href="/submit">Update</a>
    <a data-testid="wrong_trigger" data-ajt-trigger="submit" href="/submit">Update</a>
    <a data-testid="no_trigger" href="/submit">Update</a>
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

      await expect(page.getByText('Original page')).not.toBeAttached()
      await expect(page.getByText('Div to be replaced')).not.toBeAttached()
      await expect(page.getByText('Div after ajt call')).toBeAttached()
    })
  })
})

test.describe('context', () => {
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
