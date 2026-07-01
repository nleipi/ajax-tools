import { expect } from '@playwright/test';
import { test } from './fixtures'

test.describe('data-ajt-mode', () => {
  function getExpectedDomProcessEvents(viewTransitionTypes = []) {
    return [
      ['beforeUpdate'],
      ['transition', viewTransitionTypes],
      ['beforeApplyDomChanges'],
      ['afterApplyDomChanges'],
      ['transition.updateCallbackDone'],
      ['transition.ready'],
      ['transition.finished'],
      ['afterUpdate'],
    ]
  }
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.eventHistory = []

      function pushEvent(event) {
        const arr = [event.type]
        if (event.detail instanceof Node) {
          arr.push(event.detail.outerHTML || event.detail.textContent)
        } else if (event.detail instanceof ViewTransition) {
          arr.push(Array.from(event.detail.types))
        } else if (event.detail?.constructor?.name === 'Batch') {
          arr.push(event.detail.id)
        }
        window.eventHistory.push(arr)
      }

      document.addEventListener('ajtDomProcess', (event) => {
        const domProcess = event.detail
        window.domProcess = domProcess

        domProcess.addEventListener('batch', (event) => {
          const batch = event.detail
          pushEvent(event)
          batch.addEventListener('removeElement', pushEvent)
          batch.addEventListener('addElement', pushEvent)
          batch.addEventListener('beforeUpdate', pushEvent)
          batch.addEventListener('transition', (event) => {
            pushEvent(event)
            event.detail.updateCallbackDone.then(() => {
              pushEvent({ type: 'transition.updateCallbackDone' })
            })
            event.detail.ready.then(() => {
              pushEvent({ type: 'transition.ready' })
            })
            event.detail.finished.then(() => {
              pushEvent({ type: 'transition.finished' })
            })
          })
          batch.addEventListener('beforeApplyDomChanges', pushEvent)
          batch.addEventListener('afterApplyDomChanges', pushEvent)
          batch.addEventListener('afterUpdate', pushEvent)
        })
      })
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

    await page.evaluate(() => window.ajt('/submit').finished)

    await page.getByTestId('el').evaluate((el) => window.newElement = el)

    expect(await page.evaluate(() => window.eventHistory)).toEqual([
      ['batch', 0],
      ['removeElement', '<div id="test" data-testid="el">Div before ajt call</div>'],
      ['addElement', '<div id="test" data-testid="el" data-ajt-mode="replace">Div after ajt call</div>'],
      ...getExpectedDomProcessEvents()
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

    await page.evaluate(() => window.ajt('/submit').finished)

    await page.getByTestId('el').evaluate((el) => window.newElement = el)

    expect(await page.evaluate(() => window.eventHistory)).toEqual([
      ['batch', 0],
      ['removeElement', 'Lorem '],
      ['removeElement', '<span>Div before ajt call<span>inner</span></span>'],
      ['removeElement', ' ipsum'],
      ['addElement', 'Dolor '],
      ['addElement', '<span>Div after ajt call</span>'],
      ['addElement', ' sit'],
      ...getExpectedDomProcessEvents()
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

      await page.evaluate(() => window.ajt('/submit').finished)

      await page.getByTestId('el').evaluate((el) => window.newElement = el)

      expect(await page.evaluate(() => window.eventHistory)).toEqual([
        ['batch', 0],
        ['addElement', 'Dolor '],
        ['addElement', '<span>Div after ajt call</span>'],
        ['addElement', ' sit'],
          ...getExpectedDomProcessEvents()
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
    await page.evaluate(() => window.ajt('/submit').finished)

    expect(await page.evaluate(() => window.eventHistory)).toEqual([
      ['batch', 0],
      ['removeElement', '<div id="test" data-testid="el">Div before ajt call</div>'],
      ...getExpectedDomProcessEvents(),
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

    await page.evaluate(() => window.ajt('/submit').finished)

    await page.getByTestId('el').evaluate((el) => window.newElement = el)

    expect(await page.evaluate(() => window.eventHistory)).toEqual([
      ['batch', 0],
      ['removeElement', '<span>Div before ajt call</span>'],
      ['addElement', '<span>Div after ajt call</span>'],
      ...getExpectedDomProcessEvents()
    ])
    await expect(page.getByText('Div after ajt call')).toBeAttached()
    expect(await page.evaluate(() => {
      return window.oldElement === window.newElement
    })).toBe(true)
  })

  test('without startViewTransition support', async ({ page, app }) => {
    await page.addInitScript(() => {
      document.startViewTransition = null
    })
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

    await page.evaluate(() => window.ajt('/submit').finished)

    await page.getByTestId('el').evaluate((el) => window.newElement = el)

    expect(await page.evaluate(() => window.eventHistory)).toEqual([
      ['batch', 0],
      ['removeElement', '<div id="test" data-testid="el">Div before ajt call</div>'],
      ['addElement', '<div id="test" data-testid="el" data-ajt-mode="replace">Div after ajt call</div>'],
      ['beforeUpdate'],
      ['beforeApplyDomChanges'],
      ['afterApplyDomChanges'],
      ['afterUpdate'],
    ])
    await expect(page.getByText('Div after ajt call')).toBeAttached()
    expect(await page.evaluate(() => {
      return window.oldElement !== window.newElement
    })).toBe(true)
  })

  test('viewTransition types', async ({ page, app }) => {
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
<div id="test" data-testid="el" data-ajt-mode="replace" data-ajt-view-transition-types="a b  c">Div after ajt call</div>
`
      res.send(html)
    })
    await page.goto('/test')
    await page.getByTestId('el').evaluate((el) => window.oldElement = el)

    await page.evaluate(() => window.ajt('/submit').finished)

    await page.getByTestId('el').evaluate((el) => window.newElement = el)

    expect(await page.evaluate(() => window.eventHistory)).toEqual([
      ['batch', 0],
      ['removeElement', '<div id="test" data-testid="el">Div before ajt call</div>'],
      ['addElement', '<div id="test" data-testid="el" data-ajt-mode="replace" data-ajt-view-transition-types="a b  c">Div after ajt call</div>'],
      ...getExpectedDomProcessEvents(['a', 'b', 'c'])
    ])
    await expect(page.getByText('Div after ajt call')).toBeAttached()
    expect(await page.evaluate(() => {
      return window.oldElement !== window.newElement
    })).toBe(true)
  })

  test.describe('batching', () => {
    test('nested target', async ({ page, app }) => {
      app.get('/test', (req, res) => {
        const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <script type="module" src="./index.js"></script>
    </head>
    <body>
      <div id="target" data-testid="el">Div before ajt call</div>
    </body>
  </html>
  `
        res.send(html)
      })
      app.get('/submit', (req, res) => {
        const html = `
  <!DOCTYPE html>
  <div id="target" data-testid="target" data-ajt-mode="replace">
    <div>Div after ajt call</div>
    <div data-testid="nested-target" id="nested-target"></div>
  </div>
  <div id="nested-target" data-ajt-batch="1" data-ajt-mode="replace">Nested target content</div>
  `
        res.send(html)
      })
      await page.goto('/test')

      await page.evaluate(() => window.ajt('/submit').finished)

      expect(await page.evaluate(() => window.eventHistory)).toEqual([
        ['batch', 0],
        ['removeElement', '<div id="target" data-testid="el">Div before ajt call</div>'],
        ['addElement', `<div id="target" data-testid="target" data-ajt-mode="replace">
    <div>Div after ajt call</div>
    <div data-testid="nested-target" id="nested-target"></div>
  </div>`],
        ...getExpectedDomProcessEvents(),
        ['batch', 1],
        ['removeElement', '<div data-testid="nested-target" id="nested-target"></div>'],
        ['addElement', '<div id="nested-target" data-ajt-batch="1" data-ajt-mode="replace">Nested target content</div>'],
        ...getExpectedDomProcessEvents(),
      ])
      const target = page.getByTestId('target')
      await expect(target).toBeAttached()
      await expect(target).toContainText('Div after ajt call')
      await expect(target).toContainText('Nested target content')
    })
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

        await page.evaluate(() => window.ajt('/submit').finished)

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

    await page.evaluate(() => window.ajt('/submit').finished)

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

          await page.evaluate(() => window.ajt('/submit').finished)

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

          await page.evaluate(() => window.ajt('/submit').finished)

          expect(await page.evaluate(() => window.results)).toEqual(expected)
        })
      })
  })
})

