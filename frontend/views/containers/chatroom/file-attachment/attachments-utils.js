export const blobToDataUrl = (blob: Blob): Promise<any> => {
  // serialize blob to base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result) // e.g. "data:video/mpeg;base64,..."
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export const dataUrlToBlob = (dataURL: string): any => {
  const [meta, data] = dataURL.split(',')
  const mimeType = meta?.match(/:(.*?);/)?.[1]

  if (!mimeType || !data) {
    console.error('Error converting base64 to blob: mimeType or base64 is missing')
    return null
  }

  const byteString = atob(data)
  const len = byteString.length
  const u8arr = new Uint8Array(len)

  for (let i = 0; i < len; i++) {
    u8arr[i] = byteString.charCodeAt(i)
  }
  return new Blob([u8arr], { type: mimeType })
}

export const saveAttachmentBlobToSessionStorage = async (manifestCid: string, blob: Blob): Promise<void> => {
  if (!manifestCid || !blob) {
    console.error('Error saving attachment blob to session storage: manifestCid or blob is missing')
    return
  }
  if (!(blob instanceof Blob)) {
    console.error('Error saving attachment blob to session storage: blob is not a valid Blob or is empty')
    return
  }

  try {
    sessionStorage.setItem(`attachmentblob/${manifestCid}`, await blobToDataUrl(blob))
  } catch (err) {
    console.error('Error saving attachment blob to session storage:', err)
  }
}

export const getAttachmentBlobFromSessionStorage = (manifestCid: string): any => {
  const key = `attachmentblob/${manifestCid}`
  const loaded = sessionStorage.getItem(key)
  if (!loaded) return null

  try {
    return dataUrlToBlob(loaded)
  } catch (err) {
    console.error('Error converting base64 to blob:', err)
    return null
  }
}
