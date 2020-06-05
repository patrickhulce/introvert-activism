import bodyParser from 'body-parser'
import express from 'express'
import twilio from 'twilio'
import {v4 as uuidv4} from 'uuid'

import type * as Api from '../../shared/src/utils/api'
import {createLogger} from '../../shared/src/utils/logging'

import {LocalApiStore} from './storage'

function makeResponse<T>(payload: T): Api.Response<T> {
  return {
    success: true,
    payload,
  }
}

const log = createLogger('api:router')

const WEBHOOK_ORIGIN = 'http://649566346461.ngrok.io'
const SOURCE_NUMBER = process.env.TWILIO_NUMBER || ''
const TARGET_NUMBER = process.env.TWILIO_TEST_CALL_NUMBER || ''

export function createApiRouter(localPath: string): express.Router {
  const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)

  const router = express.Router()
  const store = new LocalApiStore(localPath)

  router.use(bodyParser.urlencoded({extended: true}))

  router.use((req, res, next) => {
    log.verbose(req.method, req.path)
    next()
  })

  router.get('/version', (req, res) => res.json({version: 1}))

  router.get('/messages', async (req, res) => {
    const messages = await store.getMessages()
    res.json(
      makeResponse<Api.MessagesPayload>({messages: messages}),
    )
  })

  router.post('/messages', async (req, res) => {
    // Generate a uuid.
    const uuid = uuidv4()
    // Validate that we have a display_name
    const body = req.body
    if (!body.display_name) {
      res.status(400).end()
      return
    }

    const message = {...req.body, uuid}

    await store.postMessage(message)
    res.status(201).json(
      makeResponse<Api.MessagePayload>({message}),
    )
  })

  router.get('/messages/:messageId', async (req, res) => {
    const messageId = req.params.messageId
    const message = await store.getMessage(messageId)
    if (!message) {
      res.status(404).end()
      return
    }
    res.json(
      makeResponse<Api.MessagePayload>({message}),
    )
  })

  router.put('/messages/:messageId', async (req, res) => {
    const messageId = req.params.messageId
    // Remove uneditable content if exists.
    const body = req.body
    delete body.uuid

    const message = await store.putMessage(messageId, body)
    res.status(200).json(
      makeResponse<Api.MessagePayload>({message}),
    )
  })

  router.get('/messages/:messageId/audio', async (req, res) => {
    // Special MessagePaylod that is not json, only bin'd file.
    const audio = await store.getAudio(req.params.messageId)
    if (!audio) {
      res.status(404).end()
    }
    res.status(200).json(
      makeResponse<Api.AudioPayload>({audio: {data: audio || ''}}),
    )
  })

  router.put('/messages/:messageId/audio', async (req, res) => {
    const body = req.body
    await store.putAudio(req.params.messageId, body)
    res.status(204).end()
  })

  router.delete('/messages/:messageId', async (req, res) => {
    const del = await store.deleteMessage(req.params.messageId)
    if (!del) {
      res.status(500).end()
      return
    }
    res.status(204).end()
    return
  })

  router.post('/webhooks/initiate-call', (req, res) => {
    const callId = req.body && req.body.CallSid
    log.info('twilio call received', callId)
    const response = new twilio.twiml.VoiceResponse()
    response.say('About to redirect you')
    response.dial().conference(
      {
        startConferenceOnEnter: true,
        endConferenceOnExit: true,
        statusCallback: `${WEBHOOK_ORIGIN}/api/webhooks/conference-status`,
        statusCallbackEvent: ['start', 'join'],
      },
      'testconference',
    )
    res.set('Content-Type', 'text/xml')
    res.send(response.toString())
  })

  router.post('/webhooks/conference-status', async (req, res) => {
    log.info(req.body)
    if (req.body.SequenceNumber !== '1') return res.sendStatus(204)

    const call = await client
      .conferences(req.body.ConferenceSid)
      .participants.create({from: SOURCE_NUMBER, to: TARGET_NUMBER})

    setTimeout(() => {
      log.info('live update say')
      call.update({announceUrl: `${WEBHOOK_ORIGIN}/api/webhooks/conference-update`})
    }, 30000)

    res.sendStatus(204)
  })

  router.post('/webhooks/conference-update', async (req, res) => {
    const response = new twilio.twiml.VoiceResponse()
    response.say('I can do live updates too')
    res.set('Content-Type', 'text/xml')
    res.send(response.toString())
  })

  return router
}
