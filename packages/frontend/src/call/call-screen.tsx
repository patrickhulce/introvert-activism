import * as React from 'react'

import Avatar from '@material-ui/core/Avatar'
import Button from '@material-ui/core/Button'
import IconButton from '@material-ui/core/IconButton'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemAvatar from '@material-ui/core/ListItemAvatar'
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction'
import ListItemText from '@material-ui/core/ListItemText'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'
import {makeStyles, Theme, createStyles} from '@material-ui/core/styles'
import ChatIcon from '@material-ui/icons/Chat'
import PlayIcon from '@material-ui/icons/PlayArrow'

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

enum Phase {
  GetLocation,
  GetRepresentative,
  GetMessage,
  Precall,
  Midcall,
  Postcall,
}

interface CallOptions {
  zipcode: string
  representativeId: string
  numberToCall: string
  messageId: string
}

interface Representative {
  id: string
  name: string
  party: string
  photoURL: string
  reason: string
  phone: string
  field_offices: Array<{phone: string; city: string}>
}

interface ChildProps {
  phase: Phase
  setPhase: (p: Phase) => void
  options: CallOptions
  setOptions: (o: CallOptions) => void
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      overflow: 'auto',
    },
    containerSection: {
      marginTop: theme.spacing(2),
      maxWidth: 600,
    },
    zipcodeFormLine: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      margin: theme.spacing(2),
    },
    zipcodeButton: {
      marginLeft: theme.spacing(2),
    },
    representativeList: {
      overflow: 'auto',
      maxHeight: '40vh',
    },
    textAlign: {
      textAlign: 'center',
    },
  }),
)

const GetLocation = (props: ChildProps) => {
  const classes = useStyles()
  const [zip, setZip] = React.useState('')
  return (
    <div className={classes.containerSection}>
      <Typography variant="h5" className={classes.textAlign}>
        Find Your Representatives
      </Typography>
      <form
        onSubmit={evt => {
          if (props.phase === Phase.GetLocation) props.setOptions({...props.options, zipcode: zip})
          else {
            props.setOptions({zipcode: '', representativeId: '', numberToCall: '', messageId: ''})
            setZip('')
          }
          evt.preventDefault()
        }}>
        <div className={classes.zipcodeFormLine}>
          <TextField
            id="zipcode-basic"
            label="Zipcode"
            variant="outlined"
            value={zip}
            disabled={props.phase !== Phase.GetLocation}
            onChange={e => setZip(e.target.value)}
          />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            className={classes.zipcodeButton}>
            {props.phase === Phase.GetLocation ? 'Continue' : 'Edit'}
          </Button>
        </div>
      </form>
    </div>
  )
}

const GetRepresentative = (props: ChildProps) => {
  const classes = useStyles()
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null)
  const [reps, setReps] = React.useState<Array<Representative> | undefined>(undefined)

  React.useEffect(() => {
    if (props.phase !== Phase.GetRepresentative) return
    fetchJSON<{representatives?: Array<Representative>}>(
      `https://api.5calls.org/v1/reps?location=${props.options.zipcode}`,
    )
      .then(response => {
        if (response.representatives) setReps(response.representatives)
        else throw new Error(`No representatives available ${JSON.stringify(response)}`)
      })
      .catch(err => setErrorMessage(`Sorry an error occurred! ${err.message}`))
  }, [props.options.zipcode, props.phase])

  if (props.phase < Phase.GetRepresentative) return <></>

  return (
    <div className={classes.containerSection}>
      <Typography variant="h5" className={classes.textAlign}>
        Who do you want to call?
      </Typography>
      {errorMessage ? <span>ERROR: {errorMessage}</span> : null}
      {reps ? (
        <div className={classes.representativeList}>
          <List>
            {reps
              .filter(
                rep => !props.options.representativeId || rep.id === props.options.representativeId,
              )
              .map(rep => (
                <ListItem
                  key={rep.id}
                  button
                  onClick={() =>
                    props.setOptions({
                      ...props.options,
                      representativeId: rep.id,
                      numberToCall: rep.phone,
                    })
                  }>
                  <ListItemAvatar>
                    <Avatar src={rep.photoURL} alt={rep.name}></Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${rep.name} (${rep.party || 'unknown'})`}
                    secondary={`${rep.reason} - ${rep.phone}`}
                  />
                </ListItem>
              ))}
          </List>
        </div>
      ) : (
        <span>Loading...</span>
      )}
    </div>
  )
}

const GetMessage = (props: ChildProps) => {
  const classes = useStyles()
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null)
  const [messages, setMessages] = React.useState<Api.MessagesPayload['messages'] | undefined>(
    undefined,
  )

  React.useEffect(() => {
    if (props.phase !== Phase.GetMessage) return
    fetchJSON<Api.ResponseTypes['Messages']>(`/api/messages`)
      .then(response => {
        if (response.payload.messages) setMessages(response.payload.messages)
        else throw new Error(`No messages available ${JSON.stringify(response)}`)
      })
      .catch(err => setErrorMessage(`Sorry an error occurred! ${err.message}`))
  }, [props.phase])

  if (props.phase < Phase.GetMessage) return <></>

  return (
    <div className={classes.containerSection}>
      <Typography variant="h5" className={classes.textAlign}>
        What do you want to say?
      </Typography>
      {errorMessage ? <span>ERROR: {errorMessage}</span> : null}
      {messages ? (
        <List>
          {messages.map(message => (
            <ListItem
              key={message.uuid}
              button
              onClick={() => props.setOptions({...props.options, messageId: message.uuid})}>
              <ListItemAvatar>
                <Avatar>
                  <ChatIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={message.display_name} secondary={`${message.duration}s`} />
              <ListItemSecondaryAction>
                <IconButton edge="end" aria-label="play message">
                  <PlayIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      ) : (
        <span>Loading...</span>
      )}
    </div>
  )
}

function useCallStatusCallback(
  props: ChildProps,
  callCode: string,
  fn: (payload: {started: boolean; completed: boolean}) => boolean,
) {
  React.useEffect(() => {
    let isDone = false
    ;(async () => {
      while (!isDone) {
        const payload = await fetchJSON<{started: boolean; completed: boolean}>(
          `/api/remote/calls/${callCode}/status?timeout=10000`,
        )
        isDone = fn(payload)
        if (!isDone) await new Promise(r => setTimeout(r, 1000))
      }
    })()

    return () => {
      isDone = true
    }
  }, [callCode])
}

const Precall = (props: ChildProps & {twilioNumber: string; callCode: string}) => {
  const classes = useStyles()
  useCallStatusCallback(props, props.callCode, payload => {
    if (payload.started) {
      props.setPhase(Phase.Midcall)
      return true
    }

    return false
  })

  return (
    <div className={classes.containerSection}>
      <Typography variant="h5" className={classes.textAlign}>
        Call {props.twilioNumber} and enter:
      </Typography>
      <Typography variant="h3" className={classes.textAlign}>
        {props.callCode}
      </Typography>
    </div>
  )
}

const Midcall = (props: ChildProps & {callCode: string}) => {
  const classes = useStyles()
  const [hasBeenPlayed, setHasBeenPlayed] = React.useState(false)
  useCallStatusCallback(props, props.callCode, payload => {
    if (payload.completed) {
      props.setPhase(Phase.Postcall)
      return true
    }

    return false
  })

  return (
    <div className={classes.containerSection}>
      <Typography variant="h5" className={classes.textAlign}>
        Play Your Message
      </Typography>
      <div className={classes.zipcodeFormLine}>
        <Button
          variant="contained"
          color="primary"
          onClick={async () => {
            setHasBeenPlayed(true)
            await fetch(`/api/remote/calls/${props.callCode}/speak`, {
              method: 'POST',
              headers: {'Content-type': 'application/json'},
              body: JSON.stringify({
                jwt: 'blacklivesmatter',
              }),
            })
          }}>
          Play{hasBeenPlayed ? ' from Beginning' : ''}
        </Button>
        <Button
          className={classes.zipcodeButton}
          variant="contained"
          color="secondary"
          disabled={!hasBeenPlayed}
          onClick={async () => {
            await fetch(`/api/remote/calls/${props.callCode}/stop`, {
              method: 'POST',
              headers: {'Content-type': 'application/json'},
              body: JSON.stringify({
                jwt: 'blacklivesmatter',
              }),
            })
          }}>
          Stop
        </Button>
      </div>
    </div>
  )
}

const Postcall = (props: ChildProps) => {
  const classes = useStyles()

  return (
    <div className={classes.containerSection}>
      <Typography variant="h5" className={classes.textAlign}>
        Great job!
      </Typography>
      <div className={classes.zipcodeFormLine}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            props.setOptions({
              ...props.options,
              representativeId: '',
              numberToCall: '',
              messageId: '',
            })
          }}>
          Make Another Call
        </Button>
      </div>
    </div>
  )
}

const Call = (props: ChildProps) => {
  const [twilioNumber, setTwilioNumber] = React.useState('')
  const [callCode, setCallCode] = React.useState('')

  React.useEffect(() => {
    if (props.phase !== Phase.Precall) return
    ;(async () => {
      const audioResponse = await fetch(`/api/messages/${props.options.messageId}/audio`)
      const audioBase64 = _arrayBufferToBase64(await audioResponse.arrayBuffer())
      const createResponse = await fetch(`/api/remote/calls`, {
        method: 'POST',
        headers: {'Content-type': 'application/json'},
        body: JSON.stringify({
          jwt: 'blacklivesmatter',
          targetNumber: '+15558675309',
          messageId: props.options.messageId,
          messageAudioBase64: audioBase64,
        }),
      })

      const {callCode, twilioNumber} = await createResponse.json()
      setCallCode(callCode)
      setTwilioNumber(twilioNumber)
    })()
  }, [props.phase])

  if (props.phase < Phase.Precall) return <></>
  if (!callCode || !twilioNumber) return <span>Loading...</span>

  if (props.phase === Phase.Midcall) return <Midcall callCode={callCode} {...props} />
  if (props.phase === Phase.Postcall) return <Postcall {...props} />
  return <Precall callCode={callCode} twilioNumber={twilioNumber} {...props} />
}

export const MakeACall = (): JSX.Element => {
  const classes = useStyles()
  const [phaseState_, setPhase] = React.useState(Phase.GetLocation)
  const [options, setOptions] = React.useState({
    zipcode: '',
    representativeId: '',
    numberToCall: '',
    messageId: '',
  })

  let phase = Phase.GetLocation
  if (/^\d{5}$/.test(options.zipcode)) phase = Phase.GetRepresentative
  if (options.numberToCall) phase = Phase.GetMessage
  if (options.messageId) phase = Phase.Precall
  if (phaseState_ === Phase.Midcall) phase = phaseState_
  if (phaseState_ === Phase.Postcall) phase = phaseState_

  const props = {phase, setPhase, options, setOptions}

  return (
    <div className={classes.container}>
      <GetLocation {...props} />
      <GetRepresentative {...props} />
      <GetMessage {...props} />
      <Call {...props} />
    </div>
  )
}
