import express from 'express'

import type * as Api from '../../shared/src/utils/api'

function makeResponse<T>(payload: T): Api.Response<T> {
  return {
    success: true,
    payload,
  }
}

export function createApiRouter(): express.Router {
  const router = express.Router()

  router.get('/version', (req, res) => res.json({version: 1}))

  router.get('/messages', (req, res) => {
    const messages = [
      {uuid: '001', display_name: 'Message 1', file_path: '', duration: 21},
      {uuid: '002', display_name: 'Message 2', file_path: '', duration: 22},
    ]
    res.json(
      makeResponse<Api.MessagesPayload>({messages}),
    )
  })

  router.post('/messages', (req, res) => {
    res.status(201).end()
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
