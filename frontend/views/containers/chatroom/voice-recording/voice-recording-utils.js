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

// There is brave-desktop specific issue where the browser doesn't properly detect the
// audio duration if a mimeType is not provided when creating the MediaRecorder instance.
// Specifying mimeType breaks voice recording in some other browsers such as FF, we need to apply this workaround only for brave-desktop.
// Refer to VoiceRecorder.vue for the relevant code.
export async function isBraveDesktop (): Promise<boolean> {
  const navigator: any = window.navigator
  const brave: any = navigator.brave

  if (!brave || typeof brave.isBrave !== 'function') return false

  try {
    if (!(await brave.isBrave())) return false
    return navigator.userAgentData?.mobile !== true
  } catch (err) {
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
