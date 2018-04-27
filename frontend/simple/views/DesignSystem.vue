<template>
  <div class="section container">
    <h1 class="title is-1">Style Guide</h1>
    <div class="columns is-multiline">
      <div class="column is-4">
        <h2 class="title is-4 gi-title">Typography</h2>
        <p class="title is-1">Title is-1</p>
        <p class="title is-2">Title is-2</p>
        <p class="title is-3">Title is-3</p>
        <p class="title is-4">Title is-4</p>
        <p class="title is-5">Title is-5</p>
      </div>

      <div class="column is-4">
        <h2 class="title is-4 gi-title">Text</h2>
        <p>In an ideal world this website wouldn’t exist, a client would acknowledge the importance of having web copy before the design starts. Needless to say it’s very important, content is king and people are beginning to understand that. </p>
        <p class="has-text-grey">However, back over in reality some project schedules and budgets don’t allow for web copy to be written before the design phase. - has-text-grey</p>
        <p class="is-size-7 has-text-weight-bold">This is sad but true. - is-size-7 has-text-weight-bold</p>
      </div>

      <div class="column is-4">
        <h2 class="title is-4 gi-title">Spacing</h2>
        <div class="level"
          v-for="spacer in spacings" :key="spacer.name"
        >
          <div class="level level-left">
            <div class="level-item">
              <span class="gi-figure gi-spacing":class="`has-spacer-${spacer.name}`"></span>
              <p class="gi-code">$spacer-{{ spacer.name }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="column is-12">
        <h2 class="title is-4 gi-title">Color</h2>
        <div class="columns is-gapless has-text-centered">
          <div class="column" v-for="color in colors" :key="color.name">
            <span class="gi-palette" :class="`has-background-${color.name}`"></span>
            <p class="gi-code">${{ color.name }}</p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
<style lang="scss" scoped>
@import "../sass/theme/index";

.gi-title {
  border-top: 1px solid $primary;
  padding: $gi-spacer 0 $gi-spacer-lg;
  margin-top: $gi-spacer-lg;
}

.gi-figure {
  display: inline-block;
  border: 2px dotted $blue;
  width: $gi-spacer-md;
  height: $gi-spacer-md;
  margin-right: $gi-spacer;

  &.has-spacer {
    &-lg {
      width: $gi-spacer-lg;
      height: $gi-spacer-lg;
    }

    &-sm {
      width: $gi-spacer-sm;
      height: $gi-spacer-sm;
    }
  }
}

.gi-palette {
  display: inline-block;
  width: 100%;
  height: 5rem;
}

.gi-code {
  font-family: $family-monospace;
}
</style>
<script>
export default {
  name: 'DesignSystemView',
  data () {
    return {
      colors: [
        {
          name: 'primary'
        }, {
          name: 'secondary'
        }, {
          name: 'success'
        }, {
          name: 'warning'
        }, {
          name: 'tertiary'
        }, {
          name: 'danger'
        }
      ],
      spacings: [
        {
          name: 'lg'
        }, {
          name: 'md'
        }, {
          name: 'sm'
        }
      ]
    }
  }
}
</script>
