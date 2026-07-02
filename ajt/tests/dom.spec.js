import { expect } from '@playwright/test';
import { test } from './fixtures'
import toDiffableHtml from 'diffable-html'

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
        }
        window.eventHistory.push(arr)
      }

      document.addEventListener('ajtDomProcess', (event) => {
        const domProcess = event.detail
        window.domProcess = domProcess

        domProcess.addEventListener('removeElement', pushEvent)
        domProcess.addEventListener('addElement', pushEvent)
        domProcess.addEventListener('beforeUpdate', pushEvent)
        domProcess.addEventListener('transition', (event) => {
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
        domProcess.addEventListener('beforeApplyDomChanges', pushEvent)
        domProcess.addEventListener('afterApplyDomChanges', pushEvent)
        domProcess.addEventListener('afterUpdate', pushEvent)
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
      ['removeElement', '<div id="test" data-testid="el">Div before ajt call</div>'],
      ...getExpectedDomProcessEvents(),
    ])
    await expect(page.getByText('Div after ajt call')).not.toBeAttached()
    await expect(page.getByText('Div before ajt call')).not.toBeAttached()
  })

  test.describe('update', () => {
    [
      {
        name: 'replace element',
        content: `
      <div>Same content 1</div>
      <div>Div after ajt call</div>
      <div>Same content 2</div>
`,
        expected: [
          ['removeElement', '<div>Div before ajt call</div>'],
          ['addElement', '<div>Div after ajt call</div>'],
        ]
      },
      {
        name: 'add element',
        content: `
<div>Same content 1</div>
<div>new element</div>
<div>Div before ajt call</div>
<div>Same content 2</div>
`,
        expected: [
          ['addElement', '<div>new element</div>'],
        ]
      },
      {
        name: 'remove element',
        content: `
<div>Same content 1</div>
<div>Same content 2</div>
`,
        expected: [
          ['removeElement', '<div>Div before ajt call</div>'],
        ]
      },
    ].forEach(({ name, content, expected }) => {
      test(name, async ({ page, app }) => {
        app.get('/test', (req, res) => {
          const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
  </head>
  <body>
    <div id="test" data-testid="el">
      <div>Same content 1</div>
      <div>Div before ajt call</div>
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
  ${content}
</div>
`
          res.send(html)
        })
        await page.goto('/test')
        await page.getByTestId('el').evaluate((el) => window.oldElement = el)

        await page.evaluate(() => window.ajt('/submit').finished)

        await page.getByTestId('el').evaluate((el) => window.newElement = el)

        expect(await page.evaluate(() => window.eventHistory)).toEqual([
          ...expected,
          ...getExpectedDomProcessEvents()
        ])
        expect(toDiffableHtml(await page.getByTestId('el').innerHTML())).toEqual(toDiffableHtml(content))
        expect(await page.evaluate(() => window.oldElement === window.newElement)).toBe(true)
      })
    })
    test('update with ids', async ({ page, app }) => {
      app.get('/test', (req, res) => {
        const html = `
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./index.js"></script>
  </head>
  <body>
    <div id="test" data-testid="el" >
      <div>Same content 1</div>
      <div id="my-div" class="old-class" data-testid="my-div" data-old-attribute="val">
        <div>Div before ajt call</div>
        <div><div>my nested div</div>
        </div>
      </div>
      <div data-old-attribute="42">
        <div>Lorem</div>
        <div>
          <div>ipsum</div>
          <div id="deep-nested" data-testid="deep-nested" data-old-attr="42"><span>i stay</span></div>
        </div>
        <div>dolor</div>
      </div>
      <div>
        <div>
          <div id="deep-nested-2">replace me</div>
        </div>
      </div>
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
  <div>Same content 1</div>
  <div id="my-div" class="new-class" data-testid="my-div" data-new-attribute="val" data-ajt-update-attr-mode="replace">
    <div>Div after ajt call</div>
    <div>
<div>my nested div</div></div>
  </div>
  <div data-old-attribute="42">
    <div>Lorem</div>
    <div>
      <div>not ipsum</div>
      <div id="deep-nested" data-testid="deep-nested" data-new-attr="42"><span>i stay</span></div>
    </div>
    <div>dolor</div>
  </div>
  <div>
    <div>
      <div><div id="deep-nested-2">replace me</div></div>
    </div>
  </div>
  <div>Same content 2</div>
</div>
`
        res.send(html)
      })
      await page.goto('/test')
      await page.getByTestId('el').evaluate((el) => window.oldElement = el)
      await page.getByTestId('my-div').evaluate((el) => window.oldMyDiv = el)
      await page.getByTestId('deep-nested').evaluate((el) => window.oldDeepNested = el)

      await page.evaluate(() => window.ajt('/submit').finished)

      await page.getByTestId('el').evaluate((el) => window.newElement = el)
      await page.getByTestId('my-div').evaluate((el) => window.newMyDiv = el)
      await page.getByTestId('deep-nested').evaluate((el) => window.newDeepNested = el)

      expect(await page.evaluate(() => window.eventHistory)).toEqual([
        ['removeElement', '<div>Div before ajt call</div>'],
        ['addElement', '<div>Div after ajt call</div>'],
        ['removeElement', '<div>ipsum</div>'],
        ['addElement', '<div>not ipsum</div>'],
        ["removeElement", `<div>
        <div>
          <div id="deep-nested-2">replace me</div>
        </div>
      </div>`],
        ["addElement", `<div>
    <div>
      <div><div id="deep-nested-2">replace me</div></div>
    </div>
  </div>`],
        ...getExpectedDomProcessEvents()
      ])
      expect(toDiffableHtml(await page.getByTestId('el').innerHTML())).toEqual(toDiffableHtml(`
<div>Same content 1</div>
<div id="my-div" class="new-class" data-testid="my-div" data-new-attribute="val" data-ajt-update-attr-mode="replace">
  <div>Div after ajt call</div>
  <div><div>my nested div</div></div>
</div>
<div data-old-attribute="42">
  <div>Lorem</div>
  <div>
    <div>not ipsum</div>
    <div id="deep-nested" data-testid="deep-nested" data-old-attr="42" data-new-attr="42"><span>i stay</span></div>
  </div>
  <div>dolor</div>
</div>
<div>
  <div>
    <div><div id="deep-nested-2">replace me</div></div>
  </div>
</div>
<div>Same content 2</div>
`))
      expect(await page.evaluate(() => window.oldElement === window.newElement)).toBe(true)
      expect(await page.evaluate(() => window.oldMyDiv === window.newMyDiv)).toBe(true)
      expect(await page.evaluate(() => window.oldDeepNested === window.newDeepNested)).toBe(true)
    })
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
      ['removeElement', '<div id="test" data-testid="el">Div before ajt call</div>'],
      ['addElement', '<div id="test" data-testid="el" data-ajt-mode="replace" data-ajt-view-transition-types="a b  c">Div after ajt call</div>'],
      ...getExpectedDomProcessEvents(['a', 'b', 'c'])
    ])
    await expect(page.getByText('Div after ajt call')).toBeAttached()
    expect(await page.evaluate(() => {
      return window.oldElement !== window.newElement
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
