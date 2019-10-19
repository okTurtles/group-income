export function activateWebShare (data: { title?: string, url?: string, text?: string }) {
  navigator.share(data)
}