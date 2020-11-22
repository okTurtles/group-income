import { blake32Hash } from '~/shared/functions.js'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'

// Copied from https://stackoverflow.com/a/27980815/4737729
export function imageDataURItoBlob (dataURI) {
  const [prefix, data] = dataURI.split(',')
  const imageType = (/image\/[^;]+/).exec(prefix)
  const byteString = atob(data)
  var ab = new ArrayBuffer(byteString.length)
  var ia = new Uint8Array(ab)

  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }

  return new Blob([ab], { type: imageType })
}

export const imageUpload = async (imageFile) => {
  const file = imageFile
  console.debug('will upload a picture of type:', file.type)
  // https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications#Asynchronously_handling_the_file_upload_process
  const reply = await new Promise((resolve, reject) => {
    // we use FileReader to get raw bytes to generate correct hash
    const reader = new FileReader()
    // https://developer.mozilla.org/en-US/docs/Web/API/Blob
    reader.onloadend = async function () {
      const fd = new FormData()
      const hash = blake32Hash(new Uint8Array(reader.result))
      console.debug('picture hash:', hash)
      fd.append('hash', hash)
      fd.append('data', file)
      fetch(`${process.env.API_URL}/file`, {
        method: 'POST',
        body: fd
      }).then(handleFetchResult('text')).then(resolve).catch(reject)
    }
    reader.readAsArrayBuffer(file)
  })

  return reply + '?type=' + encodeURIComponent(file.type)
}
