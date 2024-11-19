'use strict'

import sbp from '@sbp/sbp'
import { IMAGE_ATTACHMENT_MAX_SIZE } from './constants.js'

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
  const verySmallWebP = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'
  const img = new Image()

  return new Promise(resolve => {
    img.onload = () => { resolve(img.height > 0) }
    img.onerror = (e) => { resolve(false) }
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

function generateImageBlobByCanvas ({
  sourceImage,
  resizingFactor,
  quality,
  compressToType
}) {
  const { naturalWidth, naturalHeight } = sourceImage
  const canvasEl = document.createElement('canvas')
  const c = canvasEl.getContext('2d')

  canvasEl.width = naturalWidth * resizingFactor
  canvasEl.height = naturalHeight * resizingFactor

  c.drawImage(
    sourceImage,
    0,
    0,
    canvasEl.width,
    canvasEl.height
  )

  return new Promise((resolve) => {
    canvasEl.toBlob(blob => {
      resolve(blob)
    }, compressToType, quality)
  })
}

export async function compressImage (imgUrl: string, sourceMimeType?: string): Promise<any> {
  // Takes a source image url and generate a blob of the compressed image.

  // According to the testing result, 0.8 is a good starting point for both resizingFactor and quality for .jpeg and .webp.
  // For other image types, we use 0.9 as the starting point.
  const defaultFactor = ['image/jpeg', 'image/webp'].includes(sourceMimeType) ? 0.8 : 0.9
  let resizingFactor = defaultFactor
  let quality = defaultFactor
  // According to the testing result, webP format has a better compression ratio than jpeg.
  const compressToType = await supportsWebP() ? 'image/webp' : 'image/jpeg'
  const sourceImage = await loadImage(imgUrl)

  while (true) {
    const blob = await generateImageBlobByCanvas({
      sourceImage,
      resizingFactor,
      quality,
      compressToType
    })
    const sizeDiff = blob.size - IMAGE_ATTACHMENT_MAX_SIZE

    if (sizeDiff <= 0 || // if the compressed image is already smaller than the max size, return the compressed image.
      quality <= 0.3) { // Do not sacrifice the image quality too much.
      return blob
    } else {
      // if the size difference is greater than 100KB, reduce the next compression factors by 10%, otherwise 5%.
      const minusFactor = sizeDiff > 100 * 1000 ? 0.1 : 0.05
      resizingFactor -= minusFactor
      quality -= minusFactor
    }
  }
}
