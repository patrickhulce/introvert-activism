import express from 'express'
import {v4 as uuidv4} from 'uuid'

import type * as Api from '../../shared/src/utils/api'
import {createLogger} from '../../shared/src/utils/logging'

import {LocalApiStore} from './storage'
import {TwilioAgent} from './twilio'

const PUBLIC_ORIGIN = 'http://649566346461.ngrok.io'

function makeResponse<T>(payload: T): Api.Response<T> {
  return {
    success: true,
    payload,
  }
}

const log = createLogger('api:router')

export function createApiRouter(localPath: string): express.Router {
  const twilio = new TwilioAgent()

  const router = express.Router()
  const store = new LocalApiStore(localPath)

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
    if (!message) return res.sendStatus(404)
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
    res.status(200).set('content-type', 'audio/ogg').send(audio)
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

  // JWT is sent as auth token for all service API calls
  // Phase 1 - Trade a JWT token+senator number+message for a call code (app POST /calls)
  // Phase 2 - Call the twilio number (user)
  // Phase 3 - Collect the call code from the user (server)
  //           Lookup the JWT token for the call code, bail if not found
  //           Associate JWT with the Twilio CallId and viceversa
  // Phase 4 - Create a conference call with the senator from the POST /calls call (server)
  // Phase 5 - User presses play on their spiel (user)
  // Phase 6 - POST /calls/:id/instruction with the message id and play/pause (app)
  // Phase 7 - use the JWT (server)
  router.post('/remote/calls', async (req, res) => {})
  router.post('/remote/calls/speak', async (req, res) => {
    const callCode = req.body.callCode
    await twilio.playMessageInConference(
      Number(callCode),
      `${PUBLIC_ORIGIN}/api/webhooks/conference-update/${callCode}`,
    )
  })

  router.post('/webhooks/initiate-call', (req, res) => {
    const number = req.body.From
    const callId = req.body.CallSid
    log.info(`twilio call received from ${number} (${callId})`)
    res.set('Content-Type', 'text/xml')
    res.send(TwilioAgent.twimlPromptForCallCode(`${PUBLIC_ORIGIN}/api/webhooks/confirm-code`).twiml)
  })

  router.post('/webhooks/confirm-code', async (req, res) => {
    const number = req.body.From
    const code = req.body.Digits
    log.info(`twilio confirmation code received from ${number} - ${code}`)
    const callRecord = await twilio.confirmCallCode(code)
    const {twiml} = callRecord
      ? TwilioAgent.twimlCreateConferenceCall(
          `${PUBLIC_ORIGIN}/api/webhooks/conference-status/${callRecord.callCode}`,
          code,
        )
      : TwilioAgent.twimlHangup()
    res.set('Content-Type', 'text/xml')
    res.send(twiml)
  })

  router.post('/webhooks/conference-status/:callCode', async (req, res) => {
    log.info(`twilio conference status update ${req.body.StatusCallbackEvent}`)
    if (req.body.SequenceNumber !== '1') return res.sendStatus(204)

    await twilio.connectConferenceToNumber(req.body.ConferenceSid, Number(req.params.callCode))
    res.sendStatus(204)
  })

  router.post('/webhooks/conference-update/:callCode', async (req, res) => {
    const callCode = req.params.callCode
    const callRecord = await twilio.confirmCallCode(callCode)
    if (!callRecord) return res.sendStatus(500)
    res.set('Content-Type', 'text/xml')
    res.send(
      TwilioAgent.twimlPlayAudioFile(`${PUBLIC_ORIGIN}/api/webhooks/audio-file/${callCode}`).twiml,
    )
  })

  router.get('/webhooks/audio-file/:callCode', async (req, res) => {
    const callCode = req.params.callCode
    const callRecord = await twilio.confirmCallCode(callCode)
    if (!callRecord) return res.sendStatus(500)
    res.send(callRecord.messageAudio)
  })

  return router
}
