import fs from 'fs'
import path from 'path'

import type * as Api from '../../shared/src/utils/api'
import {createLogger} from '../../shared/src/utils/logging'

export class LocalApiStore {
  _localFsPath: string
  _messagesPath: string
  _audioDir: string
  constructor(localPath: string, folder?: string) {
    folder = folder || 'App_File_Storage'
    this._localFsPath = path.join(localPath, folder)
    // Init the directories
    fs.mkdirSync(path.join(this._localFsPath, 'messages'), {recursive: true})
    fs.mkdirSync(path.join(this._localFsPath, 'audio'), {recursive: true})
    // Init the 'message.json' file if none exists.
    if (!fs.existsSync(path.join(this._localFsPath, 'messages/messages.json'))) {
      // TODO: one big file, or a lot of little small files?
      const singleMsg = {
        messages: {},
      }
      fs.writeFileSync(
        path.join(this._localFsPath, 'messages/messages.json'),
        JSON.stringify(singleMsg),
      )
    }
    // Set the final resting place for the messages file.
    this._messagesPath = path.join(this._localFsPath, 'messages/messages.json')
    this._audioDir = path.join(this._localFsPath, 'audio')
    createLogger('info').info(`Using local fs dir: ${this._localFsPath}`)
  }

  getMessages(): Array<Api.Message> {
    // Parse the messages file.
    if (!fs.existsSync(this._messagesPath)) {
      throw new Error('Not Found')
    }

    const file = JSON.parse(fs.readFileSync(this._messagesPath, 'utf8'))

    const msgs = Object.values(file.messages as Api.Message)

    return msgs
  }

  /**
   * Get a message.
   * @param uuid UUID of message to delete.
   * @returns
   */
  getMessage(uuid: string): Api.Message | null {
    // Parse the messages file.
    if (!fs.existsSync(this._messagesPath)) {
      throw new Error('Not Found')
    }

    const file = JSON.parse(fs.readFileSync(this._messagesPath, 'utf8'))

    // Collapse key'd object into array.
    const message = file.messages[uuid]
    if (!message) {
      return null
    }

    return message
  }

  postMessage(message: Api.Message): void {
    if (!fs.existsSync(this._messagesPath)) {
      throw new Error('Not Found')
    }
    // TODO: Protect 'file_path' field.

    // Parse the messages file.
    const messages = JSON.parse(fs.readFileSync(this._messagesPath, 'utf8'))

    // Add our new message to the messages array.
    messages.messages[`${message.uuid}`] = message

    fs.writeFileSync(this._messagesPath, JSON.stringify(messages))
  }

  /**
   * Delete a message.
   * @param uuid UUID of message to delete.
   * @returns boolean if deleted successfully
   */
  async deleteMessage(uuid: string): Promise<boolean> {
    if (!fs.existsSync(this._messagesPath)) {
      throw new Error('Not Found')
    }

    // Parse the messages file.
    const messages = JSON.parse(fs.readFileSync(this._messagesPath, 'utf8'))

    // Check that this object exists
    if (!messages.messages[uuid]) {
      return false
    }

    const msg = messages.messages[uuid]
    // Cascade delete any audio files.
    if (msg.file_path) {
      const audioFilePath = path.join(this._audioDir, msg.file_path)
      if (fs.existsSync(audioFilePath)) fs.unlinkSync(audioFilePath)
    }

    // Remove our message from the messages object.
    delete messages.messages[uuid]

    fs.writeFileSync(this._messagesPath, JSON.stringify(messages))
    return true
  }

  putMessage(messageId: string, message: Api.Message): Api.Message | undefined {
    if (!fs.existsSync(this._messagesPath)) {
      throw new Error('Not Found')
    }
    // TODO: Protect 'file_path' field.

    // Parse the messages file.
    const messages = JSON.parse(fs.readFileSync(this._messagesPath, 'utf8'))

    // Get our message to the messages array.
    let tmpMessage = messages.messages[messageId]
    if (!tmpMessage) {
      return
    }
    tmpMessage = {...tmpMessage, ...message}

    messages.messages[messageId] = tmpMessage

    fs.writeFileSync(this._messagesPath, JSON.stringify(messages))
    return tmpMessage
  }

  async getAudio(messageId: string): Promise<Buffer | undefined> {
    const message = await this.getMessage(messageId)
    if (!message) {
      return // TODO: error handle
    }
    const filePath = message.file_path
    if (!filePath) {
      return // TODO: error handle
    }

    const audio = fs.readFileSync(path.join(this._audioDir, filePath))
    if (!audio) {
      return // TODO: error handle
    }
    return audio
  }

  async putAudio(messageId: string, audio: Buffer): Promise<void> {
    const messages = JSON.parse(fs.readFileSync(this._messagesPath, 'utf8'))

    // Get our message to the messages array.
    const tmpMessage = messages.messages[messageId]
    if (!tmpMessage) {
      throw new Error(`Could not find message with id ${messageId}`)
    }

    // Set file_path
    const originalFilePath = `${tmpMessage.uuid}.webm`
    tmpMessage.file_path = originalFilePath
    fs.writeFileSync(path.join(this._audioDir, originalFilePath), audio)

    // Rewrite the message
    messages.messages[messageId] = tmpMessage
    fs.writeFileSync(this._messagesPath, JSON.stringify(messages))
    return tmpMessage
  }
}
