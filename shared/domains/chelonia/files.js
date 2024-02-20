import encodeMultipartMessage from '@exact-realty/multipart-parser/encodeMultipartMessage'
import decrypt from '@exact-realty/rfc8188/decrypt'
import { aes256gcm } from '@exact-realty/rfc8188/encodings'
import encrypt from '@exact-realty/rfc8188/encrypt'
import sbp from '@sbp/sbp'
import { createCID, createCIDfromStream } from '~/shared/functions.js'
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

const streamToUint8Array = async (s: ReadableStream) => {
  const reader = s.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  for (;;) {
    const result = await reader.read()
    if (result.done) break
    chunks.push(coerce(result.value))
    // $FlowFixMe[incompatible-use]
    length += result.value.byteLength
  }
  const body = new Uint8Array(length)
  chunks.reduce((offset, chunk) => {
    body.set(chunk, offset)
    return offset + chunk.byteLength
  }, 0)
  return body
}

// Check for streaming support, as of today (Feb 2024) only Blink-
// based browsers support this (i.e., Firefox and Safari don't).
const ArrayBufferToUint8ArrayStream = async (s: ReadableStream) => {
  if (!supportsRequestStreams) {
    return await streamToUint8Array(s)
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

const fileStream = (chelonia: Object, manifest: Object) => {
  const dataGenerator = async function * () {
    let readSize = 0
    for (const chunk of manifest.chunks) {
      if (
        !Array.isArray(chunk) ||
        typeof chunk[0] !== 'number' ||
        typeof chunk[1] !== 'string'
      ) {
        throw new Error('Invalid chunk descriptor')
      }
      const chunkResponse = await fetch(`${chelonia.config.connectionURL}/file/${chunk[1]}`, {
        method: 'GET',
        signal: chelonia.abortController.signal
      })
      if (!chunkResponse.ok) {
        throw new Error('Unable to retrieve manifest')
      }
      // TODO: We're reading the chunks in their entirety instead of using the
      // stream interface. In the future, this can be changed to get a stream
      // instead. Ensure then that the following checks are replaced with a
      // streaming version (length and CID)
      const chunkBinary = await chunkResponse.arrayBuffer()
      if (chunkBinary.byteLength !== chunk[0]) throw new Error('mismatched chunk size')
      readSize += chunkBinary.byteLength
      if (readSize > manifest.size) throw new Error('read size exceeds declared size')
      if (createCID(coerce(chunkBinary)) !== chunk[1]) throw new Error('mismatched chunk hash')
      yield chunkBinary
    }
    if (readSize !== manifest.size) throw new Error('mismatched size')
  }

  const dataIterator = dataGenerator()

  return new ReadableStream({
    async pull (controller) {
      try {
        const chunk = await dataIterator.next()
        if (chunk.done) {
          controller.close()
          return
        }
        controller.enqueue(chunk.value)
      } catch (e) {
        controller.error(e)
      }
    }
  })
}

const handleNonePayload = async (chelonia: Object, manifest: Object) => {
  const bytes = await streamToUint8Array(fileStream(chelonia, manifest))
  return new Blob([bytes], { type: manifest.type || 'application/octet-stream' })
}

const handleAes256gcmPayload = async (chelonia: Object, manifest: Object) => {
  const maxRecordSize = 1 << 27 // 128 MiB
  if (!manifest['cipher-params'] || !manifest['cipher-params'].keyId) {
    throw new Error('Missing cipher-params')
  }
  const keyId = manifest['cipher-params'].keyId
  const bytes = await streamToUint8Array(
    decrypt(aes256gcm, fileStream(chelonia, manifest), (actualKeyId) => {
      if (Buffer.from(actualKeyId).toString() !== keyId) {
        throw new Error('Invalid key ID')
      }
      return Buffer.from('TODO-ikm')
    }, maxRecordSize)
  )
  return new Blob([bytes], { type: manifest.type || 'application/octet-stream' })
}

const uploadNoneChunkStream = (chelonia: Object, manifestOptions?: Object, stream: ReadableStream) => {
  return stream
}

const uploadAes256ChunkStream = async (chelonia: Object, manifestOptions: Object, stream: ReadableStream) => {
  // TODO: Get keyId from params, verify that it's of the correct type and get
  // the IKM from the key by looking it up in externalKeys
  const keyId = 'TODO-id'
  const binaryKeyId = Buffer.from(keyId)
  const IKM = Buffer.from('TODO-ikm')
  const recordSize = 1 << 16 // 64 KiB TODO: Decide on a reasonable size
  return await encrypt(aes256gcm, stream, recordSize, binaryKeyId, IKM)
}

export default (sbp('sbp/selectors/register', {
  'chelonia/fileUpload': async function (chunks: Blob | Blob[], manifestOptions: Object) {
    if (!Array.isArray(chunks)) chunks = [chunks]
    const chunkDescriptors: Promise<[number, string]>[] = []
    let cipherParams
    switch (manifestOptions.cipher) {
      case 'aes256gcm':
        cipherParams = { keyId: 'TODO-id' }
        break
      case 'none':
        cipherParams = undefined
        break
      default:
        throw new Error('Unsupported cipher')
    }
    const transferParts = await Promise.all(chunks.map(async (chunk: Blob, i) => {
      const stream = chunk.stream()
      let encryptedStream
      switch (manifestOptions.cipher) {
        case 'aes256gcm':
          encryptedStream = await uploadAes256ChunkStream(this, manifestOptions, stream)
          break
        case 'none':
          encryptedStream = await uploadNoneChunkStream(this, manifestOptions, stream)
          break
        default:
          throw new Error('Unsupported cipher')
      }
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
        ['content-disposition', 'form-data; name="manifest"; filename="manifest.json"'],
        ['content-type', 'application/vnd.shelter.manifest']
      ]),
      body: new ReadableStream({
        async start (controller) {
          const chunks = await Promise.all(chunkDescriptors)
          const manifest = {
            version: '1.0.0',
            type: manifestOptions.type ?? undefined,
            meta: manifestOptions.meta ?? undefined,
            cipher: manifestOptions.cipher,
            'cipher-params': cipherParams,
            size: chunks.reduce((acc, [cv]) => acc + cv, 0),
            chunks,
            'name-map': manifestOptions['name-map'] ?? undefined,
            alternatives: manifestOptions.alternatives ?? undefined
          }
          controller.enqueue(Buffer.from(JSON.stringify(manifest)))
          controller.close()
        }
      })
    })
    const boundary = window.crypto.randomUUID()
    const stream = encodeMultipartMessage(boundary, transferParts)

    const uploadResponse = await fetch(`${this.config.connectionURL}/file`, {
      method: 'POST',
      signal: this.abortController.signal,
      body: await ArrayBufferToUint8ArrayStream(stream),
      headers: new Headers([['content-type', `multipart/form-data; boundary=${boundary}`]])
    })

    if (!uploadResponse.ok) throw new Error('Error uploading file')
    return uploadResponse.text()
  },
  'chelonia/fileDownload': async function (manifestID: string) {
    const manifestResponse = await fetch(`${this.config.connectionURL}/file/${manifestID}`, {
      method: 'GET',
      signal: this.abortController.signal
    })
    if (!manifestResponse.ok) {
      throw new Error('Unable to retrieve manifest')
    }
    const manifestBinary = await manifestResponse.arrayBuffer()
    if (createCID(coerce(manifestBinary)) !== manifestID) throw new Error('mismatched manifest hash')
    const manifest = JSON.parse(Buffer.from(manifestBinary).toString())
    if (typeof manifest !== 'object') throw new Error('manifest format is invalid')
    if (manifest.version !== '1.0.0') throw new Error('unsupported manifest version')
    if (!Array.isArray(manifest.chunks)) throw new Error('missing required field: chunks')
    console.log(manifest)
    if (!['aes256gcm', 'none'].includes(manifest.cipher)) throw new Error('unsupported cipher')

    switch (manifest.cipher) {
      case 'aes256gcm':
        return handleAes256gcmPayload(this, manifest)
      case 'none':
        return handleNonePayload(this, manifest)
    }
  }
}): string[])
