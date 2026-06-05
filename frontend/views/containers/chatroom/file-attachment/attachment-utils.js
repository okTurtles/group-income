'use strict'

export function checkBrowserVideoMimeTypeSupport (mimeType = ''): boolean {
  if (!mimeType) {
    return false
  }
  const videoEl: any = document.createElement('video')
  // videoElement.canPlayType() can return 'probably'|'maybe' and '' for unsupported mime types.
  // It is observed that major browsers like Chrome, Firefox says 'maybe' for widely supported mime types like 'video/mp4' as well.
  // So checking for both 'probably' and 'maybe' here.
  return ['probably', 'maybe'].includes(videoEl.canPlayType(mimeType))
}
