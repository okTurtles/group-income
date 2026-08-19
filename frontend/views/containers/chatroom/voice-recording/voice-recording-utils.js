export function browserSupportsVoiceRecording (): boolean {
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
    window.AudioContext && window.MediaRecorder
  )
}

export async function canUseVoiceRecording (): Promise<boolean> {
  // Firstly, check if the browser is capable of recording voice messages.
  if (!browserSupportsVoiceRecording()) return false

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

const AUDIO_MIME_TYPE_TO_EXTENSION = new Map([
  ['audio/mp4', 'm4a'],
  ['audio/x-m4a', 'm4a'],
  ['audio/aac', 'aac'],
  ['audio/mpeg', 'mp3'],
  ['audio/webm', 'webm'],
  ['audio/ogg', 'ogg'],
  ['application/ogg', 'ogg'],
  ['audio/wav', 'wav'],
  ['audio/wave', 'wav'],
  ['audio/x-wav', 'wav'],
  ['audio/flac', 'flac'],
  ['audio/x-flac', 'flac'],
  ['audio/3gpp', '3gp']
])

export function getExtensionFromAudioMimeType (mimeType: string): string {
  // Drop the parameters that can follow the mime type (eg. 'audio/webm;codecs=opus' -> 'audio/webm')
  const cleanedMimeType = (mimeType || '').split(';')[0].trim().toLowerCase()

  const knownExtension = AUDIO_MIME_TYPE_TO_EXTENSION.get(cleanedMimeType)
  if (knownExtension) { return knownExtension }

  // Fall back to the mime subtype for any container not listed above (eg. 'audio/opus' -> 'opus'),
  // ignoring subtypes that aren't a plain word and so wouldn't make a sane extension.
  const subtype = cleanedMimeType.split('/')[1] || ''
  return /^[a-z0-9]+$/.test(subtype) ? subtype : ''
}

export function getAmplitudeFromTimeDataSamples (timeData: any): any {
  // Get the representative amplitude value from the voice message's timeData.
  if (timeData?.length > 0) {
    let sumSquares: number = 0

    for (const sample of timeData) {
      // convert this byte sample into a centered waveform amplitude.
      // Byte sample value reanges from 0 to 255. By dividing it by 128(0 ~ 255 -> -128 ~ +127), we get:
      // 0: silence/center line
      // +127: high positive amplitude
      // -128: high negative amplitude
      //
      // (Reference article for similar approach: https://medium.com/@sergejmoor01/visualizing-audio-on-the-web-introduction-dd33bbee8b78)
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
