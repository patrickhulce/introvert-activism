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

export const RecordMessageScreen = () => {
  const levelRange = React.useRef<HTMLInputElement | null>(null)
  const audioEl = React.useRef<HTMLAudioElement | null>(null)

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
    recorder.ondataavailable = (e: any) => {
      mediaChunks.current.push(e.data)
    }
    recorder.onerror = console.error
    mediaRecorder.current = recorder
  }, [mediaStream.current])

  const [recording, setRecording] = useRecorder(mediaRecorder.current)

  React.useEffect(() => {
    if (!mediaRecorder.current || !audioEl.current) return

    if (recording) {
      audioEl.current.src = ''
      mediaChunks.current = []
    } else {
      const blob = new Blob(mediaChunks.current, {type: 'audio/ogg; codecs=opus'})
      audioEl.current.src = URL.createObjectURL(blob)
    }
  }, [recording])

  const features = useMeydaAnalyser(mediaStream.current, recording)
  React.useEffect(() => {
    console.log(features)
    if (levelRange.current && features && features.rms) {
      levelRange.current.value = features.rms.toString()
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
      <audio ref={audioEl} controls></audio>
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
