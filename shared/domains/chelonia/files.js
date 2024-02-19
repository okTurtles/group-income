import encodeMultipartMessage from '@exact-realty/multipart-parser/encodeMultipartMessage'
import { aes256gcm } from '@exact-realty/rfc8188/encodings'
import encrypt from '@exact-realty/rfc8188/encrypt'
import sbp from '@sbp/sbp'
import { createCIDfromStream } from '~/shared/functions.js'
import { coerce } from '~/shared/multiformats/bytes.js'

// Snippet from <https://github.com/WebKit/standards-positions/issues/24#issuecomment-1181821440>
const supportsRequestStreams = (() => {
  let duplexAccessed = false

  const hasContentType = new Request('', {
    body: new ReadableStream(),
    method: 'POST',
    get duplex () {
      duplexAccessed = true
      return 'half'
    }
  }).headers.has('Content-Type')

  return duplexAccessed && !hasContentType
})()

// From: <https://github.com/Exact-Realty/ts-rfc8188/blob/master/test/index.test.ts>
// Adapted to check for streaming support, as of today (Feb 2024) only Blink-
// based browsers support this (i.e., Firefox and Safari don't).
const ArrayBufferToUint8ArrayStream = async (s: ReadableStream) => {
  if (!supportsRequestStreams) {
    const reader = s.getReader()
    const chunks = []
    let length = 0
    for (;;) {
      const result = await reader.read()
      if (result.done) break
      chunks.push(coerce(result.value))
      length += result.value.byteLength
    }
    const body = new Uint8Array(length)
    chunks.reduce((offset, chunk) => {
      body.set(chunk, offset)
      return offset + chunk.byteLength
    }, 0)
    return body
  }

  return s.pipeThrough(
    // eslint-disable-next-line no-undef
    new TransformStream(
      // $FlowFixMe[extra-arg]
      {
        transform (chunk, controller) {
          controller.enqueue(coerce(chunk))
        }
      })
  )
}

const computeChunkDescriptors = (inStream: ReadableStream) => {
  let length = 0
  const [lengthStream, cidStream] = inStream.tee()
  const lengthPromise = new Promise((resolve, reject) => {
    // $FlowFixMe[incompatible-call]
    lengthStream.pipeTo(new WritableStream({
      write (chunk) {
        length += chunk.byteLength
      },
      close () {
        resolve(length)
      },
      abort (reason) {
        reject(reason)
      }
    }))
  })
  const cidPromise = createCIDfromStream(cidStream)
  return Promise.all([lengthPromise, cidPromise])
}

export default (sbp('sbp/selectors/register', {
  'chelonia/fileUpload': async function (chunks: Blob | Blob[], manifestOptions: Object) {
    if (!Array.isArray(chunks)) chunks = [chunks]
    // TODO: Get keyId from params, verify that it's of the correct type and get
    // the IKM from the key by looking it up in externalKeys
    const keyId = Buffer.from('TODO-id')
    const IKM = Buffer.from('TODO-ikm')
    const recordSize = 1 << 16 // 64 KiB TODO: Decide on a reasonable size
    const chunkDescriptors: Promise<[number, string]>[] = []
    const transferParts = await Promise.all(chunks.map(async (chunk: Blob, i) => {
      const stream = chunk.stream()
      const encryptedStream = await encrypt(aes256gcm, stream, recordSize, keyId, IKM)
      const [body, s] = encryptedStream.tee()
      chunkDescriptors.push(computeChunkDescriptors(s))
      return {
        headers: new Headers([
          ['content-disposition', `form-data; name="${i}"; filename="${i}"`],
          ['content-type', 'application/octet-stream']
        ]),
        body
      }
    }))
    transferParts.push({
      headers: new Headers([
        ['content-disposition', 'form-data; name="manifest.json"; filename="manifest.json"'],
        ['content-type', 'application/vnd.shelter.manifest+json']
      ]),
      body: new ReadableStream({
        async start (controller) {
          const chunks = await Promise.all(chunkDescriptors)
          const manifest = {
            version: '1.0.0',
            cipher: 'aes256gcm',
            'cipher-params': {
              keyId
            },
            size: chunks.reduce((acc, [cv]) => acc + cv, 0),
            chunks
          }
          controller.enqueue(Buffer.from(JSON.stringify(manifest)))
          controller.close()
        }
      })
    })
    const boundary = window.crypto.randomUUID()
    const stream = encodeMultipartMessage(boundary, transferParts)

    await fetch(`${this.config.connectionURL}/file`, {
      method: 'POST',
      signal: this.abortController.signal,
      body: await ArrayBufferToUint8ArrayStream(stream),
      headers: new Headers([['content-type', `multipart/form-data; boundary=${boundary}`]])
    })
  },
  'chelonia/fileDownload': function () {
  }
}): string[])
