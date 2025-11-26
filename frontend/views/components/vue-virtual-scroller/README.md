The files in this directory are a stub implementation of
[`vue-virtual-scroller`](https://github.com/Akryum/vue-virtual-scroller/).

The reason they are a stub implementation is that they provide compatibility
with the `vue-virtual-scroller` APIs, but don't actually implement virtual
scrolling. What this means is that all items passed to `DynamicScroller` will
be rendered (instead, with the real `vue-virtual-scroller`, `DynamicScroller`
only renders those elements which are visible).

The goal later on, as detailed in [issue #2896](https://github.com/okTurtles/group-income/issues/2896),
is to add back `vue-virtual-scroller`.

The source code for both `DynamicScroller.vue` and `DynamicScrollerItem.vue`
contain parts taken verbatim from `vue-virtual-scroller`. This is the content
of the `LICENSE` file found there:

> MIT License
>
> Copyright (c) 2020 guillaume.b.chau@gmail.com
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.
