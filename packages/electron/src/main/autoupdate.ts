import * as os from 'os'

import {autoUpdater} from 'electron-updater'

import {createLogger} from '../../../shared/src/utils/logging'

const log = createLogger('electron:autoupdate')

export function checkForUpdates(): void {
  if (os.platform() === 'darwin') {
    log.warn('macOS does not support unsigned autoupdates')
    return
  }

  autoUpdater.logger = log
  autoUpdater.checkForUpdatesAndNotify()
}
