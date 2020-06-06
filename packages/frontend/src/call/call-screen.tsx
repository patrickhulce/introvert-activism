import * as React from 'react'

import type * as Api from '../../../shared/src/utils/api'

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (response.status !== 200) throw new Error(`Failed to fetch: ${await response.text()}`)
  return response.json()
}

function _arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

export const MakeACall = (): JSX.Element => {
  const [callCode, setCallCode] = React.useState(false)
  return (
    <div>
      <h1>MakeACall</h1>
      <h2>Call code is {callCode}</h2>
      <button
        disabled={!!callCode}
        onClick={async () => {
          const {
            payload: {messages},
          } = await fetchJSON<Api.ResponseTypes['Messages']>('/api/messages')
          console.log(messages)
          const audioResponse = await fetch(`/api/messages/${messages[0].uuid}/audio`)
          const audioBase64 = _arrayBufferToBase64(await audioResponse.arrayBuffer())
          const createResponse = await fetch(`/api/remote/calls`, {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({
              jwt: 'blacklivesmatter',
              targetNumber: '+15558675309',
              messageId: messages[0].uuid,
              messageAudioBase64: audioBase64,
            }),
          })

          setCallCode((await createResponse.json()).callCode)
        }}>
        Call
      </button>
      <button
        disabled={!callCode}
        onClick={async () => {
          await fetch('/api/remote/calls/speak', {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({
              jwt: 'blacklivesmatter',
              callCode,
            }),
          })
        }}>
        Speak
      </button>
    </div>
  )
}
