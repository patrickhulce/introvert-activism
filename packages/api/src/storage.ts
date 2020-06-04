import fs from 'fs'
import path from 'path'

import type * as Api from '../../shared/src/utils/api'
import {createLogger} from '../../shared/src/utils/logging'

export class LocalApiStore {
  _localFsPath: string
  _messagesPath: string
  constructor(localPath: string, folder?: string) {
    folder = folder || 'App_File_Storage'
    this._localFsPath = path.join(localPath, folder)
    // Init the directories
    if (!fs.existsSync(this._localFsPath)) {
      fs.mkdirSync(this._localFsPath)
    }
    // Init the 'messages' dir.
    if (!fs.existsSync(path.join(this._localFsPath, 'messages'))) {
      fs.mkdirSync(path.join(this._localFsPath, 'messages'))
    }
    // Init the 'message.json' file if none exists.
    if (!fs.existsSync(path.join(this._localFsPath, 'messages/messages.json'))) {
      // TODO: one big file, or a lot of little small files?
      const singleMsg = {
        messages: [], // TODO: map, keyed on uuid?
      }
      fs.writeFileSync(
        path.join(this._localFsPath, 'messages/messages.json'),
        JSON.stringify(singleMsg),
      )
    }
    // Set the final resting place for the messages file.
    this._messagesPath = path.join(this._localFsPath, 'messages/messages.json')
    createLogger('info').info(`Using local fs dir: ${this._localFsPath}`)
  }

  getMessages() {
    // Parse the messages file.
    if (!fs.existsSync(this._messagesPath)) {
      throw new Error('Not Found')
    }

    const file = JSON.parse(
      fs.readFileSync(this._messagesPath, {
        encoding: 'utf8',
        flag: 'r',
      }),
    )

    return file.messages
  }

  postMessage(message: Api.Message) {
    // Parse the messages file.
    if (!fs.existsSync(this._messagesPath)) {
      throw new Error('Not Found')
    }

    const messages = JSON.parse(
      fs.readFileSync(this._messagesPath, {
        encoding: 'utf8',
        flag: 'r',
      }),
    )

    // Add our new message to the messages array.
    messages.messages.push(message)

    fs.writeFileSync(this._messagesPath, JSON.stringify(messages))
  }
}
