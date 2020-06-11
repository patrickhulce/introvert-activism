/* eslint-disable @typescript-eslint/no-var-requires */

const express = require('express')

const {createCallRouter, intializeMiddleware} = require('../../../dist-dev/api/src/api.js')

const app = express()

intializeMiddleware(app)
const {router, twilio} = createCallRouter()
app.use('/', router)
app.listen(8675, () => console.log('Listening on http://localhost:8675'))

process.on('SIGINT', async () => {
  console.log('Received shutdown request...')

  while (twilio.isInProgress()) {
    console.log('Twilio has calls in progress, waiting...')
    await new Promise(r => setTimeout(r, 1000))
  }

  process.exit(0)
})
