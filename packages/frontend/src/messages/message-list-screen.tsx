import * as React from 'react'

import type * as Api from '../../../shared/src/utils/api'

export const MessageList = (): JSX.Element => {
  const [data, setData] = React.useState<Api.MessagesPayload>({
    messages: [],
  })

  React.useEffect(() => {
    ;(async () => {
      const response = (await (
        await fetch('/api/messages')
      ).json()) as Api.ResponseTypes['Messages']
      setData(response.payload)
    })()
  }, [])

  return (
    <>
      {data.messages.map(message => {
        return (
          <div key={message.uuid}>
            {message.display_name}–duration {message.duration}
          </div>
        )
      })}
    </>
  )
}
