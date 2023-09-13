'use strict'

// any constants that are dedicated to the UI of the app should be kept in this file.
// (context: https://github.com/okTurtles/group-income/pull/1694#discussion_r1304706653)

export const CHAT_ATTACHMENT_SUPPORTED_EXTENSIONS = [
  // reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
  '.avif', '.bmp', '.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.tif', '.tiff', '.webp', // image
  '.aac', '.cda', '.mid', '.midi', '.mp3', '.oga', '.opus', '.wav', '.weba', // audio
  '.avi', '.mov', '.mp4', '.mpeg', '.ogv', '.ogx', '.ts', '.webm', '.3gp', '.3g2', // video
  '.arc', '.bz', '.bz2', '.epub', '.gz', '.jar', '.rar', '.tar', '.zip', '.7z', // archive
  '.csh', '.css', '.csv', '.doc', '.docx', '.htm', '.html', '.ics', '.js', '.json', '.jsonld', '.md', '.mjs',
  '.odp', '.ods', '.odt', '.pdf', '.php', '.ppt', '.pptx', '.sh', '.txt', '.xhtml', '.xls', '.xlsx', '.xml', // common text/document
  '.eot', '.otf', '.rtf', '.ttf', '.woff', '.woff2', // font
  '.abw', '.azw', '.bin', '.csh', '.db', '.mpkg', '.vsd', '.xul' // miscellaneous
]
