import { expect } from '@playwright/test';
import { test } from './fixtures'

test.describe('data-ajt-mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.handlersHistory = []
      function pushAjtHistory(el, type) {
        window.handlersHistory.push([type, el.outerHTML || el.textContent])
      }
      window.ajtElementAddedHandlers = [(el) => pushAjtHistory(el, 'added')]
      window.ajtElementRemovedHandlers = [(el) => pushAjtHistory(el, 'removed')]
      window.ajtElementPreAddHandlers = [(el) => pushAjtHistory(el, 'preadd')]
    });
  })

  test('replace', async ({ page, app }) => {
    app.get('/test', (req, res) => {
      const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
  </head>
  <body>
    <div id="test" data-testid="el">Div before ajt call</div>
  </body>
</html>
`
      res.send(html)
    })
    app.get('/submit', (req, res) => {
      const html = `
<!DOCTYPE html>
<div id="test" data-testid="el" data-ajt-mode="replace">Div after ajt call</div>
`
      res.send(html)
    })
    await page.goto('/test')
    await page.getByTestId('el').evaluate((el) => window.oldElement = el)

    await page.evaluate(() => window.ajt('/submit'))

    await page.getByTestId('el').evaluate((el) => window.newElement = el)

    expect(await page.evaluate(() => window.handlersHistory)).toEqual([
      ['removed', '<div id="test" data-testid="el">Div before ajt call</div>'],
      ['preadd', '<div id="test" data-testid="el" data-ajt-mode="replace">Div after ajt call</div>'],
      ['added', '<div id="test" data-testid="el" data-ajt-mode="replace">Div after ajt call</div>'],
    ])
    await expect(page.getByText('Div after ajt call')).toBeAttached()
    expect(await page.evaluate(() => {
      return window.oldElement !== window.newElement
    })).toBe(true)
  })

  test('replaceContent', async ({ page, app }) => {
    app.get('/test', (req, res) => {
      const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
  </head>
  <body>
    <div id="test" data-testid="el">Lorem <span>Div before ajt call<span>inner</span></span> ipsum</div>
  </body>
</html>
`
      res.send(html)
    })
    app.get('/submit', (req, res) => {
      const html = `
<!DOCTYPE html>
<div id="test" data-testid="newEl" data-ajt-mode="replaceContent">Dolor <span>Div after ajt call</span> sit</div>
`
      res.send(html)
    })
    await page.goto('/test')
    await page.getByTestId('el').evaluate((el) => window.oldElement = el)

    await page.evaluate(() => window.ajt('/submit'))

    await page.getByTestId('el').evaluate((el) => window.newElement = el)

    expect(await page.evaluate(() => window.handlersHistory)).toEqual([
      ['removed', 'Lorem '],
      ['removed', '<span>Div before ajt call<span>inner</span></span>'],
      ['removed', ' ipsum'],
      ['preadd', 'Dolor '],
      ['preadd', '<span>Div after ajt call</span>'],
      ['preadd', ' sit'],
      ['added', 'Dolor '],
      ['added', '<span>Div after ajt call</span>'],
      ['added', ' sit'],
    ])
    expect(await page.getByTestId('el').innerHTML()).toBe('Dolor <span>Div after ajt call</span> sit')
    expect(await page.evaluate(() => {
      return window.oldElement === window.newElement
    })).toBe(true)
  });

  [
    ['appendContent', 'Lorem <span>Div before ajt call<span>inner</span></span> ipsumDolor <span>Div after ajt call</span> sit'],
    ['prependContent', 'Dolor <span>Div after ajt call</span> sitLorem <span>Div before ajt call<span>inner</span></span> ipsum']
  ].forEach(([mode, expected]) => {
    test(mode, async ({ page, app }) => {
      app.get('/test', (req, res) => {
        const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
  </head>
  <body>
    <div id="test" data-testid="el">Lorem <span>Div before ajt call<span>inner</span></span> ipsum</div>
  </body>
</html>
`
        res.send(html)
      })
      app.get('/submit', (req, res) => {
        const html = `
<!DOCTYPE html>
<div id="test" data-testid="newEl" data-ajt-mode="${mode}">Dolor <span>Div after ajt call</span> sit</div>
`
        res.send(html)
      })
      await page.goto('/test')
      await page.getByTestId('el').evaluate((el) => window.oldElement = el)

      await page.evaluate(() => window.ajt('/submit'))

      await page.getByTestId('el').evaluate((el) => window.newElement = el)

      expect(await page.evaluate(() => window.handlersHistory)).toEqual([
        ['preadd', 'Dolor '],
        ['preadd', '<span>Div after ajt call</span>'],
        ['preadd', ' sit'],
        ['added', 'Dolor '],
        ['added', '<span>Div after ajt call</span>'],
        ['added', ' sit'],
      ])
      expect(await page.getByTestId('el').innerHTML()).toBe(expected)
      expect(await page.evaluate(() => {
        return window.oldElement === window.newElement
      })).toBe(true)
    })
  })

  test('remove', async ({ page, app }) => {
    app.get('/test', (req, res) => {
      const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
  </head>
  <body>
    <div id="test" data-testid="el">Div before ajt call</div>
  </body>
</html>
`
      res.send(html)
    })
    app.get('/submit', (req, res) => {
      const html = `
<!DOCTYPE html>
<div id="test" data-testid="el" data-ajt-mode="remove">Div after ajt call</div>
`
      res.send(html)
    })
    await page.goto('/test')
    await page.evaluate(() => window.ajt('/submit'))

    expect(await page.evaluate(() => window.handlersHistory)).toEqual([
      ['removed', '<div id="test" data-testid="el">Div before ajt call</div>'],
    ])
    await expect(page.getByText('Div after ajt call')).not.toBeAttached()
    await expect(page.getByText('Div before ajt call')).not.toBeAttached()
  })

  test('update', async ({ page, app }) => {
    app.get('/test', (req, res) => {
      const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
  </head>
  <body>
    <div id="test" data-testid="el">
      Same content 1
      <span>Div before ajt call</span>
      <div>Same content 2</div>
    </div>
  </body>
</html>
`
      res.send(html)
    })
    app.get('/submit', (req, res) => {
      const html = `
<!DOCTYPE html>
<div id="test" data-ajt-mode="update">
  Same content 1
  <span>Div after ajt call</span>
  <div>Same content 2</div>
</div>
`
      res.send(html)
    })
    await page.goto('/test')
    await page.getByTestId('el').evaluate((el) => window.oldElement = el)

    await page.evaluate(() => window.ajt('/submit'))

    await page.getByTestId('el').evaluate((el) => window.newElement = el)

    expect(await page.evaluate(() => window.handlersHistory)).toEqual([
      ['removed', '<span>Div before ajt call</span>'],
      ['preadd', '<span>Div after ajt call</span>'],
      ['added', '<span>Div after ajt call</span>'],
    ])
    await expect(page.getByText('Div after ajt call')).toBeAttached()
    expect(await page.evaluate(() => {
      return window.oldElement === window.newElement
    })).toBe(true)
  })
})

test.describe('scripts', () => {
  ;([
    { name: 'root', mode: 'replaceContent' },
    { name: 'nested', mode: 'replace' },
  ]).forEach(({ name, mode }) => {
      test(name, async ({ page, app }) => {
        app.get('/test', (req, res) => {
          const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
    <script>
      window.ajtAllowUnsafeScripts = true
      window.results = []
    </script>
  </head>
  <body>
    <div id="test" data-testid="el">Div before ajt call</div>
  </body>
</html>
`
          res.send(html)
        })
        app.get('/submit', (req, res) => {
          const html = `
<!DOCTYPE html>
<div id="test" data-testid="el" data-ajt-mode="${mode}">
  <script>
    window.results.push(true)
  </script>
</div>
`
          res.send(html)
        })
        await page.goto('/test')

        await page.evaluate(() => window.ajt('/submit'))

        expect(await page.evaluate(() => window.results)).toEqual([true])
      })
    })

  test('module', async ({ page, app }) => {
    app.get('/test', (req, res) => {
      const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
    <script>
      window.ajtAllowUnsafeScripts = true
      window.results = []
    </script>
  </head>
  <body>
    <div id="test" data-testid="el">Div before ajt call</div>
  </body>
</html>
`
      res.send(html)
    })
    app.get('/submit', (req, res) => {
      const html = `
<!DOCTYPE html>
<div id="test" data-testid="el" data-ajt-mode="replace">
  <script type="module">
    if (import.meta) {
      window.results.push(true)
    }
  </script>
</div>
`
      res.send(html)
    })
    await page.goto('/test')

    await page.evaluate(() => window.ajt('/submit'))

    expect(await page.evaluate(() => window.results)).toEqual([true])
  })

  test.describe('application/x-ajt-script', () => {
    [
      { name: 'default', type: '' },
      { name: 'module', type: 'module' }
    ].forEach(({ name, type }) => {
      test(name, async ({ page, app }) => {
        app.get('/test', (req, res) => {
          const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
    <script>
      window.ajtAllowUnsafeScripts = true
      window.results = []
    </script>
  </head>
  <body>
    <div id="test" data-testid="el">Div before ajt call</div>
  </body>
</html>
`
          res.send(html)
        })
        app.get('/submit', (req, res) => {
          const html = `
<!DOCTYPE html>
<div id="test" data-testid="el" data-ajt-mode="replace">
  <script data-testid="script" type="application/x-ajt-script" ${type ? `data-ajt-script-type="${type}"` : ''}>
    window.results.push(true)
  </script>
</div>
`
            res.send(html)
          })
          await page.goto('/test')

          await page.evaluate(() => window.ajt('/submit'))

          expect(await page.evaluate(() => window.results)).toEqual([true])
          expect(await page.getByTestId('script').evaluate(
            (el, expectedType) => el.type === expectedType,
            type
          )).toBe(true)
        })
      })
  })

  test.describe('nonce', () => {
    ;[
      { name: 'valid nonce', nonces: {
        mainCsp: 'foo', ajtNonce: 'foo', responseCsp: 'bar', responseScript: 'bar'
      }, expected: [true] },
      { name: 'invalid ajtNonce', nonces: {
        mainCsp: 'foo', ajtNonce: '', responseCsp: 'bar', responseScript: 'bar'
      }, expected: [] },
      { name: 'invalid responce nonce', nonces: {
        mainCsp: 'foo', ajtNonce: 'foo', responseCsp: 'bar', responseScript: 'bar2'
      }, expected: [] },
      { name: 'empty responce nonce', nonces: {
        mainCsp: 'foo', ajtNonce: 'foo', responseCsp: '', responseScript: ''
      }, expected: [] },
    ].forEach(({ name, nonces, expected }) => {
        test(name, async ({ page, app }) => {
          app.get('/test', (req, res) => {
            res.append('Content-Security-Policy', `script-src 'nonce-${nonces.mainCsp}'`)
            const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js" nonce="${nonces.mainCsp}"></script>
    <script nonce="${nonces.mainCsp}">
      window.ajtNonce = '${nonces.ajtNonce}'
      window.results = []
    </script>
  </head>
  <body>
    <div id="test" data-testid="el">Div before ajt call</div>
  </body>
</html>
`
            res.send(html)
          })
          app.get('/submit', (req, res) => {
            if (nonces.responseCsp) {
              res.append('Content-Security-Policy', `script-src 'nonce-${nonces.responseCsp}'`)
            }
            const html = `
<!DOCTYPE html>
<div id="test" data-testid="el" data-ajt-mode="replace">
  <script ${nonces.responseScript ? `nonce="${nonces.responseScript}"` : ''}>
    window.results.push(true)
  </script>
</div>
`
            res.send(html)
          })
          await page.goto('/test')

          await page.evaluate(() => window.ajt('/submit'))

          expect(await page.evaluate(() => window.results)).toEqual(expected)
        })
      })
  })
//   test('valid nonce', async ({ page, app }) => {
//     app.get('/test', (req, res) => {
//       res.append('Content-Security-Policy', "script-src 'nonce-foo'")
//       const html = `
// <!DOCTYPE html>
// <html>
//   <head>
//     <script type="module" src="./index.js" nonce="foo"></script>
//     <script nonce="foo">
//       window.ajtNonce = 'foo'
//       window.results = []
//     </script>
//   </head>
//   <body>
//     <div id="test" data-testid="el">Div before ajt call</div>
//   </body>
// </html>
// `
//       res.send(html)
//     })
//     app.get('/submit', (req, res) => {
//       res.append('Content-Security-Policy', "script-src 'nonce-bar'")
//       const html = `
// <!DOCTYPE html>
// <div id="test" data-testid="el" data-ajt-mode="replace">
//   <script nonce="bar">
//     window.results.push(true)
//   </script>
// </div>
// `
//       res.send(html)
//     })
//     await page.goto('/test')
//
//     await page.evaluate(() => window.ajt('/submit'))
//
//     expect(await page.evaluate(() => window.results)).toEqual([true])
//   })

//   test('invalid nonce', async ({ page, app }) => {
//     app.get('/test', (req, res) => {
//       res.append('Content-Security-Policy', "script-src 'nonce-foo'")
//       const html = `
// <!DOCTYPE html>
// <html>
//   <head>
//     <script type="module" src="./index.js" nonce="foo"></script>
//     <script nonce="foo">
//       window.ajtNonce = 'foo'
//       window.results = []
//     </script>
//   </head>
//   <body>
//     <div id="test" data-testid="el">Div before ajt call</div>
//   </body>
// </html>
// `
//       res.send(html)
//     })
//     app.get('/submit', (req, res) => {
//       res.append('Content-Security-Policy', "script-src 'nonce-bar'")
//       const html = `
// <!DOCTYPE html>
// <div id="test" data-testid="el" data-ajt-mode="replace">
//   <script nonce="bar">
//     window.results.push(true)
//   </script>
// </div>
// `
//       res.send(html)
//     })
//     await page.goto('/test')
//
//     await page.evaluate(() => window.ajt('/submit'))
//
//     expect(await page.evaluate(() => window.results)).toEqual([])
//   })
})
