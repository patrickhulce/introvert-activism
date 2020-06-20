import * as React from 'react'

import {TextField, Typography, Button} from '@material-ui/core'
import Meyda from 'meyda'
import {withRouter} from 'react-router-dom'

const DEFAULT_SCRIPT = `Protip: Write your script here so you can read as you record.`

type MediaRecorder = any

declare global {
  interface Window {
    MediaRecorder: MediaRecorder
  }
}

const getMedia = async (constraints: MediaStreamConstraints) => {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints)
  } catch (err) {
    console.error('Error:', err)
    return null
  }
}

function useRecorder(
  recorder: MediaRecorder | null,
): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  const [isRecording, setRecording] = React.useState(false)

  React.useEffect(() => {
    if (!recorder) return

    if (isRecording && recorder.state === 'inactive') {
      recorder.start(100)
    } else if (!isRecording && recorder.state === 'recording') {
      recorder.stop()
    }
  }, [isRecording, recorder])

  return [isRecording, setRecording]
}

const useMeydaAnalyser = (
  stream: MediaStream | null,
  isRecording: boolean,
): Partial<Meyda.MeydaFeaturesObject> | null => {
  const [features, setFeatures] = React.useState<Partial<Meyda.MeydaFeaturesObject> | null>(null)

  let analyzer: Meyda.MeydaAnalyzer | undefined
  React.useEffect(() => {
    if (!stream || !isRecording) return

    const audioContext = new AudioContext()

    const source = audioContext.createMediaStreamSource(stream)
    analyzer = Meyda.createMeydaAnalyzer({
      audioContext,
      source,
      bufferSize: 1024,
      featureExtractors: ['amplitudeSpectrum', 'mfcc', 'rms'],
      callback: features => {
        setFeatures(features)
      },
    })
    analyzer.start()

    return () => {
      if (analyzer) analyzer.stop()
      if (audioContext) audioContext.close()
    }
  }, [stream, isRecording])

  return features
}

const RecordMessageScreen_ = (props: {
  history: import('react-router-dom').RouteChildrenProps['history']
}): JSX.Element => {
  const [displayName, setDisplayName] = React.useState('')
  const [script, setScript] = React.useState(DEFAULT_SCRIPT)
  const [errorMessage, setErrorMessage] = React.useState('')

  const levelRange = React.useRef<HTMLDivElement | null>(null)
  const audioEl = React.useRef<HTMLAudioElement | null>(null)

  const mediaStream = React.useRef<MediaStream | null>(null)
  const mediaRecorder = React.useRef<MediaRecorder | null>(null)
  const mediaChunks = React.useRef<Blob[]>([])

  const [canRecord, setCanRecord] = React.useState(false)
  const [isRecording, setRecording] = useRecorder(mediaRecorder.current)
  const features = useMeydaAnalyser(mediaStream.current, isRecording)

  async function createMediaRecorder() {
    mediaStream.current = await getMedia({
      audio: true,
      video: false,
    })

    const recorder = new window.MediaRecorder(mediaStream.current)
    const mediaChunksListener = (e: any) => {
      mediaChunks.current.push(e.data)
    }
    recorder._listener = mediaChunksListener
    recorder.addEventListener('dataavailable', mediaChunksListener)
    recorder.addEventListener('error', console.error)
    mediaRecorder.current = recorder
    setCanRecord(true)
  }

  function unloadMediaRecorder() {
    setCanRecord(false)
    if (!mediaRecorder.current) return
    if (mediaRecorder.current.state === 'recording') mediaRecorder.current.stop()
    mediaRecorder.current.removeEventListener('dataavailable', mediaRecorder.current._listener)
  }

  React.useEffect(() => {
    createMediaRecorder()
    return unloadMediaRecorder
  }, [])

  React.useEffect(() => {
    if (!mediaRecorder.current || !audioEl.current) return

    if (isRecording) {
      audioEl.current.src = ''
      mediaChunks.current = []
    } else {
      const blob = new Blob(mediaChunks.current, {type: 'audio/webm; codecs=opus'})
      audioEl.current.src = URL.createObjectURL(blob)
    }
  }, [isRecording])

  React.useEffect(() => {
    if (levelRange.current && features && features.rms) {
      const level = Math.min(features.rms * 4, 1)
      levelRange.current.style.top = `${(1 - level) * 100}%`
    }
  }, [features])

  const handleToggleRecording = async () => {
    if (!canRecord) return
    if (!mediaRecorder.current) {
      setErrorMessage('Cannot record right now.')
      return
    }

    setRecording(recording => !recording)
  }

  const handleSave = async () => {
    try {
      if (!mediaChunks.current.length) throw new Error('No audio available')
      const blob = new Blob(mediaChunks.current, {type: 'audio/webm; codecs=opus'})

      const params = JSON.stringify({
        display_name: displayName,
        script: script,
      })
      const response = await fetch('/api/messages', {
        method: 'POST',
        body: params,
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) throw new Error(`API failure: ${await response.text()}`)

      const uuid = (await response.json()).payload.message.uuid
      const audioResponse = await fetch(`/api/messages/${uuid}/audio`, {
        method: 'PUT',
        headers: {'content-type': 'audio/webm'},
        body: blob,
      })
      if (!audioResponse.ok) throw new Error('Failed audio response')
      props.history.push('/messages')
    } catch (err) {
      setErrorMessage(err.message)
    }
  }

  const hasRecorded = !!mediaChunks.current.length

  return (
    <div style={{paddingTop: 20}}>
      <Typography variant="h4">Record a Message</Typography>
      <Typography variant="body1">
        Record a message for a representative that you will play while on the phone. Give it a
        descriptive name like "Senator Cruz - Police Brutality" so you remember which one to play
        later.
      </Typography>
      {errorMessage ? (
        <Typography variant="body1" style={{color: 'red', fontWeight: 'bold'}}>
          ERROR: {errorMessage}
        </Typography>
      ) : null}
      <div style={{display: 'flex', flexDirection: 'row'}}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: '50%',
            padding: 20,
            paddingLeft: 0,
          }}>
          <div style={{marginBottom: 20}}>
            <TextField
              id="display-name"
              label="Message Name"
              variant="outlined"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <TextField
              id="script-input"
              label="Script"
              multiline
              fullWidth
              rows={4}
              value={script}
              onChange={e => setScript(e.target.value)}
              variant="outlined"
            />
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '50%',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <div style={{marginBottom: 20}}>
            <audio ref={audioEl} controls style={{outline: 'none'}}></audio>
            <div
              className="level-indicator-container"
              style={{
                display: 'inline-block',
                height: 50,
                width: 20,
                marginLeft: 20,
                position: 'relative',
              }}>
              <div
                className="level-indicator"
                style={{
                  background: 'green',
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  top: '98%',
                }}
                ref={levelRange}></div>
            </div>
          </div>
          {}
          {!hasRecorded ? (
            <Typography variant="body2" style={{color: 'teal', margin: 10}}>
              Record a message here.
            </Typography>
          ) : null}
          {!isRecording && hasRecorded && !displayName ? (
            <Typography variant="body2" style={{color: 'teal', margin: 10}}>
              Enter a descriptive name for this message.
            </Typography>
          ) : null}
          {!isRecording && hasRecorded && displayName && (!script || script === DEFAULT_SCRIPT) ? (
            <Typography variant="body2" style={{color: 'teal', margin: 10}}>
              Enter a short script for this message.
            </Typography>
          ) : null}
          <div>
            <Button
              disabled={!canRecord}
              variant="contained"
              onClick={handleToggleRecording}
              color="secondary"
              style={{marginRight: 10}}>
              {isRecording ? 'Stop' : 'Record'}
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={
                isRecording ||
                !mediaChunks.current.length ||
                !displayName ||
                !script ||
                script === DEFAULT_SCRIPT
              }
              onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const RecordMessageScreen = withRouter(RecordMessageScreen_)
