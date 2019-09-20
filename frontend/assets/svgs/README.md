# Illustrations as inline SVGs

## What it is

We have a good amount of [nice illustrations across Group Income](https://www.figma.com/file/mxGadAHfkWH6qApebQvcdN/Group-Income-2.0?node-id=1876%3A17778). Those illustrations' colors need to be customized based on the current theme. For that reason we display them in inline SVGs.

The main advantage of this approach is being able to modify directly SVG properties (ex: `fill`) to adapt correctly to each theme.

## How it works

### Creation

All Svgs are at `assets/svgs/original`, exported [from Figma](https://www.figma.com/file/mxGadAHfkWH6qApebQvcdN/Group-Income-2.0?node-id=1876%3A17778).

### Optimization

When running `grunt dev`, 2 things happen to SVGs: **compression** and **compiling**:

1. **compression** - A Grunt Task `svg_sprite` is run on build time only. In there, [SVGO](https://github.com/svg/svgo/), a tool to compress SVGs, comes to action. The final result is exported to `assets/svgs/compressed`. Do NOT modify any file there directly (note that it's even added to `.gitignore`).

2. **compiling** - A custom loader `svgLoader` is run during watch mode. This allow us to import SVGs directly and use them inline in the code. It also performs two additional things:
    - Remove `width` and `height` attributes from SVG
    - Add a CSS class with the name of the icon `.svg-{file-name}`. This allow us to customize SVGs colors based on the current theme.

### Usage

```
// pug
svg-hello

// js
import SvgHello from '@svgs/hello.svg'
```

**🎈Pro Tip:** During development, if you add a new SVG, it won't be compressed. But don't worry, you don't need to restart `grunt dev`. Just open another terminal window and run `grunt svg_sprite`, wait a few seconds and you are good to go!

### [WIP] Theming

A POC for SVG theming is made at `_colors.scss`. A more robust solution should be done on issue #665.
