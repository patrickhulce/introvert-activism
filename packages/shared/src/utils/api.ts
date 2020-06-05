export interface Response<T> {
  success: boolean
  payload: T
}

export interface ResponseTypes {
  Messages: Response<MessagesPayload>
  Message: Response<MessagePayload>
  Audio: Response<AudioFile>
}

export interface Message {
  uuid: string
  display_name: string
  file_path: string
  duration: number
}

export interface AudioFile {
  data: string
}

export interface MessagesPayload {
  messages: Message[]
}

export interface MessagePayload {
  message: Message
}

export interface AudioPayload {
  audio: AudioFile
}
