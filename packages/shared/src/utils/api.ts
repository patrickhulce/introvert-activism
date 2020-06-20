export interface Response<T> {
  success: boolean
  payload: T
}

export interface ResponseTypes {
  Messages: Response<MessagesPayload>
  Message: Response<MessagePayload>
}

export interface Message {
  uuid: string
  display_name: string
  file_path: string
  script: string
}

export interface MessagesPayload {
  messages: Message[]
}

export interface MessagePayload {
  message: Message
}
