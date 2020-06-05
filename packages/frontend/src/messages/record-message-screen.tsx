/* eslint-disable @typescript-eslint/ban-ts-comment */

import Meyda from 'meyda'
import * as React from 'react'

import type * as Api from '../../../shared/src/utils/api'

type MediaRecorder = any // TODO

const getMedia = async (constraints: MediaStreamConstraints) => {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints)
  } catch (err) {
    console.log('Error:', err)
  }
}

function useRecorder(recorder): [boolean, any] {
  const [recording, setRecording] = React.useState(false)

  React.useEffect(() => {
    if (!recorder) return

    if (recording && recorder.state === 'inactive') {
      recorder.start(100)
    } else if (!recording && recorder.state === 'recording') {
      recorder.stop()
    }
  }, [recording, recorder])

  return [recording, setRecording]
}

const useMeydaAnalyser = (stream, recording) => {
  const [features, setFeatures] = React.useState(null)

  let analyzer
  React.useEffect(() => {
    if (!stream || !recording) return

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
  }, [stream, recording])

  return features
}

export const RecordMessageScreen = () => {
  const levelRange = React.useRef(null)
  const audio = React.useRef(null)

  const mediaStream = React.useRef<MediaStream | null>(null)
  const mediaRecorder = React.useRef<MediaRecorder | null>(null)
  const mediaChunks = React.useRef<Blob[]>([])

  const getMediaStream = React.useCallback(async () => {
    mediaStream.current = await getMedia({
      audio: true,
      video: false,
    })
  }, [])

  const getMediaRecorder = React.useCallback(async () => {
    if (!mediaStream.current) await getMediaStream()

    // @ts-ignore
    const recorder = new MediaRecorder(mediaStream.current)
    recorder.ondataavailable = e => {
      mediaChunks.current.push(e.data)
    }
    recorder.onerror = console.error
    mediaRecorder.current = recorder
  }, [mediaStream.current])

  const [recording, setRecording] = useRecorder(mediaRecorder.current)

  React.useEffect(() => {
    if (!mediaRecorder.current) return

    if (recording) {
      audio.current.src = ''
      mediaChunks.current = []
    } else {
      const blob = new Blob(mediaChunks.current, {type: 'audio/ogg; codecs=opus'})
      audio.current.src = URL.createObjectURL(blob)
    }
  }, [recording])

  const features = useMeydaAnalyser(mediaStream.current, recording)
  React.useEffect(() => {
    if (levelRange.current && features) {
      levelRange.current.value = features.rms
    }
  }, [features])

  const handleToggleRecording = async () => {
    if (!mediaRecorder.current) await getMediaRecorder()
    // @ts-ignore ?
    setRecording(recording => !recording)
  }

  const handleSave = async () => {
    if (!mediaChunks.current.length) return
    const blob = new Blob(mediaChunks.current, {type: 'audio/ogg; codecs=opus'})

    const params = JSON.stringify({
      // TODO
      display_name: 'message name',
    })
    const response = (await (
      await fetch('/api/messages', {
        method: 'POST',
        body: params,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    ).json()) as Api.ResponseTypes['Message']
    const message = response.payload.message

    // TODO doesnt work yet
    await fetch(`/api/messages/${message.uuid}/audio`, {
      method: 'POST',
      body: blob,
    })
  }

  return (
    <div>
      <h1>RecordMessageScreen</h1>
      <textarea rows={20} cols={50}>
        Write your script here so you can read as you record.
      </textarea>
      <button onClick={handleToggleRecording}>{recording ? 'Stop' : 'Start'} Recording</button>
      <button disabled={recording} onClick={handleSave}>
        Save
      </button>
      <audio ref={audio} controls></audio>
      <input
        ref={levelRange}
        type="range"
        id="levelRange"
        name="level"
        min="0.0"
        max="1.0"
        step="0.001"
        defaultValue="0"
      />
    </div>
  )
}
