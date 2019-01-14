# Troubleshooting

## Miscellaneous

Make sure:

- You have at least Node version 8 installed
- You're visiting: http://localhost:8000 and **NOT** http://localhost:3000
- You've [followed the setup instructions](Getting-Started-frontend.md#how-do-i-get-set-up--just-run-the-site)

Try:

- `npm cache clean` - This fixed a real problem someone was having
- `npm install npm@latest -g`

## Can not sign-up user when databases get out of sync 

Problem:

where you re-run grunt dev and then can no longer sign up a user because the database on the backend has been wiped, but the database in the browser's frontend still contains contracts that the frontend will try to re-subscribe to.

Try:

- Using a new private window/tab

- Bringing up the browser's dev tools, going into "Storage", and manually clearing/deleting all the Group Income related entries in the "Indexed DB" / "Indexed Database"  
