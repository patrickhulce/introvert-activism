import {autoUpdater} from 'electron-updater'

import {createLogger} from '../../../shared/src/utils/logging'

const log = createLogger('electron:autoupdate')

export function checkForUpdates(): void {
  autoUpdater.logger = log
  autoUpdater.checkForUpdatesAndNotify()
}
