import bodyParser from 'body-parser'
import express from 'express'
import fetch from 'isomorphic-fetch'
import * as jwt from 'jsonwebtoken'
import {v4 as uuidv4} from 'uuid'

import type * as Api from '../../shared/src/utils/api'
import {createLogger} from '../../shared/src/utils/logging'

import {LocalApiStore} from './storage'
import {TwilioAgent} from './twilio'

const FALLBACK_ORIGIN = 'https://api.introvertactivism.org'
const PUBLIC_INTERNET_PREFIX = process.env.PUBLIC_INTERNET_PREFIX || FALLBACK_ORIGIN
const REMOTE_PROXY_DESTINATION = process.env.REMOTE_PROXY_DESTINATION || FALLBACK_ORIGIN
const JWT_SECRET = process.env.JWT_SECRET || ''
const TARGET_NUMBER_OVERRIDE = process.env.TWILIO_TEST_CALL_NUMBER || ''

function makeResponse<T>(payload: T): Api.Response<T> {
  return {
    success: true,
    payload,
  }
}

const log = createLogger('api:router')

function createHandler(
  fn: (req: express.Request, res: express.Response) => Promise<any>,
): (req: express.Request, res: express.Response) => void {
  return (req, res) =>
    fn(req, res).catch(err => {
      log.error(err)
      res.sendStatus(500)
    })
}

function createMessagesRouter(localMessageStoragePath: string): express.Router {
  const router = express.Router()
  const store = new LocalApiStore(localMessageStoragePath)

  router.get(
    '/',
    createHandler(async (req, res) => {
      const messages = await store.getMessages()
      res.json(
        makeResponse<Api.MessagesPayload>({messages: messages}),
      )
    }),
  )

  router.post(
    '/',
    createHandler(async (req, res) => {
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
    }),
  )

  router.get(
    '/:messageId',
    createHandler(async (req, res) => {
      const messageId = req.params.messageId
      const message = await store.getMessage(messageId)
      if (!message) {
        res.status(404).end()
        return
      }
      res.json(
        makeResponse<Api.MessagePayload>({message}),
      )
    }),
  )

  router.put(
    '/:messageId',
    createHandler(async (req, res) => {
      const messageId = req.params.messageId
      // Remove uneditable content if exists.
      const body = req.body
      delete body.uuid

      const message = await store.putMessage(messageId, body)
      if (!message) return res.sendStatus(404)
      res.status(200).json(
        makeResponse<Api.MessagePayload>({message}),
      )
    }),
  )

  router.get(
    '/:messageId/audio',
    createHandler(async (req, res) => {
      // Special MessagePaylod that is not json, only bin'd file.
      const audio = await store.getAudio(req.params.messageId)
      if (!audio) {
        res.status(404).end()
      }
      res.status(200).set('content-type', 'audio/mpeg').send(audio)
    }),
  )

  router.put(
    '/:messageId/audio',
    createHandler(async (req, res) => {
      const body = req.body
      await store.putAudio(req.params.messageId, body)
      res.status(204).end()
    }),
  )

  router.delete(
    '/:messageId',
    createHandler(async (req, res) => {
      const del = await store.deleteMessage(req.params.messageId)
      if (!del) {
        res.status(500).end()
        return
      }
      res.status(204).end()
      return
    }),
  )

  return router
}

export function initializeMiddleware(router: express.Router | express.Application): void {
  router.use(bodyParser.json({limit: '10mb'}))
  router.use(bodyParser.urlencoded({extended: true}))
  router.use(bodyParser.raw({type: 'audio/*', limit: '10mb'}))

  router.use((req, res, next) => {
    const start = Date.now()
    log.verbose('⇨', req.method, req.originalUrl)
    res.once('finish', () => {
      let logFn = log.info
      if (res.statusCode >= 400) logFn = log.warn
      if (res.statusCode >= 500) logFn = log.error
      logFn('⇦', req.method, req.originalUrl, res.statusCode, `${Date.now() - start}ms`)
    })
    next()
  })
}

function validateJwtMiddleware(): (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => void {
  return (req, res, next) => {
    const rawToken = req.body?.jwt || req.header('authorization') || ''
    const token = rawToken.replace(/^bearer\s+/i, '').trim()
    jwt.verify(token, JWT_SECRET, {ignoreExpiration: true}, err => {
      if (!err) return next()
      res.sendStatus(403)
    })
  }
}

export function createCallRouter(): {
  router: express.Router
  twilio: TwilioAgent
} {
  const twilio = new TwilioAgent()
  const router = express.Router()

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
  router.post(
    '/calls',
    validateJwtMiddleware(),
    createHandler(async (req, res) => {
      const {jwt, targetNumber, messageId, messageAudioBase64} = req.body
      const convertedAudio = await TwilioAgent.convertToMp3Buffer(
        Buffer.from(messageAudioBase64, 'base64'),
        'audio/webm',
      )

      const callRecord = await twilio.createCallRecord({
        jwt,
        targetNumber: TARGET_NUMBER_OVERRIDE || targetNumber,
        messageId,
        messageAudio: convertedAudio,
        storedAt: new Date(),
      })

      log.info(`created call record ${callRecord.callCode}`)
      res.json({callCode: callRecord.callCode, twilioNumber: callRecord.twilioNumber})
    }),
  )

  router.get(
    '/calls/:callCode/status',
    validateJwtMiddleware(),
    createHandler(async (req, res) => {
      const callCode = req.params.callCode
      const timeout = Number(req.query && req.query.timeout) || 30000
      const startTime = Date.now()

      let callRecord = undefined
      while (Date.now() - startTime < timeout) {
        callRecord = await twilio.confirmCallCode(callCode)
        if (!callRecord) break
        if (callRecord.sourceNumber) break
        await new Promise(r => setTimeout(r, 100))
      }

      res.json({
        started: Boolean(callRecord?.sourceNumber),
        completed: !callRecord,
      })
    }),
  )

  router.post(
    '/calls/:callCode/speak',
    validateJwtMiddleware(),
    createHandler(async (req, res) => {
      const callCode = Number(req.params.callCode)
      const {jwt} = req.body
      const callRecord = await twilio.confirmCallCode(callCode)
      if (!callRecord || callRecord.jwt !== jwt) return res.sendStatus(204)
      log.info(`playing message in call ${callCode}`)
      await twilio.updateConferenceWithAction(
        Number(callCode),
        `${PUBLIC_INTERNET_PREFIX}/webhooks/conference-update/${callCode}/play`,
      )

      res.sendStatus(204)
    }),
  )

  router.post(
    '/calls/:callCode/stop',
    validateJwtMiddleware(),
    createHandler(async (req, res) => {
      const callCode = Number(req.params.callCode)
      const {jwt} = req.body
      const callRecord = await twilio.confirmCallCode(callCode)
      if (!callRecord || callRecord.jwt !== jwt) return res.sendStatus(204)
      log.info(`stopping message in call ${callCode}`)
      await twilio.updateConferenceWithAction(
        Number(callCode),
        `${PUBLIC_INTERNET_PREFIX}/webhooks/conference-update/${callCode}/stop`,
      )

      res.sendStatus(204)
    }),
  )

  router.post(
    '/webhooks/initiate-call',
    createHandler(async (req, res) => {
      const number = req.body.From
      const callId = req.body.CallSid
      log.info(`twilio call received from ${number} (${callId})`)
      res.set('Content-Type', 'text/xml')
      res.send(
        TwilioAgent.twimlPromptForCallCode(`${PUBLIC_INTERNET_PREFIX}/webhooks/confirm-code`).twiml,
      )
    }),
  )

  router.post(
    '/webhooks/confirm-code',
    createHandler(async (req, res) => {
      const number = req.body.From
      const code = req.body.Digits
      log.info(`twilio confirmation code received from ${number} - ${code}`)
      const callRecord = await twilio.confirmCallCode(code)
      const {twiml} = callRecord
        ? TwilioAgent.twimlCreateConferenceCall(
            `${PUBLIC_INTERNET_PREFIX}/webhooks/conference-status/${callRecord.callCode}`,
            code,
          )
        : TwilioAgent.twimlHangup()
      res.set('Content-Type', 'text/xml')
      res.send(twiml)
    }),
  )

  router.post(
    '/webhooks/conference-status/:callCode',
    createHandler(async (req, res) => {
      log.info(`twilio conference status update ${req.body.StatusCallbackEvent}`)
      if (req.body.StatusCallbackEvent === 'conference-end') {
        await twilio.destroyCallRecord(req.params.callCode)
        return
      }

      if (req.body.SequenceNumber !== '1') return res.sendStatus(204)

      await twilio.connectConferenceToNumber(req.body.ConferenceSid, Number(req.params.callCode))
      res.sendStatus(204)
    }),
  )

  router.post(
    '/webhooks/conference-update/:callCode/play',
    createHandler(async (req, res) => {
      const callCode = req.params.callCode
      const callRecord = await twilio.confirmCallCode(callCode)
      if (!callRecord) return res.sendStatus(500)
      res.set('Content-Type', 'text/xml')
      res.send(
        TwilioAgent.twimlPlayAudioFile(`${PUBLIC_INTERNET_PREFIX}/webhooks/audio-file/${callCode}`)
          .twiml,
      )
    }),
  )

  router.post(
    '/webhooks/conference-update/:callCode/stop',
    createHandler(async (req, res) => {
      const callCode = req.params.callCode
      const callRecord = await twilio.confirmCallCode(callCode)
      if (!callRecord) return res.sendStatus(500)
      res.set('Content-Type', 'text/xml')
      res.send(TwilioAgent.twimlSilence().twiml)
    }),
  )

  router.get(
    '/webhooks/audio-file/:callCode',
    createHandler(async (req, res) => {
      const callCode = req.params.callCode
      const callRecord = await twilio.confirmCallCode(callCode)
      if (!callRecord) return res.sendStatus(500)
      res.set('Content-Type', 'audio/mpeg')
      res.send(callRecord.messageAudio)
    }),
  )

  return {twilio, router}
}

function createProxyRouter(): express.Router {
  const router = express.Router()

  router.use(async (req, res) => {
    let destination = req.header('x-remote-proxy-destination') || REMOTE_PROXY_DESTINATION
    if (destination.endsWith('/')) destination = destination.slice(0, destination.length - 1)
    destination = `${destination}${req.path}`

    const headers: Record<string, string> = {}
    const options: RequestInit = {method: req.method, headers}
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization
    }
    if (req.body) {
      headers['content-type'] = 'application/json'
      const body = {...req.body}
      if (TARGET_NUMBER_OVERRIDE && body.targetNumber) body.targetNumber = TARGET_NUMBER_OVERRIDE
      options.body = JSON.stringify(body)
    }

    log.info('proxying', req.path, 'to', destination)
    const response = await fetch(destination, options)
    log.info('proxy response received', response.status, response.url)
    if (response.status === 200) res.json(await response.json())
    else if (response.status === 204) res.sendStatus(204)
    else res.status(response.status).send(await response.text())
  })

  return router
}

export interface LocalRouterOptions {
  remoteBehavior: 'proxy' | 'ngrok'
  localMessageStoragePath: string
}

export function createLocalRouter(options: LocalRouterOptions): express.Router {
  const router = express.Router()
  const {router: callRouter} = createCallRouter()
  const proxyRouter = createProxyRouter()
  const messagesRouter = createMessagesRouter(options.localMessageStoragePath)
  const remoteRouter = options.remoteBehavior === 'ngrok' ? callRouter : proxyRouter

  router.get('/version', (req, res) => res.json({version: 1}))
  router.use('/messages', messagesRouter)
  router.use('/remote', remoteRouter)

  return router
}
