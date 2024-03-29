'use strict'

import sbp from '@sbp/sbp'

// Copied from https://stackoverflow.com/questions/11876175/how-to-get-a-file-or-blob-from-an-object-url
export function objectURLtoBlob (url: string): Promise<Blob> {
  return fetch(url).then(r => r.blob())
}

// Copied from https://stackoverflow.com/a/27980815/4737729
export function imageDataURItoBlob (dataURI: string): Blob {
  const [prefix, data] = dataURI.split(',')
  const [imageType] = (/image\/[^;]+/.exec(prefix) || [''])
  const byteString = atob(data)
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }

  return new Blob([ab], { type: imageType })
}

export const imageUpload = (imageFile: File, params: ?Object): Promise<Object> => {
  const file = imageFile
  console.debug('will upload a picture of type:', file.type)
  return sbp('chelonia/fileUpload', imageFile, { type: file.type, cipher: 'aes256gcm' }, params)
}
