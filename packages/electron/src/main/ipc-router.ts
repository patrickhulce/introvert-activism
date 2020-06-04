import {BrowserWindow, ipcMain, IpcMainEvent} from 'electron'

import {
  ComlinkTarget,
  PromiseInterface,
  ComlinkElectron,
} from '../../../shared/src/utils/comlink-electron'

const comlink = new ComlinkElectron(ComlinkTarget.MainProcess)

const WORKERS: Record<ComlinkTarget, string> = {
  [ComlinkTarget.MainProcess]: 'NOT_IMPLEMENETED',
  [ComlinkTarget.RendererProcess]: 'NOT_IMPLEMENETED',
  [ComlinkTarget.ServerWorker]: require.resolve('../worker/server/server'),
}

export function initIpcRouter(): void {
  comlink.relay(ipcMain)
}

export async function createWorker<TInterface extends PromiseInterface<any>>(
  target: ComlinkTarget,
): Promise<TInterface> {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
    },
  })

  const filePath = WORKERS[target]
  const file = `<!DOCTYPE html><html><script>require(${JSON.stringify(filePath)})</script></html>`
  window.loadURL(`data:text/html;base64,${Buffer.from(file).toString('base64')}`)

  await new Promise(resolve => {
    const messageChannel = ComlinkElectron.MESSAGE_CHANNEL as any
    const listener = (event: IpcMainEvent) => {
      if (event.sender !== window.webContents) return
      resolve()
      ipcMain.off(messageChannel, listener)
    }

    ipcMain.on(messageChannel, listener)
  })

  return comlink.wrap<TInterface>(window.webContents, ipcMain, target)
}
