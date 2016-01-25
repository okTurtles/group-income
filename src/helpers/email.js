exports.send = function (destination, title, contents) {
  console.log(JSON.stringify({
    destination: destination,
    title: title,
    contents: contents
  }, null, 2))
}
