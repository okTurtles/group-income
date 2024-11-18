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

export const imageUpload = async (imageFile: File, params: ?Object): Promise<Object> => {
  const file = imageFile
  console.debug('will upload a picture of type:', file.type)
  const { download } = await sbp('chelonia/fileUpload', imageFile, { type: file.type, cipher: 'aes256gcm' }, params)
  return download
}

// Image compression

export function supportsWebP (): Promise<boolean> {
  // Uses a very small webP image to check if the browser supports 'image/webp' format.
  // (reference: https://developers.google.com/speed/webp/faq#in_your_own_javascript)
  const verySmallWebP = 'data:image/webp;base64,UklGRhIAAABXRUJQVlA4WAoAAAAQAAAAMwAAQUxQSAwAAAAwAQCdASoEAAQAAVAfCWkAQUwAAAABABgAAgAAAAAABAAAAAAAAAA'
  const img = new Image()

  return new Promise(resolve => {
    img.onload = () => resolve(img.height > 0)
    img.onerror = () => resolve(false)
    img.src = verySmallWebP
  })
}

function loadImage (url): any {
  const imgEl = new Image()

  return new Promise((resolve) => {
    imgEl.onload = () => { resolve(imgEl) }
    imgEl.src = url
  })
}
export async function compressImage (imgUrl: string): Promise<any> {
  // takes a source image url and generate another objectURL of the compressed image
  const resizingFactor = 0.8
  const quality = 0.8

  const sourceImage = await loadImage(imgUrl)
  const { naturalWidth, naturalHeight } = sourceImage
  const canvasEl = document.createElement('canvas')
  const c = canvasEl.getContext('2d')

  canvasEl.width = naturalWidth * resizingFactor
  canvasEl.height = naturalHeight * resizingFactor

  // 1. draw the resized source iamge to canvas
  c.drawImage(
    sourceImage,
    0,
    0,
    canvasEl.width,
    canvasEl.height
  )

  // 2. extract the drawn image as a blob
  return new Promise((resolve) => {
    // reference: canvas API toBlob(): https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
    canvasEl.toBlob(blob => {
      if (blob) {
        const compressedUrl = URL.createObjectURL(blob)
        resolve(compressedUrl)
      } else {
        resolve('')
      }
    }, 'image/jpeg', quality)
  })
}
