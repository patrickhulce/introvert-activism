import express from 'express'

export function createApiRouter(): express.Router {
  const router = express.Router()

  router.get('/version', (req, res) => res.json({version: 1}))

  return router
}
