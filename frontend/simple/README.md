# Group Income Simple

This is the application itself.

Entry point is `main.js`.

### Dev notes & comments

We modify `superagent` to make it `async`/promise friendly:

```js
superagent.Request.prototype.end = Promise.promisify(superagent.Request.prototype.end)
```

Now we can do:

```js
async function () {
  var response = await request.post('/blah').send({name:'foo'}).end()
}
```
