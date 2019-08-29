import { blake32Hash } from '~/shared/functions.js'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'

const imageUpload = async (imageFile, context) => {
  // upload picture if there is one and store it locally in our cache
  try {
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
    const newUrl = reply + '?type=' + encodeURIComponent(file.type)

    return {
      success: true,
      url: newUrl
    }
  } catch (error) {
    return {
      success: false,
      error
    }
  }
}

export default imageUpload
