import sbp from '@sbp/sbp'
import { aes256gcm } from '@exact-realty/rfc8188/encodings'
import encrypt from '@exact-realty/rfc8188/encrypt'
import encodeMultipartMessage from '@exact-realty/multipart-parser/encodeMultipartMessage'

// From: <https://github.com/Exact-Realty/ts-rfc8188/blob/master/test/index.test.ts>
// We're using Response for testing, which doesn't seem to like ArrayBuffer but
// only takes Uint8Array.
const ArrayBufferToUint8ArrayStream = (s: ReadableStream<ArrayBufferLike>) =>
  s.pipeThrough(
    // eslint-disable-next-line no-undef
    new TransformStream<ArrayBufferLike, Uint8Array>({
      start () {},
      transform (chunk, controller) {
        console.error('@@@@TRANSFORM', chunk)
        if (ArrayBuffer.isView(chunk)) {
          controller.enqueue(
            new Uint8Array(
              chunk.buffer,
              chunk.byteOffset,
              chunk.byteLength
            )
          )
        } else {
          controller.enqueue(new Uint8Array(chunk))
        }
      },
      flush (controller) {
        console.error('@@@@@FLUSH', controller)
      }
    })
  )

export const computeChunkDescriptors = (inStream: ReadableStream) => {
  let length = 0
  return new Promise((resolve, reject) => {
    inStream.pipeTo(new WritableStream({
      write (chunk) {
        length += chunk.byteLength
      },
      close () {
        resolve([length, 'some-fake-cid'])
      },
      abort (reason) {
        reject(reason)
      }
    }))
  })
}

export default (sbp('sbp/selectors/register', {
  'chelonia/fileUpload': async function (chunks: Blob | Blob[], manifestOptions: Object) {
    if (!Array.isArray(chunks)) chunks = [chunks]
    const keyId = Buffer.from('TODO-id')
    const IKM = Buffer.from('TODO-ikm')
    const recordSize = 1 << 16 // 64 KiB TODO: Decide on a reasonable size
    const chunkDescriptors: Promise<[number, string]>[] = []
    const transferParts = await Promise.all(chunks.map(async (chunk: Blob) => {
      const stream = chunk.stream()
      const encryptedStream = await encrypt(aes256gcm, stream, recordSize, keyId, IKM)
      // const [body, s] = encryptedStream.tee()
      // chunkDescriptors.push(computeChunkDescriptors(s))
      console.log('@@@@ COMPUTED A STREAM', encryptedStream)
      return {
        headers: new Headers([['content-type', 'application/octet-stream']]),
        body: encryptedStream
      }
    }))
    transferParts.push({
      headers: new Headers([['content-type', 'application/vnd.shelter.manifest+json']]),
      body: new ReadableStream({
        async pull (controller) {
          const chunks = await Promise.all(chunkDescriptors)
          const manifest = {
            version: '1.0.0',
            cipher: 'aes256gcm',
            'cipher-params': 'TBD',
            size: chunks.reduce((acc, [cv]) => acc + cv, 0),
            chunks
          }
          controller.push(Buffer.from(JSON.stringify(manifest)))
        }
      })
    })
    const stream = encodeMultipartMessage('myboundary', transferParts)
    console.log('@@@@FILE UPLOAD', await new Response(ArrayBufferToUint8ArrayStream(stream)).text())
  },
  'chelonia/fileDownload': function () {
  }
}))
