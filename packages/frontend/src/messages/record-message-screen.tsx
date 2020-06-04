import Meyda from 'meyda'
import * as React from 'react'

// Hooks from https://stackoverflow.com/questions/57298567/correct-handling-of-react-hooks-for-microphone-audio

const getMedia = async () => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })
  } catch (err) {
    console.log('Error:', err)
  }
}

const useMeydaAnalyser = audio => {
  const [analyser, setAnalyser] = React.useState(null)
  const [running, setRunning] = React.useState(false)
  const [features, setFeatures] = React.useState(null)
  const [stream, setStream] = React.useState(null)

  React.useEffect(() => {
    const audioContext = new AudioContext()

    let newAnalyser
    getMedia().then(stream => {
      setStream(stream)
      if (audioContext.state === 'closed') {
        return
      }
      const source = audioContext.createMediaStreamSource(stream)
      newAnalyser = Meyda.createMeydaAnalyzer({
        audioContext,
        source,
        bufferSize: 1024,
        featureExtractors: ['amplitudeSpectrum', 'mfcc', 'rms'],
        callback: features => {
          setFeatures(features)
        },
      })
      setAnalyser(newAnalyser)
    })
    return () => {
      if (newAnalyser) {
        newAnalyser.stop()
      }
      if (audioContext) {
        audioContext.close()
      }
    }
  }, [])

  React.useEffect(() => {
    if (analyser) {
      if (running) {
        analyser.start()
        audio.current.srcObject = null
      } else {
        analyser.stop()
        // TODO: audio isn't right ... lol
        audio.current.srcObject = stream
      }
    }
  }, [running, analyser, stream])

  return [running, setRunning, features]
}

export const RecordMessageScreen = () => {
  const levelRange = React.useRef(null)
  const audio = React.useRef(null)

  // TODO: why are these typed as any?
  const [running, setRunning, features] = useMeydaAnalyser(audio)

  React.useEffect(() => {
    if (levelRange.current && features) {
      levelRange.current.value = features.rms
    }
  }, [features])

  const handleClick = () => {
    setRunning(running => !running)
  }

  return (
    <div>
      <h1>RecordMessageScreen</h1>
      <textarea rows={20} cols={50}>
        Write your script here so you can read as you record.
      </textarea>
      <button onClick={handleClick}>{!running ? 'Start' : 'Stop'} Recording</button>
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
