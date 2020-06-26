import {app, BrowserWindow, dialog} from 'electron'

import {ComlinkTarget} from '../../../shared/src/utils/comlink-electron'
import {createLogger} from '../../../shared/src/utils/logging'
import {ServerWorker} from '../worker/server/server'

import {checkForUpdates} from './autoupdate'
import {createWorker, initIpcRouter} from './ipc-router'

const log = createLogger('electron:main')

async function run() {
  log.info('app is ready')
  initIpcRouter()
  const serverWorker = await createWorker<ServerWorker>(ComlinkTarget.ServerWorker)

  const {port} = await serverWorker.startServer(app.getPath('userData'))

  const window = new BrowserWindow({
    show: false,
    minWidth: 800,
    minHeight: 600,
    width: 1080,
    height: 720,
  })

  window.loadURL(`http://localhost:${port}/static/`)
  window.once('ready-to-show', () => {
    log.info('app is visible')
    window.show()
  })

  checkForUpdates()
}

app.once('ready', () => {
  run().catch(err => {
    dialog.showMessageBoxSync({
      message: `Introvert Activism encountered an error: ${err.message}`,
      type: 'error',
    })
    log.error(err)
    process.exit(1)
  })
})
