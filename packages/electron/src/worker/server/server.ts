import {createServer} from 'http'

import bodyParser from 'body-parser'
import {ipcRenderer} from 'electron'
import express from 'express'

import {createApiRouter} from '../../../../api/src/api'
import {
  ComlinkElectron,
  ComlinkTarget,
  PromiseInterface,
} from '../../../../shared/src/utils/comlink-electron'
import {createLogger} from '../../../../shared/src/utils/logging'
import {findFrontendDirectory} from '../../utils/filesystem'

const log = createLogger('electron:server')

async function startServer(localFilePath: string): Promise<{port: number; close(): void}> {
  const app = express()
  const router = createApiRouter(localFilePath)

  app.use(bodyParser.json({limit: '10mb'}))
  app.use(bodyParser.urlencoded({extended: true}))
  app.use(bodyParser.raw({type: 'audio/*', limit: '10mb'}))

  app.use('/static', express.static(findFrontendDirectory()))
  app.use('/api', router)

  return new Promise(resolve => {
    const server = createServer(app)
    server.listen(8675, () => {
      const address = server.address()
      if (typeof address === 'string' || !address) throw new Error(`Invalid address ${address}`)
      log.info(`app server available on port ${address.port}`)
      resolve({port: address.port, close: () => server.close()})
    })
  })
}

const service = {
  port: 0,
  close() {},
  startServer: async (path: string) => {
    service.close()
    const {port, close} = await startServer(path)
    service.port = port
    service.close = close
    return {port}
  },
  closeServer: async () => {
    service.close()
  },
}

export type ServerWorker = PromiseInterface<typeof service>

new ComlinkElectron(ComlinkTarget.ServerWorker).expose(ipcRenderer, service)
