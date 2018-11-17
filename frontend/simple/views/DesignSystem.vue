<template>
  <main>
    <section class="section">
      <h1 class="title is-1">Design System</h1>

      <div class="is-size-5">
        <p>A design system exists to help you build more cohesive interfaces. Follow the guidelines for the most common elements: Typography, Spacing, Colors, etc...</p>
      </div>

      <h2 class="title is-3 c-title">Theming</h2>
      <div class="is-size-5">
        <p>The default theme is <strong>kindergaten-professional</strong> and can be found at <code>/assets/sass/</code>.</p>
        <p>Group Income Design System is built with <a href="https://bulma.io/">Bulma</a>. Everything that can be solved with Bulma's variables should be solved with it and hardcoded values should be avoided.</p>
        <p>To know more about how to use and customize Bulma read <code>docs/Style-Guide.md</code></p>
      </div>

      <h2 class="title is-3 c-title">Typography</h2>
      <h3 class="title is-4">Titles</h3>
      <table class="table is-fullwidth is-vertical-middle c-table">
        <thead>
          <th>code</th>
          <th>demo</th>
        </thead>
        <tr v-for="scale in [1, 2, 3, 4, 5, 6, 7]">
          <td class="is-narrow"><code>.title .is-{{scale}}</code></td>
          <td class="title" :class="`is-${scale}`">Good morning everyone</td>
        </tr>
        <tr>
          <td class="is-narrow"><code>.subtitle</code></td>
          <td class="subtitle">Good morning everyone</td>
        </tr>
      </table>

      <h2 class="title is-4">Body Copy</h2>
      <table class="table is-fullwidth is-vertical-middle c-table">
        <thead>
          <th>code</th>
          <th>demo</th>
        </thead>
        <tr>
          <td class="is-narrow">(default)</td>
          <td>A basic income, also called basic income guarantee, universal basic income (UBI), basic living stipend (BLS), or universal demogrant, is a type of program in which citizens (or permanent residents) of a country may receive a regular sum of money from a source such as the government. A pure or unconditional basic income has no means test, but unlike Social Security in the United States it is distributed automatically to all citizens without a requirement to notify changes in the citizen's financial status. Basic income can be implemented nationally, regionally or locally. The World Bank's World Development Report 2019 on the future of work describes the existing schemes around the world.</td>
        </tr>
        <tr>
          <td class="is-narrow"><code>$text-light<br />.has-text-text-light</code></td>
          <td class="has-text-text-light">Use this color on non critical texts.</td>
        </tr>
        <tr>
          <td class="is-narrow"><code>$link</code></td>
          <td>Make sure <a href="#">the link is readable</a> for everyone, this is, accessible.</td>
        </tr>
      </table>

      <h2 class="title is-3 c-title">Spacing</h2>
      <table class="table is-fullwidth is-vertical-middle c-table">
        <thead>
          <th>code</th>
          <th>demo</th>
        </thead>
        <tr v-for="spacer in ['xs', 'sm', '', 'lg']">
          <td class="is-narrow" v-if="spacer"><code>$gi-spacer-{{spacer}}</code></td>
          <td class="is-narrow" v-else="spacer"><code>$gi-spacer</code></td>
          <td><span class="c-spacer" :class="spacer"></span></td>
        </tr>
      </table>

      <h2 class="title is-3 c-title">Color</h2>

      <p class="is-size-5">Bulma has much <a href="https://bulma.io/documentation/customize/variables/">more variables</a> that we haven't needed to use so far. Stick with Brand and Support variables and avoid raw color variables ($white, $blue, $grey, etc...) so when we have multiple themes, the migration between those is impartial from raw variables. (Note: This is still happening around on borders color and should be fixed)</p>

      <br/><br/>

      <h3 class="title is-4">Brand</h3>
      <table class="table is-fullwidth is-vertical-middle c-table">
        <thead>
          <th>color</th>
          <th>code</th>
          <th>usage</th>
        </thead>
        <tr v-for="color in config.colors.brand">
          <td class="is-narrow"><span class="c-palette" :class="`has-background-${color.name}`"></span></td>
          <td class="is-narrow"><code>${{color.name}} <template v-if="!color.noClass"><br/>.has-background-{{color.name}}</template></code></td>
          <td v-html="color.usage"></td>
        </tr>
      </table>

      <h3 class="title is-4">Support</h3>
      <table class="table is-fullwidth is-vertical-middle c-table">
        <thead>
          <th>color</th>
          <th>code</th>
          <th>usage</th>
        </thead>
        <tr v-for="color in config.colors.support">
          <td class="is-narrow"><span class="c-palette" :class="`has-background-${color.name}`"></span></td>
          <td class="is-narrow"><code>${{color.name}} <template v-if="!color.noClass"><br/>.has-background-{{color.name}}</template></code></td>
          <td v-html="color.usage"></td>
        </tr>
      </table>

      <hr />

      <h3 class="title is-3">Help</h3>
      <p class="is-size-5">If you have suggestions or contributions feel free to reach us on [Slack] or open an issue or PR in [Github].</p>
    </section>
  </main>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";

.c-title {
  margin-top: $gi-spacer-xl;
}

.c-table {
  td:first-child {
    padding-right: $gi-spacer-lg;
  }
}

.c-spacer {
  display: inline-block;
  border: 1px dashed $primary;
  width: $gi-spacer;
  height: $gi-spacer;
  margin-right: $gi-spacer;

  &.lg {
    width: $gi-spacer-lg;
    height: $gi-spacer-lg;
  }

  &.sm {
    width: $gi-spacer-sm;
    height: $gi-spacer-sm;
  }

  &.xs {
    width: $gi-spacer-xs;
    height: $gi-spacer-xs;
  }
}

.c-palette {
  display: inline-block;
  width: $gi-spacer-xl;
  height: $gi-spacer-xl;
  border-radius: $radius;
  margin-right: $gi-spacer;

  &.has-background-primary-bg-s {
    background: $primary-bg-s;
  }

  &.has-background-primary-bg-a {
    background: $primary-bg-a;
  }
}
</style>
<script>
export default {
  name: 'DesignSystemView',
  data () {
    return {
      config: {
        colors: {
          brand: [
            {
              name: 'dark',
              usage: 'Used on texts by. No need to use <code>$dark</code>, is <code>body</code>\'s default color value.'
            },
            {
              name: 'primary',
              usage: 'Used on main decorative / interactive elements. Note that text with $primary color (example a <a href="#">a link</a>) is slightly darker for A11Y reasons'
            },
            {
              name: 'primary-light',
              usage: 'Used as background on secondary interactive elements (ex: Group Contributions Graph)'
            },
            {
              name: 'primary-bg-s',
              noClass: true,
              usage: 'Used as background on sidebar.'
            },
            {
              name: 'primary-bg-a',
              noClass: true,
              usage: 'rgba() (with transparent) variant of <code>$primary-bg-s</code>. Used as background on :hover/:focus of interactive elements (ex: icon buttons and interactive contributions boxs).'
            },
            {
              name: 'secondary',
              usage: 'Used as an auxiliar color on decorative elements'
            },
            {
              name: 'tertiary',
              usage: 'Used as another auxiliar color on decorative elements'
            }
          ],
          support: [
            {
              name: 'success',
              usage: 'Used on elements to show something good happened - Do not mix its usage with $secondary (same color in this theme but with  different meanings)'
            },
            {
              name: 'warning',
              usage: 'Used on elements to show something not that good happened - Do not mix its usage with $tertiary (same color in this theme but with different meanings)'
            },
            {
              name: 'danger',
              usage: 'Used on elements to show something wrong happened'
            },
            {
              name: 'light',
              usage: 'Used on box backgrounds or hover'
            }
          ]
        }
      }
    }
  }
}
</script>
