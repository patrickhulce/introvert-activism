import {createServer} from 'http'

import {ipcRenderer} from 'electron'
import express from 'express'

import {
  ComlinkElectron,
  ComlinkTarget,
  PromiseInterface,
} from '../../../../shared/src/utils/comlink-electron'
import {createLogger} from '../../../../shared/src/utils/logging'
import {findFrontendDirectory} from '../../utils/filesystem'

const log = createLogger('electron:server')

async function startServer(): Promise<{port: number; close(): void}> {
  const app = express()

  app.use('/static', express.static(findFrontendDirectory()))

  return new Promise(resolve => {
    const server = createServer(app)
    server.listen(0, () => {
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
  startServer: async () => {
    service.close()
    const {port, close} = await startServer()
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
