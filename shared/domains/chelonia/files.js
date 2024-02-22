import encodeMultipartMessage from '@exact-realty/multipart-parser/encodeMultipartMessage'
import decrypt from '@exact-realty/rfc8188/decrypt'
import { aes256gcm } from '@exact-realty/rfc8188/encodings'
import encrypt from '@exact-realty/rfc8188/encrypt'
import sbp from '@sbp/sbp'
import { blake32Hash, createCID, createCIDfromStream } from '~/shared/functions.js'
import { coerce } from '~/shared/multiformats/bytes.js'

// Snippet from <https://github.com/WebKit/standards-positions/issues/24#issuecomment-1181821440>
// Node.js supports request streams, but also this check isn't meant for Node.js
const supportsRequestStreams = typeof window !== 'object' || (() => {
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

export const aes256gcmHandlers: any = {
  upload: (chelonia: Object, manifestOptions: Object) => {
    let IKM = manifestOptions['cipher-params']?.IKM
    const recordSize = manifestOptions['cipher-params']?.rs ?? 1 << 16
    if (!IKM) {
      IKM = new Uint8Array(33)
      window.crypto.getRandomValues(IKM)
    }
    // The keyId is only used as a sanity check but otherwise it is not needed
    // Because the keyId is computed from the IKM, which is a secret, it is
    // truncated to just eight characters so that it doesn't disclose too much
    // information about the IKM (in theory, since it's a random string 33 bytes
    // long, a full hash shouldn't disclose too much information anyhow).
    // The reason the keyId is not _needed_ is that the IKM is part of the
    // downloadParams, so anyone downloading a file should have the required
    // context, and there is exactly one valid IKM for any downloadParams.
    // By truncating the keyId, the only way to fully verify whether a given
    // IKM decrypts a file is by attempting decryption.
    // A side-effect of truncating the keyId is that, if the IKM were shared
    // some other way (e.g., using the OP_KEY_SHARE mechanism), because of
    // collisions it may not always be possible to look up the correct IKM.
    // Therefore, a handler that uses a different strategy than the one used
    // here (namely, including the IKM in the downloadParams) may need to use
    // longer key IDs, possibly a full hash.
    const keyId = blake32Hash('aes256gcm-keyId' + blake32Hash(IKM)).slice(-8)
    const binaryKeyId = Buffer.from(keyId)
    return {
      cipherParams: {
        keyId
      },
      streamHandler: async (stream: ReadableStream) => {
        return await encrypt(aes256gcm, stream, recordSize, binaryKeyId, IKM)
      },
      downloadParams: {
        IKM: Buffer.from(IKM).toString('base64'),
        rs: recordSize
      }
    }
  },
  download: (chelonia: Object, downloadParams: Object, manifest: Object) => {
    const IKMb64 = downloadParams.IKM
    if (!IKMb64) {
      throw new Error('Missing IKM in downloadParams')
    }
    const IKM = Buffer.from(IKMb64, 'base64')
    const keyId = blake32Hash('aes256gcm-keyId' + blake32Hash(IKM)).slice(-8)
    if (!manifest['cipher-params'] || !manifest['cipher-params'].keyId) {
      throw new Error('Missing cipher-params')
    }
    if (keyId !== manifest['cipher-params'].keyId) {
      throw new Error('Key ID mismatch')
    }
    const maxRecordSize = downloadParams.rs ?? 1 << 27 // 128 MiB
    return {
      payloadHandler: async () => {
        const bytes = await streamToUint8Array(
          decrypt(aes256gcm, fileStream(chelonia, manifest), (actualKeyId) => {
            if (Buffer.from(actualKeyId).toString() !== keyId) {
              throw new Error('Invalid key ID')
            }
            return IKM
          }, maxRecordSize)
        )
        return new Blob([bytes], { type: manifest.type || 'application/octet-stream' })
      }
    }
  }
}

export const noneHandlers: any = {
  upload: (chelonia: Object, manifestOptions: Object) => {
    return {
      cipherParams: undefined,
      streamHandler: (stream: ReadableStream) => {
        return stream
      },
      downloadParams: undefined
    }
  },
  download: (chelonia: Object, downloadParams: Object, manifest: Object) => {
    return {
      payloadHandler: async () => {
        const bytes = await streamToUint8Array(fileStream(chelonia, manifest))
        return new Blob([bytes], { type: manifest.type || 'application/octet-stream' })
      }
    }
  }
}

// TODO: Move into Chelonia config
const cipherHandlers = {
  aes256gcm: aes256gcmHandlers,
  none: noneHandlers
}

export default (sbp('sbp/selectors/register', {
  'chelonia/fileUpload': async function (chunks: Blob | Blob[], manifestOptions: Object) {
    if (!Array.isArray(chunks)) chunks = [chunks]
    const chunkDescriptors: Promise<[number, string]>[] = []
    const cipherHandler = await cipherHandlers[manifestOptions.cipher]?.upload?.(this, manifestOptions)
    if (!cipherHandler) throw new Error('Unsupported cipher')
    const cipherParams = cipherHandler.cipherParams
    const transferParts = await Promise.all(chunks.map(async (chunk: Blob, i) => {
      const stream = chunk.stream()
      const encryptedStream = await cipherHandler.streamHandler(stream)
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
    return {
      manifestCid: await uploadResponse.text(),
      downloadParams: cipherHandler.downloadParams
    }
  },
  'chelonia/fileDownload': async function ({ manifestCid, downloadParams }: { manifestCid: string, downloadParams: Object }, manifestChecker?: (manifest: Object) => boolean | Promise<boolean>) {
    const manifestResponse = await fetch(`${this.config.connectionURL}/file/${manifestCid}`, {
      method: 'GET',
      signal: this.abortController.signal
    })
    if (!manifestResponse.ok) {
      throw new Error('Unable to retrieve manifest')
    }
    const manifestBinary = await manifestResponse.arrayBuffer()
    if (createCID(coerce(manifestBinary)) !== manifestCid) throw new Error('mismatched manifest hash')
    const manifest = JSON.parse(Buffer.from(manifestBinary).toString())
    if (typeof manifest !== 'object') throw new Error('manifest format is invalid')
    if (manifest.version !== '1.0.0') throw new Error('unsupported manifest version')
    if (!Array.isArray(manifest.chunks)) throw new Error('missing required field: chunks')

    if (manifestChecker) {
      const proceed = await manifestChecker?.(manifest)
      if (!proceed) return false
    }

    const cipherHandler = await cipherHandlers[manifest.cipher]?.download?.(this, downloadParams, manifest)
    if (!cipherHandler) throw new Error('Unsupported cipher')

    return cipherHandler.payloadHandler()
  }
}): string[])
