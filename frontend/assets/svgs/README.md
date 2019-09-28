# Illustrations as inline SVGs

## What it is

We have a good amount of [nice illustrations across Group Income](https://www.figma.com/file/mxGadAHfkWH6qApebQvcdN/Group-Income-2.0?node-id=1876%3A17778). Those illustrations' colors need to be customized based on the current theme. For that reason we display them in inline SVGs.

The main advantage of this approach is being able to modify directly SVG properties (ex: `fill`) to adapt correctly to each theme.

## How it works

All Svgs are at `assets/svgs`. They were [exported from Figma](https://www.figma.com/file/mxGadAHfkWH6qApebQvcdN/Group-Income-2.0?node-id=1876%3A17778) and [compressed with SVGOMG](https://jakearchibald.github.io/svgomg/)

### How to compress

This only needs to be done once. When adding a new icon do this:
- [Go to SVGOMG](https://jakearchibald.github.io/svgomg/)
- Insert a SVG.
- Among other pre-defined options, make sure the following are enabled:
  - precision: 4 (50%)
  - cleanupIDs
  - removeTitle
  - removeDesc
  - removeUselessStrokeAndFill
  - prefer viewBox to width/height

Export the SVG and save it at `assets/svgs` with the same name as on Figma files.

###  SVG Loader

During development, a SVG loader is run, so we can import SVGs directly and use them inline in the code. Besides that, it also adds a CSS class with the name of the icon `.svg-{file-name}`. This allow us to customize SVGs colors based on the current theme.

### Usage

```
// pug
svg-hello

// js
import SvgHello from '@svgs/hello.svg'
```

### [WIP] Theming

A POC for SVG theming is made at `_colors.scss`. A more robust solution should be done on issue #665.
