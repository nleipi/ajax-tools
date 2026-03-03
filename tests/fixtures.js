const express = require('express')
import { test as base } from '@playwright/test';

export const test = base.extend({
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
    const host = process.env.PW_BASE_HOST
      ? process.env.PW_BASE_HOST
      : 'localhost'
    use(`http://${host}:${addr.port}`)
  }
})

