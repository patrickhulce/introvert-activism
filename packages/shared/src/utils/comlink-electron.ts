type PromiseFnOrNever<TFn> = TFn extends (...args: any[]) => Promise<infer U> ? TFn : never

export type PromiseInterface<TInterface> = {
  [K in keyof TInterface]: PromiseFnOrNever<TInterface[K]>
}

const MESSAGE_CHANNEL = '__comlink-electron__'

export enum ComlinkMessageType {
  ExecutionRequest = 'execution-request',
  ExecutionResult = 'execution-reply',
  Broadcast = 'broadcast',
}

export enum ComlinkTarget {
  RendererProcess = 'renderer',
  MainProcess = 'main-process',
  ServerWorker = 'server-worker',
}

interface ComlinkRequestMessage {
  type: ComlinkMessageType.ExecutionRequest
  executionId: number
  source: ComlinkTarget
  destination: ComlinkTarget
  fnName: string
  serializedArgs: string
}

interface ComlinkResultMessage {
  type: ComlinkMessageType.ExecutionResult
  executionId: number
  source: ComlinkTarget
  destination: ComlinkTarget
  error?: {message: string; stack?: string; name?: string}
  serializedResult?: string
}

interface ComlinkBroadcastMessage {
  type: ComlinkMessageType.Broadcast
  source: ComlinkTarget
}

type ComlinkElectronMessage = ComlinkRequestMessage | ComlinkResultMessage | ComlinkBroadcastMessage

export class ComlinkElectron {
  private _source: ComlinkTarget
  private _executionId: number

  public static get MESSAGE_CHANNEL(): string {
    return MESSAGE_CHANNEL
  }

  public constructor(source: ComlinkTarget) {
    this._source = source
    this._executionId = 1
  }

  private _serializeError(error: any): {message: string; stack?: string; name?: string} {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  private _waitForExecutionResult(
    ipcRenderer: import('electron').IpcRenderer | import('electron').IpcMain,
    id: number,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const listener = (event: import('electron').Event, reply: ComlinkElectronMessage) => {
        if (reply.type !== ComlinkMessageType.ExecutionResult) return
        if (reply.executionId !== id) return

        try {
          const {error, serializedResult} = reply
          if (error) {
            const err = Object.assign(new Error(), error)
            reject(err)
          } else if (typeof serializedResult === 'string') {
            resolve(this.deserialize(serializedResult))
          } else {
            resolve()
          }
        } catch (error) {
          reject(error)
        } finally {
          ipcRenderer.removeListener(MESSAGE_CHANNEL, listener)
        }
      }

      ipcRenderer.on(MESSAGE_CHANNEL, listener)
    })
  }

  public serialize(o: unknown): string {
    return JSON.stringify(o, (key, value) => {
      if (typeof value === 'function') throw new Error(`Cannot serialize function at ${key}`)
      if (value === undefined) throw new Error(`Cannot serialize \`undefined\` at ${key}`)
      if (Number.isNaN(value)) throw new Error(`Cannot serialize \`NaN\` at ${key}`)
      return value
    })
  }

  public deserialize(s: string): any {
    return JSON.parse(s)
  }

  /**
   * The method used to get a client for an interface.
   * @param sendChannel The message channel in the renderer process to communicate with
   * @param target The comlink target you're trying to talk to
   */
  public wrap<TInterface>(
    sendChannel: import('electron').IpcRenderer | import('electron').WebContents,
    receiveChannel: import('electron').IpcRenderer | import('electron').IpcMain,
    target: ComlinkTarget,
  ): PromiseInterface<TInterface> {
    const proxy: any = new Proxy(
      {},
      {
        get: (o: any, fnName: string) => {
          if (fnName === 'then') return undefined
          if (fnName === 'catch') return undefined
          if (fnName === 'finally') return undefined

          return (...args: any[]) => {
            const executionId = this._executionId++
            const message: ComlinkRequestMessage = {
              type: ComlinkMessageType.ExecutionRequest,
              executionId,
              source: this._source,
              destination: target,
              fnName,
              serializedArgs: this.serialize(args),
            }

            sendChannel.send(MESSAGE_CHANNEL, message)
            return this._waitForExecutionResult(receiveChannel, executionId)
          }
        },
      },
    )

    return proxy
  }

  public expose(
    ipcRendererChannel: import('electron').IpcRenderer,
    service: Record<any, any>,
  ): void {
    const listener = async (event: import('electron').Event, message: ComlinkElectronMessage) => {
      if (message.type !== ComlinkMessageType.ExecutionRequest) return
      const {fnName, source, destination, executionId, serializedArgs} = message
      if (destination !== this._source) return

      const reply: ComlinkResultMessage = {
        type: ComlinkMessageType.ExecutionResult,
        executionId,
        source: destination,
        destination: source,
      }
      try {
        if (typeof service[fnName] !== 'function') throw new Error(`No such method ${fnName}`)
        const deserializedArgs = this.deserialize(serializedArgs)
        const result = await service[fnName](...deserializedArgs)
        if (typeof result !== 'undefined') reply.serializedResult = this.serialize(result)
      } catch (error) {
        reply.error = this._serializeError(error)
      }

      ipcRendererChannel.send(MESSAGE_CHANNEL, reply)
    }

    const broadcast: ComlinkBroadcastMessage = {
      type: ComlinkMessageType.Broadcast,
      source: this._source,
    }

    ipcRendererChannel.on(MESSAGE_CHANNEL, listener)
    ipcRendererChannel.send(MESSAGE_CHANNEL, broadcast)
  }

  public relay(ipcMain: import('electron').IpcMain): void {
    const processes: Partial<Record<ComlinkTarget, import('electron').WebContents>> = {}

    ipcMain.on(
      MESSAGE_CHANNEL,
      (event: import('electron').IpcMainEvent, message: ComlinkElectronMessage) => {
        switch (message.type) {
          case ComlinkMessageType.Broadcast:
            processes[message.source] = event.sender
            event.sender.once('destroyed', () => {
              if (processes[message.source] === event.sender) processes[message.source] = undefined
            })
            break
          case ComlinkMessageType.ExecutionRequest: {
            const target = processes[message.destination]
            if (target) {
              target.send(MESSAGE_CHANNEL, message)
            } else {
              const reply: ComlinkResultMessage = {
                type: ComlinkMessageType.ExecutionResult,
                executionId: message.executionId,
                source: ComlinkTarget.MainProcess,
                destination: message.source,
                error: this._serializeError(
                  new Error(`Target "${message.destination}" not available`),
                ),
              }

              event.sender.send(MESSAGE_CHANNEL, reply)
            }
            break
          }
          case ComlinkMessageType.ExecutionResult: {
            const target = processes[message.destination]
            if (target) {
              target.send(MESSAGE_CHANNEL, message)
            }
            break
          }
        }
      },
    )
  }
}
