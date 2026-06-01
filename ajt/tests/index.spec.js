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
    ['href', 'data-href', 'nested'].forEach((testId) => {
      test(testId, async ({ page, app }) => {
        app.get('/test', (req, res) => {
          const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
  </head>
  <body>
    <a data-testid="href" href="/submit" data-via-ajt>Update</a>
    <a data-testid="data-href" href="/noop" data-href="/submit" data-via-ajt>Update</a>
    <a href="/submit" data-via-ajt>
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
        <form action="submit?param1=42" method="${method}" data-via-ajt>
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
})

test.describe('data-via-ajt', () => {
  test('dynamic content', async ({ page, app }) => {
    app.get('/test', (req, res) => {
      const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
  </head>
  <body>
    <a data-testid="btn" data-via-ajt href="/submit">Update</a>
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
<form id="test" data-ajt-mode="replace" data-via-ajt action="/submit-form" method="POST">
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
    <a data-testid="btn" data-via-ajt href="/submit">Update</a>
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
    <a data-via-ajt href="/submit">Update</a>
    <a data-testid="wrong_trigger" data-via-ajt href="/submit">Update</a>
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
    <a data-testid="implicit" href="/submit" data-via-ajt>Update</a>
    <div class="my-context">dummy context to verify closest</div>
    <div class="my-context" data-testid="closest-context">
      <span>My context</span>
      <a data-testid="closest" href="/submit" data-via-ajt data-ajt-context-closest=".my-context">Update</a>
    </div>
    <a data-testid="selector" href="/submit" data-via-ajt data-ajt-context-selector=".global-context">Update</a>
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

test.describe('return value', () => {
  test.beforeEach(({ app }) => {
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
  })

  test('then', async ({ page }) => {
    await page.goto('/test')
    const result = await page.evaluate(() => {
      const res = window.ajt('/submit')
      return res.finished
    })
    expect(result).toBe(true)
    await expect(page.getByText('Div after ajt call')).toBeAttached()
  })
  test('catch', async ({ page }) => {
    await page.route('/submit', (route) => route.abort('aborted'))
    await page.goto('/test')
    const result = await page.evaluate(() => {
      return window.ajt('/submit').finished.catch((err) => {
        if (err instanceof TypeError) {
          return 'error caught'
        }
      })
    })
    expect(result).toBe('error caught')
    await expect(page.getByText('Div after ajt call')).not.toBeAttached()
  })
  test('programmatic cancelation', async ({ page }) => {
    await page.goto('/test')
    const result = await page.evaluate(() => {
      const res = window.ajt('/submit')
      res.cancel()
      return res.finished
    })
    expect(result).toBe(false)
    await expect(page.getByText('Div after ajt call')).not.toBeAttached()
  })
})
