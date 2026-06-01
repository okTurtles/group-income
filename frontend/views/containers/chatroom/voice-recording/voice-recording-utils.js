export function isBrowserSupportsVoiceRecording (): boolean {
  return Boolean(
    // 'navigator.mediaDevices.getUserMedia' (https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia):
    // - requesting permission and accessing the stream from the hardware microphone
    // 'window.MediaRecorder' (https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder):
    // - capturing the audio stream and turning it into an audio file
    // 'navigator.permissions' : checking the current permission state
    // AudioContext: utilities for processing/visualizing the sound stream

    navigator.permissions &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    (navigator.mediaDevices.enumerateDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') &&
    AudioContext && window.MediaRecorder
  )
}

export async function canUseVoiceRecording (): Promise<boolean> {
  // Firstly, check if the browser is capable of recording voice messages.
  if (!isBrowserSupportsVoiceRecording()) return false

  try {
    const mediaDevices: any = navigator.mediaDevices
    // Check if there are any audio input devices available.
    const devices = await mediaDevices.enumerateDevices()
    return devices.some(device => device.kind === 'audioinput')
  } catch (err) {
    console.error('Error enumerating audio input devices', err)
    return false
  }
}

export async function checkCurrentPermissionState (): Promise<string> {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' })

    // result.state will be 'granted'|'denied'|'prompt'
    return result.state
  } catch (err) {
    console.error('Error checking microphone permission state:', err)
    return 'unknown'
  }
}

export function getAmplitudeFromTimeDataSamples (timeData: any): any {
  // Get the representative amplitude value from the voice message's timeData.
  // (AI disclosure: Below code is written with the assistance of GPT-5.5 model)
  if (timeData?.length > 0) {
    let sumSquares: number = 0

    for (const sample of timeData) {
      // convert this byte sample into a centered waveform amplitude.
      // Byte sample value reanges from 0 to 255. By dividing it by 128(0 ~ 255 -> -128 ~ +127), we get:
      // 0: silence/center line
      // +127: high positive amplitude
      // -128: high negative amplitude
      //
      // (Referece article for similar approach: https://medium.com/@sergejmoor01/visualizing-audio-on-the-web-introduction-dd33bbee8b78)
      const amplitude = (sample - 128) / 128
      sumSquares += amplitude * amplitude
    }

    // Compute the root mean square of the amplitude values.
    const rms = Math.sqrt(sumSquares / timeData.length)

    // Convert the computed rms value to a perceptual-ish dB scale.
    const minDb = -55
    const maxDb = -10
    const db = 20 * Math.log10(Math.max(rms, 0.00001))
    const normalized = Math.min(1, Math.max(0, (db - minDb) / (maxDb - minDb)))

    return normalized * 100
  }

  return 0
}
