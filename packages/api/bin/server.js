/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs')
const os = require('os')
const path = require('path')

const bodyParser = require('body-parser')
const express = require('express')

const {createApiRouter} = require('../../../dist-dev/api/src/api.js')

const audioStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'introvert-activism-audio-'))

const app = express()

app.use(bodyParser.json({limit: '10mb'}))
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.raw({type: 'audio/*', limit: '10mb'}))

const {router, twilio} = createApiRouter(audioStorageDir)
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
