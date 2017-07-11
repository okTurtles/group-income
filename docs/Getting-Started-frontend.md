# Modern Frontend Web Development Guide

**Author: [Greg Slepak](https://twitter.com/taoeffect)**

This is a guide for web designers and developers, useful for general understanding, and is also tailored specifically to how we're using these techniques in Group Income (Simple Edition).

This guide assumes you know how to use `git` and GitHub!

If you already fully grok modern web dev and want to get started immediately, skip ahead to [Frontend Workflow](#frontend-workflow).

*And if you'd like to help out with this project, [get in touch!](https://gitter.im/okTurtles/group-income)*

- ["A Pox On Modern Web Development!"](#a-pox-on-modern-web-development)
    + [What Happened To Web Development?](#what-happened-to-web-development)
    + [The rise of the "single page app"](#the-rise-of-the-single-page-app-spa)
    + [Why??](#why)
    + [Pros/Cons](#proscons)
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
    + [Honorable Mentions: Webpack, Gulp, React, Riot.js, Rollup](#honorable-mentions-webpack-gulp-react-riotjs-rollup)
- [Frontend Workflow](#frontend-workflow)
    + [How do I get set up / just run the site?](#how-do-i-get-set-up--just-run-the-site)
    + [What does `npm install` do?](#what-does-npm-install-do)
    + [What does `grunt dev` do?](#what-does-grunt-dev-do)
    + [What files do I edit?](#what-files-do-i-edit)
    + [How do I add a new page to the website?](#how-do-i-add-a-new-page-to-the-website)
    + [When should I create a `.vue` file instead of an `.ejs` file?](#when-should-i-create-a-vue-file-instead-of-an-ejs-file)
    + [Where should I put non-JavaScript assets like CSS, images, etc.?](#where-should-i-put-non-javascript-assets-like-css-images-etc)
    + [Where should I put JavaScript *someone else* wrote (e.g. jQuery)?](#where-should-i-put-javascript-someone-else-wrote-eg-jquery)
    + [Where's the best place to put JavaScript *that I* create?](#wheres-the-best-place-to-put-javascript-that-i-create)
    + [My web app's `app.js` bundle is huge, how do I break it up?](#my-web-apps-appjs-bundle-is-huge-how-do-i-break-it-up)
    + [My question isn't listed here!](#my-question-isnt-listed-here)
- [Appendix](#appendix)
    + [What Vue.js is good for (and not)](#what-vuejs-is-good-for-and-not)
    + [What EJS is good for (and not)](#what-ejs-is-good-for-and-not)
    + [Useful Links](#useful-links)

## "A Pox On Modern Web Development!"

Web development used to be simple. Back in the day, all that was needed to make a website was some HTML, CSS, and _maybe_ some Photoshop or a sprinkling of "JavaScript". If you wanted to get fancy, _maybe_ some PHP.

Those days are long over.

Today, web development has mostly forgotten about HTML and CSS. Instead, it's SASS this and JSX that. We've got "Components", and people don't even believe in HTML files anymore. Web frameworks seem to drop out of the sky as if it were christmas every day... What's a seasoned web designer to do?

Don't worry, friend! This document will explain how we got here, and by the end of it you'll understand why modern web development is the way it is and how to pretend as if you didn't care about HTML files either!

### What Happened To Web Development?

In a word, __apps__. From its inception the "web" and "apps" were on a collision course, and most of us didn't realize it. Apps increasingly needed to talk to various web services and would increasingly store much of their data online.

Meanwhile, the tools that were used to create websites became more advanced as the web became more vital and companies began competing to attract visitors using the latest in fancy web technology. This technology was used for one primary purpose: creating user interfaces. And it became _really_ good at it.

At some point the web collectively realized that the web standards known as HTML/CSS/JavaScript (and _web browsers_) had advanced to such a point that they were now beginning to seriously compete with applications. At the same time, application developers were looking at these tools and discovered that they could use them to create applications just as well!

Moreover and most critically, _these fantastic UI/UX tools had AMAZING cross-platform support!_ A breakthrough occurred through the union of two technologies: Node.js and the web browser. Node.js gave JavaScript access to the Desktop OS itself, and thus the web _merged_ with apps.

Various [cross-platform frameworks](https://electron.atom.io/) started popping up promising to slash development time and costs while maintaining a high-quality experience across all platforms, _even mobile devices!_

And thus applications like [Slack](https://slack.com) and [Atom](https://atom.io) were born.

With this came radical shifts in how web development was done. Now it was necessary to "get organized!" Applications needed to run tens, even hundreds of thousands of lines of JavaScript, tossing around HTML and CSS all over the place, and do this all super-efficiently. These New Apps wanted UIs that could be loaded over any modern web browser over the Internet, as well as "Apps" that were just bundled versions of those websites. They also no longer wanted to have to rewrite the wheel for everything, so that led to the rise of _Components_—reusable chunks of HTML/CSS/JavaScript for doing one thing (like displaying a photo album) that could be dropped in to any project as easy as: `<photoalbum></photoalbum>`

React and Vue.js are examples of frameworks that support the creation of such components.

Browserify and Webpack are module systems and bundlers for efficiently organizing and loading the various resources these New Apps need.

### The rise of the "single page app" (SPA)

To those new to "modern web development", one of the quirkiest aspects of it is its use (or more accurately, *non-use*) of HTML files.

Indeed, the modern web app uses *just a single `index.html` file for the entire "website"!*

If you visit one of these "single-page app" sites and `view-source`, you'll see practically nothing, just a mostly empty HTML file that can look like this:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Site</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="static/build.js"></script>
  </body>
</html>

```

The browser, meanwhile, will show a bunch of stuff that doesn't match that HTML!

What's going on?

```html
<script src="static/build.js"></script>
```

This line loads a "javascript bundle", a file that will load everything else that's necessary to display the website, and the JavaScript will be used to *asynchronously load HTML, CSS, image files, etc.* and *swap out the existing document structure for the new stuff*.

You can see what the loaded HTML actually is by using your browser's web dev tools (you can bring them up by right-clicking on a portion of the page and choosing `Inspect Element`).

When links are clicked, or a new "page" is visited, a piece of JavaScript called a **client-side _router_** will do several things:

- It will load the requested document/component/page asynchronously using an AJAX (`XMLHttpRequest` aka XHR)
- It will swap out the old HTML and javascript for the new HTML and JavaScript
- If necessary, it will *programmatically change the website's location bar to display a new URL to give the appearance of a normal "page visit"!*
- It will also programmatically update the browser's history so that the back/forward buttons work normally as user's expect.

**Client-side routers are *the* secret sauce behind SPAs**, and while most "modern frontend web frameworks" will ship with their own, you can find plenty of [standalone ones](https://github.com/tildeio/router.js/), or even [code your own](http://joakim.beng.se/blog/posts/a-javascript-router-in-20-lines.html).

### Why??

Two main reasons:

1. Managing web servers is a PITA.
2. Web apps can become huge, and bundlers like browserify/webpack can make it simpler to manage dependencies. At the same time, many of these tools and frameworks (especially webpack and anything more complicated than Vue.js), add lots of totally unnecessary complexity that 95% of front-end developers *[don't need](https://slack-files.com/T03JT4FC2-F151AAF7A-13fe6f98da)*, especially in an [HTTP2 world](https://blog.cloudflare.com/http-2-for-web-developers/).

It used to be that servers would render HTML (using a server-side templating language and/or programming language like PHP) for each page that is visited. Everyone remembers putting this in their HTML (right?):

```php
<? include($_SERVER['DOCUMENT_ROOT'] . '/includes/header.php'); ?>
```

Well, as convenient as that was (to avoiding repeating the same HTML all over the place), it required there be *a server* that did all the heavy-lifting, assembling each one of these pages and sending the HTML back to clients. That's problematic for several reasons:

- It puts more load on the server for something that clients (web browsers) could do themselves
- More importantly, it requires that someone run and maintain one of these PHP servers

Well, with client-side rendering and single-page apps, you can now put all of that logic into the client-side javascript and ship *most of your website, except the database (essentially)* as **static files** that can be hosted anywhere! Just toss them onto a CDN (or multiple CDNs!) and be done with it!

The database portion continues to live on the server and now *just* provides a RESTful API.

### Pros/Cons

__Cons__

- Some people might find this setup confusing and difficult to work with as it requires a lot of machinery (like Browserify/Webpack).
- Only some search engines support indexing such ~~websites~~ web *apps*, because they require JavaScript to display the page.
- Similarly, won't work for users who disable JavaScript.

__Pros__

- Reduces reliance on servers. This is a Good Thing™ both from a performance standpoint as well as a general Internet POV. Now the server just acts as an API and does little else.
- You can distribute your entire website/app as _static files!_ Just chuck your `index.html` and `app.js` file (and any other static resources) onto any CDN (even IPFS!) and you're good to go. No need to worry about managing a server! You can even create a purely P2P app this way with "no server"!
- For large web apps it makes it much easier to dynamically load (and unload) only those resources/components/widgets that the application currently needs.

## Architecture Stack Overview

These are the technologies this project uses. You don't need to understand everything about them, but you must at least read the descriptions below to understand _what_ they are. They are listed in order of lowest-level to highest-level:

###### __[Node.js](https://nodejs.org/)__ - _JavaScript Environment_

Node.js is the platform that all the other tech we use builds upon. It's _an environment for running javascript outside of the browser_, and it has been used to do almost everything, from creating web servers, to creating tools and utilities, to powering standalone applications like Slack.

###### __[NPM](https://www.npmjs.com/)__ - _Node Package Manager_

Used for all kinds of JavaScript projects (backend and/or frontend). Any sort of module/library/framework you can think of is stored here. Yes, even jQuery. ;)

###### __[Grunt](https://gruntjs.com/)__ - _Task Runner_

For doing things like:

- Setting up a local development environment with servers to view your website, power a backend API, and automatically refreshing your browser anytime files are modified
- Watching files for changes and performing actions automatically (like syntax-checking/"linting" them, combining them, copying them, etc.)
- Converting files from one format into another (bundling `.vue` and `.ejs` files into `.js`, etc.)

###### __[Hapi.js](https://hapijs.com/)__ - _Node.js-powered HTTP(S) Server_

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

A frontend web framework that takes some inspiration from React, but is simply better in many ways (TLDR: just as powerful and *far* simpler):

- [http://blog.evanyou.me/2015/10/25/vuejs-re-introduction/](http://blog.evanyou.me/2015/10/25/vuejs-re-introduction/)
- [https://vuejs.org/guide/comparison.html](https://vuejs.org/guide/comparison.html)
- [https://medium.com/the-vue-point/announcing-vue-js-2-0-8af1bde7ab9](https://medium.com/the-vue-point/announcing-vue-js-2-0-8af1bde7ab9)

In the section [What Vue.js is good for (and not)](#what-vuejs-is-good-for-and-not) we discuss its role and when/where/how to use it.

[Riot.js](http://riotjs.com/) is another (very similar) fantastic framework for working with single-page-apps (SPAs). Both are great, I just came across Vue.js first.

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

We chose Bulma because it's more lightweight than Bootstrap.

##### Honorable Mentions: [Webpack](https://webpack.github.io/), [Gulp](http://gulpjs.com/), [React](https://github.com/facebook/react), [Riot.js](http://riotjs.com), [Rollup](https://rollupjs.org)

We've chosen (for now at least) to use Browserify over Webpack, Grunt over Gulp, and Vue.js over React, even though these are all perfectly fine tools in the modern web development toolkit. Briefly, our reasoning:

- Although Webpack has features that Browserify does not, it is also far more difficult to get up and running with, and I don't think it provides web-based implementations of Node.js's API the way Browserify does. For now at least, Browserify seems to be serving our needs just fine, and [it's unlikely](https://github.com/okTurtles/group-income-simple/issues/44) that we'll switch away from it.
- The reasons for choosing Vue.js over React are mentioned [above](#vuejs---modern-frontend-component-framework).
- Grunt and Gulp appear to be about evenly matched, and although Gulp seems to be hip and has a nifty design, Grunt is also perfectly well designed too and works just as well. We were already experienced with Grunt so we went with it. Plus, we like its emphasis on configuration over code and its native support for template strings. Either tool will serve you well.
- Riot.js is very similar to Vue.js, perhaps even more minimalist. I might have used it instead had I come across it first. Both are great!
- Rollup is an extremely efficient bundler that takes advantage of ES6 modules to bundle only the functions you use and their dependencies (instead of entire modules). Because of this it produces smaller bundles than either Browserify or Webpack (currently). Webpack 2 plans to also implement the tooling necessary to do this, and you can use Rollup with Browserify via the [rollupify](https://github.com/nolanlawson/rollupify) transform.

## Frontend Workflow

For those new to "modern web development", we have a section above to quickly bring you up to speed, and you should read that first: __["A Pox On Modern Web Development!"](#a-pox-on-modern-web-development)__

#### How do I get set up / just run the site?

The instructions below are for *NIX systems like OS X and Linux.

Pre-reqs:

1. Install [node.js](https://nodejs.org/) if you haven't already. On a Mac the recommended way to install Node is via [Homebrew](https://brew.sh/) via: `brew install node`
2. Install the [`grunt`](https://gruntjs.com/) command line tool via: `npm install -g grunt-cli`

Once you have `npm`, and `grunt`, clone this repo using `git`, and within the `group-income-simple` directory run these two commands:

```
npm install
grunt dev
```

If all went well you should be able to visit: [http://localhost:8000](http://localhost:8000)

----

#### What does `npm install` do?

It installs the dependencies that this project relies on and places them into the `node_modules/` folder. The list of dependencies is retrieved from the `package.json` file, and a list of the exact versions installed is stored in the [`package-lock.json` file](http://jpospisil.com/2017/06/02/understanding-lock-files-in-npm-5.html). We've set up `grunt` to verify you always have the latest dependencies installed, but you do need to run this command at least once.

----


#### What does `grunt dev` do?

A lot of things. Its output will tell you exactly what it does, but the general idea is:

- It runs the backend API server whose "start" file is: `backend/index.js`
- It creates a `dist/` folder and copies and compiles files from within the `frontend/` folder into it
- It launches a web server to let you see the site
- It watches files for changes, recompiling them and refreshing the browser anytime most files in `frontend/` are changed, and re-running the backend API server whenever files in `backend/` are changed

----

#### What files do I edit?

The `frontend/simple/` folder contains the frontend code.

The other files/folders within `frontend/` should be ignored:

- `frontend/index.html` - Just a placeholder for [the groupincome.org repo](https://github.com/okTurtles/groupincome.org).
- `_static/` - To be deleted soon. Contains markup that's being converting into `.vue` and `.ejs` files.

Here are the important files and folders within `frontend/simple/`:

- `index.html` - This is the "entry point" for the frontend and the _only HTML file_ in the entire web app. Everything starts with this file being served. It loads the `dist/app.js` bundle that gets created by Browserify, and that file contains the contents of all of the `.js`, `.vue`, and `.ejs` files.
    + __Designer note:__ This file is _purposefully minimal!_ You will rarely need to modify this file. If we modify it, it might only be to make it even smaller by removing any unnecessary `<script>` and `<link>` tags within it. This file is the "header and footer" that gets applied to _every "page"_ of our web app, and for that reason it's best to keep it as short as necessary.
- `main.js` - This is the entry point for all of the frontend code, where our modern web app starts. This file is responsible for setting up the Vue.js [`vue-router`](https://github.com/vuejs/vue-router), the client-side machinery that replicates the effect of having "different pages with different URLs" (modern web dev trickery that unbelievably isn't as ridiculous as it sounds). It is also responsible for loading all of the other "pages" (located in `views/`) and code (located in `js/`) that the website has.
    + __Designer note:__ If you want to add a "new page" to the site (i.e. a new link in the top `<nav>` bar), then you will need to modify this file to update the routes.
- `views/` - This contains all of the "pages" of the website. These are stored as either [`.vue` files](https://vue-loader.vuejs.org/en/start/spec.html) or `.ejs` files, which are just HTML files that support [using JavaScript like PHP](http://ejs.co) between [`<%` and `%>` tags](https://github.com/mde/ejs/blob/master/README.md#features).
    + __Designer note:__ See: [When should I create a `.vue` file instead of an `.ejs` file?](#when-should-i-create-a-vue-file-instead-of-an-ejs-file)
- `js/` - Folder for placing "handy js that's used in lots of places" _that you wrote_ (not third-party, [that goes in `assets/vendor/`](#where-should-i-put-javascript-someone-else-wrote-eg-jquery)).
    + __Designer note:__ Generally as a designer you can ignore this folder. Most of the JavaScript that designers need can either be `require`'d (see the next section) or created directly within `.vue` or `.ejs` files.
- `sass/` - These are used (along with the Bulma framework) to generate the css files for the site. Can contain either `.sass` or `.scss` files.
- `assets/` - Grunt simply copies the folders within here to the output directory: `dist/`. This is where you drop in CSS files, images, and any other static assets.
    + __Developer note:__ Currently we do not [translate](https://github.com/gruntjs/grunt-contrib-sass), optimize, minify, or [fingerprint](http://guides.rubyonrails.org/asset_pipeline.html#what-is-fingerprinting-and-why-should-i-care-questionmark) any of these assets, but we will (using grunt). We won't, however, be "bundling" these assets via Webpack or browserify. "Bundling" refers to the practice of concatenating js, css (sometimes [even images!](https://github.com/webpack/file-loader)) and putting into a single `.js` file. This might have [made sense in the HTTP/1.0 days](https://jakearchibald.com/2016/link-in-body), however HTTP/2.0 makes this bizarro practice [totally unnecessary](https://blog.cloudflare.com/http-2-for-web-developers/).

----

#### How do I add a new page to the website?

1. Create either a new `.vue` or `.ejs` file within `simple/views`
2. Link to it using the [router-link](https://router.vuejs.org/en/api/router-link.html) directive, and if necessary update the `index.html` file (which currently has a global header/footer with page links)
3. Update the [`vue-router` mapping](https://router.vuejs.org/en/) configuration in `simple/main.js`

If you're adding an `.ejs` file, you might add the following to the router config:

```js
path: '/example-page',
component: { template: wrap(require('./views/test.ejs')) },
meta: {
  title: 'Example Page'
}
```

The `wrap` function wraps the content of the file in a tag (`div` by default) in order to prevent [fragment instances](https://v1.vuejs.org/guide/components.html#Fragment-Instance) (which [aren't allowed in Vue.js 2.0](https://vuejs.org/v2/guide/migration.html#Fragment-Instances-removed)).

If you're adding a `.vue` file, you could add:

```js
path: '/example-page',
component: ExamplePage,
meta: {
  title: 'Example Page'
}
```

----

#### When should I create a `.vue` file instead of an `.ejs` file?

- If you're creating a logic-heavy page that takes advantage of Vue.js's two-way data bindings feature.
- If you are designing a complex, self-contained reusable component. In Group Income, a good candidate for such a component is this payment row widget:

    ![row](https://gitlab.okturtles.com/uploads/okturtles/group-income-simple/b3d1ff2112/row.jpg)

Remember, **you can use Vue.js features within `.ejs` files!**

There's no problem with using the [router-link](https://router.vuejs.org/en/essentials/nested-routes.html) directive within an `.ejs` file when linking to another "page".

Otherwise we recommend sticking with `.ejs` files, although to be honest it doesn't matter much.

See [the Appendix](#appendix) for important notes on using EJS with Vue.js and vice-versa.

----

#### Where should I put non-JavaScript assets like CSS, images, etc.?

*If they're your assets:*

Just place them into the appropriate folder(s) within `simple/assets`. You might need to re-run `grunt dev` and refresh the page (our gruntfile currently doesn't watch for asset changes). Grunt will copy them into `dist/`.

Then load them like normal (so `dist/images/bitcoin.png` is loaded as `<img src="/images/bitcoin.png">`).

*If they're someone else's (e.g. a CSS framework):*

Place them in `simple/assets/vendor`.

Please add only uncompressed/unminified assets to this folder (if possible) as that makes debugging simpler. We'll add minification later on (via grunt).

----

#### Where should I put JavaScript *someone else* wrote (e.g. jQuery)?

Recall that single-page-apps (SPAs) often have [*a single* global JavaScript bundle](#the-rise-of-the-single-page-app-spa) that gets loaded. In our setup, this file is stored in `dist/simple/app.js`.

There are two ways to include third-party code:

1. **"Asynchronously" / "Lazily" / "On Demand":** This is the preferred approach as it prevents `app.js` from getting bloated.
2. **"Globally":** This is through the standard use of `require`. Anything that's `require`'d gets placed into the `app.js` bundle (unless you're using webpack's fancy-but-unnecessary code-splitting features). Unless a third-party library is used so frequently that it makes sense to have it in `app.js`, you should prefer the lazy-load approach.

We cover both approaches below.

**Method 1.1: Lazy-loading a "vendor" lib using Script2**

There are a variety of ways to load code asynchronously. We're going to ignore all of the fancy new techniques that have come along for doing this (that includes [RequireJS](http://requirejs.org)-style AMD files, [code-splitting](https://router.vuejs.org/en/advanced/lazy-loading.html), ["System.import"](https://github.com/systemjs/systemjs), and whatever else they think of next).

Instead, my *strong* recommendation after evaluating all of those … interesting alternatives, is to simply use the good old-fashioned `<script>` tag that everyone is already familiar with, unless there's a very compelling reason not to. This is possible in SPAs (even in frameworks that don't officially support it!) thanks to simple libraries like [VueScript2](https://github.com/taoeffect/vue-script2). You'll waste less time, your website will load faster, and your designer will thank you.

*Example: Loading jQuery only on specific "pages"/routes*

First, grab the latest version of a library you want to include from *from a trusted source* on npm. For example, here's how we did this with jQuery:

```
npm install jquery --save
```

You can check the version that we're using by looking inside `package.json`. Updating to the latest version is done by explicitly requesting it:

```
npm install jquery@latest --save
```

Next we [symlink](https://duckduckgo.com/?q=symbolic+link) it into our `vendor/` folder:

```
$ cd frontend/simple/assets/vendor
$ ln -s ../../../../node_modules/jquery/dist/jquery.js
```

The symlink will make it simple for us to stay up-to-date with the latest version of the library. `grunt dev` will copy the actual file (not the symlink) into the `dist/` folder. We've symlink'd the un-minified version of the library to make debugging easier, and because we can use grunt to minify it when creating production builds.

Next, just load jQuery in your template like normal:

```html
<script src="/simple/vendor/jquery.js"></script>
<script> /* do something with $ */ </script>
```

This will work in both `.vue` and `.ejs` files thanks to the [`script2ify` browserify transform](https://github.com/taoeffect/vue-script2/blob/master/README.md#using-script-via-browserify-transform).

Behind the scenes, this `<script>` tag is transformed into a VueScript2 Vue.js component that injects and loads the scripts. Using VueScript2 prevents jQuery from being bundled, and will load it only when the user visits a route that requests it (and only if it's not already loaded). By default, scripts are loaded one at a time in the order they appear on the page. You can add an `async` attribute to the `<script>` tag to have it be injected immediately without waiting for others.

- :book: See [the `vue-script2` documentation](https://github.com/taoeffect/vue-script2) for more info

**Method 1.2: Lazy-load an entire route**

You can lazy-load an entire route (i.e. an entire "page") by leveraging the *code-splitting* capabilities of browserify or webpack.

- :book: See [the `vue-router` documentation](https://router.vuejs.org/en/advanced/lazy-loading.html) for more info

**Method 2: Globally including a commonly used third-party library**

Any use of `require` (without code splitting) will result in that module's direct inclusion within the `app.js` bundle.

- In `.vue` files, `require` can be used within the `<script>` section (not to be confused with any VueScript2 `<script>` tags in the `<template>` section, see note below).
- In `.ejs` files, `require` can be used between the delimiters `<%` and `%>`.

NOTE: `require` *cannot* be used within inlined `<script>` VueScript2 tags since that code is not parsed when the bundle is created, but at "runtime" when it's injected into a page. However, code within VueScript2 tags can access global variables that were `require`'d elsewhere.

*Please ask before adding any new project dependencies! (Either in [our chat](https://gitter.im/okTurtles/group-income), on the [forums](https://forums.okturtles.com/index.php?board=9.0), or via a GitHub issue.)*

----

#### Where's the best place to put JavaScript *that I* create?

- If the JavaScript is *specific to a page you're working on:* put it directly into the `.ejs` or `.vue` file
- Otherwise, for JS that's used across multiple files, place it into a `.js` file within `simple/js` and then `require` it within a `.vue` or `.ejs` file

----

#### My web app's `app.js` bundle is huge, how do I break it up?

See Methods 1.1. and 1.2 in [Where should I put JavaScript *someone else* wrote (e.g. jQuery)?](#where-should-i-put-javascript-someone-else-wrote-eg-jquery).

----

#### My question isn't listed here!

That's OK! Ask us in the [chat](https://gitter.im/okTurtles/group-income) or the [forums](https://forums.okturtles.com/index.php?board=9.0) or open a GitHub issue! :)

## Appendix

### What Vue.js is good for (and not)

- Reducing HTML markup and making collaboration easier. To open a facebook-style chatbox at the bottom of the window, you just insert `<chatbox param1="foo" param2="bar"></chatbox>`, etc.
- Synchronizing data between the view (the widget) and the model (the JS object). I.e. [two-way data bindings](https://vuejs.org/guide/forms.html). **Rule of thumb:** if data-binding is unnecessary then there's no need for Vue.js to be involved.
- Creating logic-heavy widgets for widget-heavy "apps" like Slack, etc.
- Serving "web 2.0" (2.5?) static websites. I.e. you put your entire modern website in an `.html` file, have it call an API, and serve it to people over a CDN. Thanks to client-side routers the URL will magically change on "page visit". :point_left: This might be the most relevant part for us as it works well with the future move to Ethereum.

It's **not** convenient for much else. It is especially not good for designers who are used to plain-old markup. Apparently, [being friendly toward designers is one of its strong points](https://vuejs.org/guide/comparison.html), but that's compared to other frameworks like React.js / Angular / Ember. Nor is it useful for creating relatively "small" widgets like custom input fields or buttons.

### What EJS is good for (and not)

EJS is basically PHP except JavaScript.

So it is good for that style of programming, and it is therefore much more friendly and usable for designers (and programmers!). It's great for doing simple things like:

- Avoiding repetition by including some file using `<%- include file %>` ([example](https://github.com/okTurtles/group-income-simple/blob/ebafb48385c63d271eb6a210545efbcc8d43d99c/frontend/simple/views/test.ejs#L10))
- Adding simple logic like "display this chunk of HTML `if` something, otherwise display this other thing"

You can even use EJS syntax within `.vue` files by setting the [template language](https://vuejs.org/guide/syntax.html) to `ejs`:

```vue
<template lang="ejs">
  <div class="user-group">
    <h1>{{ msg }}</h1>
    <div><%- include included %></div>
  </div>
</template>
```

### Useful Links

- See our [Architecture Notes](https://github.com/okTurtles/group-income-simple/wiki/Architecture-Notes) for additional useful links and tutorials.
- Some of this discussion comes from [issue 37](https://github.com/okTurtles/group-income-simple/issues/37).
