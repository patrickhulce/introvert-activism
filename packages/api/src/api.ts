import express from 'express'
import {v4 as uuidv4} from 'uuid'

import type * as Api from '../../shared/src/utils/api'
import {LocalApiStore} from './storage'

function makeResponse<T>(payload: T): Api.Response<T> {
  return {
    success: true,
    payload,
  }
}

export function createApiRouter(localPath: string): express.Router {
  const router = express.Router()
  const store = new LocalApiStore(localPath)

  router.get('/version', (req, res) => res.json({version: 1}))

  router.get('/messages', async (req, res) => {
    const messages = await store.getMessages()
    res.json(
      makeResponse<Api.MessagesPayload>({messages}),
    )
  })

<<<<<<< HEAD
  router.post('/messages', (req, res) => {
    res.status(201).end()
=======
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
>>>>>>> master
  })

  router.get('/messages/:messageId', (req, res) => {
    const messageId = req.params.messageId
    // Fake response.
    const message = {uuid: messageId, display_name: 'Message 1', file_path: '', duration: 21}
    res.json(
      makeResponse<Api.MessagePayload>({message}),
    )
  })

  router.put('/messages/:messageId', (req, res) => {
    res.status(204).end()
  })

  router.get('/messages/:messageId/audio', (req, res) => {
    // Special MessagePaylod that is not json, only bin'd file.
    res.status(200).end()
  })

  router.put('/messages/:messageId/audio', (req, res) => {
    res.status(204).end()
  })

  router.delete('/messages/:messageId', (req, res) => {
    res.status(204).end()
  })

  return router
}
