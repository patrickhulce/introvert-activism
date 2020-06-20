import * as React from 'react'

import {Typography, Button} from '@material-ui/core'
import {Link as RouterLink} from 'react-router-dom'

import type * as Api from '../../../shared/src/utils/api'

const Message = (props: {
  message: Api.Message
  history: import('react-router-dom').RouteChildrenProps['history']
}) => {
  const [audio, setAudio] = React.useState<HTMLAudioElement | null>(null)

  React.useEffect(() => {
    return () => {
      if (audio) {
        audio.pause()
      }
    }
  }, [audio])

  return (
    <>
      <Typography variant="body1" style={{marginTop: 20}}>
        {props.message.display_name}
      </Typography>
      <Typography variant="body1" style={{marginTop: 20}}>
        {props.message.script}
      </Typography>
      <div style={{marginTop: 20}}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            if (audio) {
              audio.pause()
              setAudio(null)
            } else {
              const audioEl = new Audio(`/api/messages/${props.message.uuid}/audio`)
              audioEl.play()
              setAudio(audioEl)
            }
          }}
          style={{marginRight: 10}}>
          {audio ? 'Stop' : 'Play'}
        </Button>
        <Button
          variant="contained"
          component={RouterLink}
          to={`/messages`}
          color="default"
          style={{marginRight: 10}}>
          Back to Messages
        </Button>
        <Button
          variant="contained"
          onClick={async () => {
            await fetch(`/api/messages/${props.message.uuid}`, {
              method: 'DELETE',
            })
            props.history.push('/messages')
          }}
          color="secondary">
          Delete
        </Button>
      </div>
    </>
  )
}

export const MessageDetail = (
  props: import('react-router-dom').RouteChildrenProps<{id: string}>,
): JSX.Element => {
  const messageId = props.match?.params?.id
  const [data, setData] = React.useState<Api.Message | null>(null)
  const [errorMessage, setErrorMessage] = React.useState('')

  async function reloadMessage(id: string) {
    setData(null)
    const response = await fetch(`/api/messages/${id}`)
    if (!response.ok) return setErrorMessage(`API failure: ${await response.text()}`)
    setData((await response.json()).payload.message)
  }

  React.useEffect(() => {
    reloadMessage(messageId || '')
  }, [messageId])

  return (
    <>
      <Typography variant="h4" style={{marginTop: 20}}>
        Message Details
      </Typography>
      {errorMessage ? (
        <Typography variant="body1" style={{color: 'red', fontWeight: 'bold'}}>
          ERROR: {errorMessage}
        </Typography>
      ) : null}
      {data ? <Message message={data} history={props.history} /> : null}
    </>
  )
}
