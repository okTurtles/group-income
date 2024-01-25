import allowedUrlsByKey from '@view-utils/allowedUrls.js'
import { has } from '~/frontend/model/contracts/shared/giLodash.js'

export default function safeLinkTag (key: string): string {
  if (!has(allowedUrlsByKey, key)) {
    throw new Error(`Unknown URL key: ${key}`)
  }
  // Make sure to include `noopener` and `noreferrer` in the `rel` attribute,
  // to prevent reverse tabnabbing attacks.
  return `<a class="link" href="${allowedUrlsByKey[key]}" target="_blank" rel="noopener noreferrer">`
}
