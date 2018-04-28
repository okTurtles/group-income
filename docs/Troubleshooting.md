# Troubleshooting

## "local user doesn't exist anymore" in Console messages

A common problem when developing is that any users created during a previous run of `grunt dev` are whiped from the server and its database each time `grunt dev` closes, but your browser will remember them and will attempt to login with them.

There are two ways of dealing with this problem:

1. Only use Chrome Incognito windows when developing, and re-create a user(s) for each run of `grunt dev`
2. Clear the site data (**not cookies!** we're using `localStorage`) -- this second step is more involved and described below in detail:

How to clear site data:

If you aren't using an incognito window, you will need to:

1. Right-click the window and choose "Inspect"
2. Click the "Application" tab
3. Click the "Clear storage" item on the left sidebar
4. Scroll down in the content view and click the "Clear site data" button
5. Refresh the page and create a new user again

## Miscellaneous

Make sure:

- You have at least Node version 8 installed
- You're visiting: http://localhost:8000 and **NOT** http://localhost:3000
- You've [followed the setup instructions](Getting-Started-frontend.md#how-do-i-get-set-up--just-run-the-site)

Try:

- `npm cache clean` - This fixed a real problem someone was having
- `npm install npm@latest -g`
