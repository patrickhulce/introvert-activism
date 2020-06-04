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

  return router
}
