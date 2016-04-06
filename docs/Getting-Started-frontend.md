# Getting Started With The Frontend

A "modern web development" guide for web designers and developers.

_This guide assumes you know how to use `git` and GitHub!_

- [Architecture Stack Overview](#architecture-stack-overview)
    + [Node.js](#nodejs---javascript-environment)
    + [NPM](#npm---node-package-manager)
    + [Grunt](#grunt---task-runner)
    + [Hapi.js](#hapijs---nodejs-powered-https-server)
    + [Browserify](#browserify---module-system--bundler)
    + [Babel](#babel---tomorrows-javascript-featurestoday)
    + [Vue.js](#vuejs---modern-frontend-component-framework)
    + [EJS](#ejs---like-php-but-javascript)
    + [Bulma](#bulma---lightweight-modern-flexbox-css-framework)
- [Frontend Workflow](#frontend-workflow)
    + [How do I get set up / just run the site?](#how-do-i-get-set-up--just-run-the-site)
    + [What does `npm install` do?](#what-does-npm-install-do)
    + [What does `grunt dev` do?](#what-does-grunt-dev-do)
    + [What files do I edit?](#what-files-do-i-edit)
    + [How do I use jQuery or *[insert javascript library here]*?](#how-do-i-use-jquery-or-insert-javascript-library-here)
    + [My question isn't listed here!](#my-question-isnt-listed-here)
- ["A Pox On Modern Web Development!"](#a-pox-on-modern-web-development)
    + [What Happened To Web Development?](#what-happened-to-web-development)
    + [The rise of the "single page app"](#the-rise-of-the-single-page-app)
    + [What Vue.js is good for (and not)](#what-vuejs-is-good-for-and-not)
    + [What EJS is good for](#what-ejs-is-good-for)
    + [Some code not needed](#some-code-not-needed)

## Architecture Stack Overview

These are the technologies this project uses. You don't need to understand everything about them, but you must at least read the descriptions below to understand _what_ they are (starting from the lowest-level and working our way up):

###### __[Node.js](https://nodejs.org/)__ - _JavaScript Environment_

Node.js is the platform that all the other tech we use builds upon. It's _an environment for running javascript outside of the browser_, and it has been used to do almost everything, from creating web servers, to creating tools and utilities, to powering standalone applications like Slack.

###### __[NPM](https://www.npmjs.com/)__ - _Node Package Manager_

Used for all kinds of JavaScript projects (backend and/or frontend). Any sort of module/library/framework you can think of is stored here. Yes, even jQuery.

###### __[Grunt](http://gruntjs.com/)__ - _Task Runner_

For doing things like:

- Setting up a local development environment with servers to view your website, power a backend API, and automatically refreshing your browser anytime files are modified
- Watching files for changes and performing actions automatically (like syntax-checking/"linting" them, combining them, copying them, etc.)
- Converting files from one format into another (bundling `.vue` and `.ejs` files into `.js`, etc.)

###### __[Hapi.js](http://hapijs.com/)__ - _Node.js-powered HTTP(S) Server_

Powers the backend API that the frontend talks to. It's responsible for managing the database of groups and users, and together with the frontend it uses cookies to authenticate users.

###### __[Browserify](http://browserify.org/)__ - _Module System + Bundler_

Makes it possible to write front-end code in the same way Node.js backend code is written. Instead of including a library like jQuery using a `<script>` tag, you `npm install jquery --save`  it, and then `var $ = require('jquery')` it. Browserify is much more than that however, it also:

- Is designed be extended by "plugins" and "transforms"
- The transforms make it possible to `require` any file format in JavaScript (like `.ejs` and `.vue` files!) and bundle it all together into a single javascript bundle.
- It can act as a pre-processor, so that when files are read in their contents can be transformed in the resulting JS bundle. This includes obvious things like minifying JavaScript, but also can include string-replacement, etc.

###### __[Babel](https://babeljs.io/)__ - _Tomorrow's JavaScript Features—Today!_

The JavaScript language is always evolving. Oftentimes new features will be "solidified" by the standards bodies but won't yet be available in either web browser or Node.js environments. That's where Babel comes in. It lets you use tomorrow's by automatically rewriting files with new syntax into older syntax that browsers (and/or node.js) support.

- Babel can be used through a variety of tools, including Browserify! Vue.js templates automatically use Babel, so you can use the latest JS features within them.
- Like Browserify, Babel also supports plugins. In fact we use one called `transform-inline-environment-variables` to automatically replace environment variables like `process.env.NODE_ENV` with their corresponding values (both on the frontend and the backend).

###### __[Vue.js](http://blog.evanyou.me/2015/10/25/vuejs-re-introduction/)__ - _Modern Frontend Component Framework_

A frontend web framework like React.js but, IMO, significantly simpler and yet at least as powerful. See the important [section below](#TODO-this) is devoted to explaining its role (when/where/how to use it). Vue.js powers many websites, has [a large](https://github.com/vuejs/awesome-vue) [community](http://forum.vuejs.org/), [100% code coverage](https://codecov.io/github/vuejs/vue?branch=master), and [Evan You](https://twitter.com/youyuxi) is amazing.

###### __[EJS](http://ejs.co/)__ - _Like PHP, but JavaScript_

This project supports using it in `.vue` files and by itself in standalone `.ejs` files. Lets you do things like:

```html
<% if (true) { %>
    <div>Hi!</div>
<% } else { %>
    <div>Bye!</div>
<% } %>
```

###### __[Bulma](http://bulma.io/)__ - _Lightweight Modern [Flexbox](https://github.com/okTurtles/group-income-simple/wiki/Architecture-Notes#misc-useful-things) CSS Framework_

Incorporating this to the site is on the TODO and is [an open issue](https://github.com/okTurtles/group-income-simple/issues/16) to take!

## Frontend Workflow

For those new to "modern web development", we have a section below to quickly bring you up to speed, and you should read that first:

__["A Pox On Modern Web Development!"](#a-pox-on-modern-web-development)__

#### How do I get set up / just run the site?

The instructions below are for *NIX systems like OS X and Linux.

Pre-reqs:

1. Install [node.js](https://nodejs.org/) if you haven't already. On a Mac the recommended way to install Node is via [Homebrew](http://brew.sh/) via `brew install node`
2. Install the [`grunt`](http://gruntjs.com/) command line tool via: `npm install -g grunt-cli`

Once you have `npm` and `grunt`, clone this repo using `git` and within the `group-income-simple` directory run these two commands:

```
npm install
grunt dev
```

If all went well you should be able to visit: [http://localhost:8000](http://localhost:8000)

#### What does `npm install` do?

It installs the dependencies that this project relies on and places them into the `node_modules/` folder. We've setup grunt to verify you always have the latest dependencies installed, but you do need to run this command at least once.

#### What does `grunt dev` do?

A lot of things. Its output will tell you exactly what it does, but the general idea is:

- It runs the backend API server whose "start" file is: `backend/index.js`
- It creates a `dist/` folder and copies and compiles files from within the `frontend/` folder into it
- It launches a web server to let you see the site
- It watches files for changes, recompiling them and refreshing the browser anytime most files in `frontend/` are changed, and re-running the backend API server whenever files in `backend/` are changed

#### What files do I edit?

For frontend developers the relevant folders and files are within the `frontend/` folder:

- The files immediately within the `frontend/` folder represent the "top level" of the `groupincome.org` website. These HTML files are not part of "Group Income Simple" itself, they are there mostly to just act as placeholders. The actual website for groupincome.org is located in a [different repo](https://github.com/okTurtles/groupincome.org).
- `_static/` - This folder contains HTML markup that we're converting into `.vue` and `.ejs` files. Just ignore this folder for the most part, it's there only for reference and will be deleted soon.
- `simple/` - __This is where frontend for "Group Income Simple" resides.__

The `frontend/simple/` folder is where the frontend development happens. Here are the important files and folders within it and what their purpose is:

- `index.html` - This is the "entry point" for the frontend and the _only HTML file_ in the entire web app. Everything starts with this file being served. It loads the `dist/app.js` bundle that gets created by Browserify, and that file contains the contents of all of the `.js`, `.vue`, and `.ejs` files.
    + __Designer note:__ This file is _purposefully minimal!_ You will rarely need to modify this file. If we modify it, it might only be to make it even smaller by removing any unnecessary `<script>` and `<link>` tags within it. This file is the "header and footer" that gets applied to _every "page"_ of our web app, and for that reason it's best to keep it as short as necessary.
- `main.js` - This is the entry point for all of the frontend code, where our modern web app starts. This file is responsible for setting up the Vue.js [`vue-router`](https://github.com/vuejs/vue-router), the client-side machinery that replicates the effect of having "different pages with different URLs" (modern web dev trickery that unbelievably isn't as ridiculous as it sounds). It is also responsible for loading all of the other "pages" (located in `views/`) and code (located in `js/`) that the website has.
    + __Designer note:__ If you want to add a "new page" to the site (i.e. a new link in the top `<nav>` bar), then you will need to modify this file to update the routes.
- `views/` - This contains all of the "pages" of the website. These are stored either [`.vue` files](https://vuejs.github.io/vue-loader/start/spec.html) or `.ejs` files, which are just HTML files that support [using JavaScript like PHP](http://ejs.co) between [`<%` and `%>` tags](https://github.com/mde/ejs/blob/master/README.md#features).
    + __Designer note:__ `.vue` files are best suited for creating re-usable components. Make sure to read __[What Vue.js is good for (and not)](#what-vuejs-is-good-for-and-not)__ below! They _can_ be used to create "pages", but for that `.ejs` files seem to make more sense.
- `js/` - Any handy JavaScript code that _you create_ should be placed here.
    + __Designer note:__ Generally as a designer you can ignore this folder. Most of the JavaScript that designers need can either be `require`'d (see the next section) or created directly within `.vue` or `.ejs` files.

#### How do I use jQuery or _[insert javascript library here]_?

Any third-party "vendor" code that you need should be added using `npm`. For example, this project already has `jQuery` (version specified in `package.json`), and that was installed using `npm` like so:

```
npm install jquery --save
```

It can then be used within `.vue` and `.ejs` files by `require`ing it. For example, `views/UserProfileView.vue` (a file that may or may not be renamed/deleted at some point) contains this `<script>` section:

```vue
<script>
var request = require('superagent')
var $ = require('jquery')

export default {
  methods: {
    submit: async function () {
      try {
        var response = await request.post(process.env.API_URL+'/user/')
          .type('form').send($('form.new-user').serialize()).end()
        this.response = response.text
        this.responseClass.error = false
      } catch (err) {
        this.responseClass.error = true
        this.response = err.response.body.message
      }
    }
  },
  data () {
    return {
      msg: 'User Profile!',
      responseClass: {
        error: false
      },
      response: ''
    }
  }
}
</script>
```

Generally speaking: ask before adding any new dependencies! (Either in the [chat](https://gitter.im/okTurtles/group-income) or the [forums](https://forums.okturtles.com/index.php?board=9.0) or a GitHub issue.)

#### My question isn't listed here!

That's OK! Ask us in the [chat](https://gitter.im/okTurtles/group-income) or the [forums](https://forums.okturtles.com/index.php?board=9.0) or open a GitHub issue! :)

## "A Pox On Modern Web Development!"

Web design used to be simple. Back in the good old days all you needed to make a website was HTML, CSS, and _maybe_ some Photoshop or a sprinkling of "JavaScript". If you really wanted to make an impression you _might_ throw in some PHP.

Sadly or gladly, those days are long over.

Nowadays, modern web development has mostly forgotten about HTML and CSS. Instead, it's SASS this and JSX that. "Components". Pfft! They don't even believe in HTML files anymore! Web frameworks dropping out of the sky like candy... What's a seasoned web designer to do?

Welp, don't worry friend, this document is here to bring you up to speed, and you can rest easy knowing that we put in a great amount of effort into making the transition to modern web development understandable, simple, and familiar.

### What Happened To Web Development?

__Apps.__ From its inception the "web" and "app" were on a collision coarse and most of us didn't realize it. Apps increasingly needed to talk to various web services and would increasingly store much of their data online.

Meanwhile, the tools that were used to create websites became more advanced as the web became more vital and companies began competing to attract visitors using the latest in fancy web technology. This technology was used for one primary purpose: creating user interfaces. And it became _really_ good at it.

At some point the web collectively realized that the web standards known as HTML/CSS/JavaScript had advanced to such a point that they were now beginning to seriously compete with applications. At the same time, application developers were looking at these tools and discovered that they could use them to create applications just as well!

Moreover and most critically, _these fantastic UI/UX tools had AMAZING cross-platform support!_ By combining two technologies: Node.js and the modern web browser, JavaScript and its fellow web standards _merged_ with apps.

Various cross-platform frameworks started popping up promising to slash development time and costs while maintaining a high-quality experience across all platforms, _even mobile devices!_

And thus applications like Slack were born.

With this came radical shifts in how web development was done. Now it was necessary to "get organized!" Applications needed to run tens, even hundreds of thousands of lines of JavaScript, tossing around HTML and CSS all over the place, and do this all super-efficiently. These New Apps wanted UIs that could be loaded over any modern web browser over the Internet, as well as "Apps" that were just bundled versions of those website. And they no longer wanted to have to rewrite the wheel for everything, and that led to the rise of _Components_—reusable chunks of HTML/CSS/JavaScript for doing one thing (like displaying a photo album) that could be dropped in to any project as easy as: `<photoalbum></photoalbum>`

React.js and Vue.js are examples of frameworks that support the creation of such components.

Browserify and Webpack are module systems and bundlers to efficiently organizing and loading the various resources these New Apps need.

So, that brings us the next section on Vue.js, which is based on research summarized in issue [#37](https://github.com/okTurtles/group-income-simple/issues/37).

### The rise of the "single page app"

- _Unfinished section!_

Quickly: single page apps (consisting of a single "index.html" file and client-side "routing") are a recent invention. They have their pros as well as their cons.

The basic idea motivation behind them is to move more logic away from the server and to the client.

__Cons__

- Some people will find them confusing and unnecessarily difficult to work with. They require a lot of machinery (like Browserify/Webpack) to work.
- Only some search engines support indexing them because they require JavaScript to display the page.
- They require JavaScript to be enabled. For some people this is a con.

__Pros__

- Reduces reliance on servers. This is a Good Thing™ both from a performance standpoint as well as a general Internet POV.
- Now the server just acts as an API and does little else.
- You can distribute your entire website/app as _static files!_ Just chuck your `index.html` and `app.js` file (and any other static resources) onto any CDN (even IPFS!) and you're good to go. No need to worry about managing a server! You can even create a purely P2P app this way with "no server"!

### What Vue.js is good for (and not)

> Rewrite this section. It's somewhat outdated (in the sense that the decision has been made), and it doesn't fit in with the above because it's just copy/pasted from the [GitHub issue](https://github.com/okTurtles/group-income-simple/issues/37).

- Reducing HTML markup and making collaboration easier. To open a facebook-style chatbox at the bottom of the window, you just insert `<chatbox param1="foo" param2="bar"></chatbox>`, etc.
- Synchronizing data between the view (the widget) and the model (the JS object). I.e. [two-way data bindings](http://vuejs.org/guide/forms.html). **Rule of thumb:** if data-binding is unnecessary then there's no need for Vue.js to be involved.
- Creating logic-heavy widgets for widget-heavy "apps" like Slack, etc.
- Serving "web 2.0" (2.5?) static websites. I.e. you put your entire modern website in an `.html` file, have it call an API, and serve it to people over a CDN. Thanks to client-side routers the URL will magically change on "page visit". :point_left: This might be the most relevant part for us as it works well with the future move to Ethereum.

It's **not** convenient for much else. It is especially not good for designers who are used to plain-old markup. Apparently, [being friendly toward designers is one of its strong points](http://vuejs.org/guide/comparison.html), but that's compared to other frameworks like React.js / Angular / Ember. Nor is it useful for creating relatively "small" widgets like input fields or buttons. 

Many websites, including many "large scale" websites, have little need for this stuff. Even twitter and github don't do the single-page app thing!

### What EJS is good for

EJS is basically PHP except JavaScript.

So it is good for that style of programming, and it is therefore much more friendly and usable for designers (and programmers!).

Vue.js can be used to prevent the EJS from overcrowding the markup.

### Some code not needed

> Rewrite this section. It's somewhat outdated (in the sense that the decision has been made), and it doesn't fit in with the above because it's just copy/pasted from the [GitHub issue](https://github.com/okTurtles/group-income-simple/issues/37).

Sorry @wemeetagain for not figuring this out earlier, but I think you'll agree that it doesn't make sense to replace one line of markup (the `<button>` tag) with a [26 line `.vue` file](https://github.com/okTurtles/group-income-simple/blob/edd63c0ee5bd69bd8e830f57025f3dbbf566d8c2/frontend/simple/components/Button.vue). Suggesting that we do that was my silly mistake. OTOH such mistakes are useful for figuring out what Vue.js is and isn't really useful for.

Many of the `.vue` files could be replaced by `.ejs` files. OTOH with `.ejs` it may be the case that unless we do a bunch of `pagename/index.html` files the `.ejs` will have to be rendered on the fly by Hapi (making the frontend not serve-able by CDNs and possibly causing issues with future Ethereum integration).

If we want to serve static content without a folder hierarchy then the `vue-router` is needed, otherwise not.

If we don't go the single-page static site route then the only thing in #6 that might be worth using Vue.js for is this widget:

![row](https://gitlab.okturtles.com/uploads/okturtles/group-income-simple/b3d1ff2112/row.jpg)
