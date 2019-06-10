<template lang='pug'>
v-style.
  :root {
    --primary: {{colors.primary}};
    --primary-saturated: {{colors.primarySaturated}};
    --primary-light: {{lightenDarkenColor(colors.primary, 0.1)}};
    --primary-text: {{lightenDarkenColor(colors.primary, -0.15)}};
    --primary-text-hover: {{colors.primaryTextHover}};
    --primary-bg-s: {{colors.primaryBG || lightenDarkenColor(colors.primary, 0.28)}};
    --primary-bg-a: {{colors.primaryBGA || hexToRgbA(colors.primary, 0.2)}};
    --secondary: {{colors.secondary}};
    --tertiary: {{colors.tertiary}};
    --danger: {{colors.danger}};
    --warning: {{lightenDarkenColor(colors.tertiary, 0.1)}};
    --success: {{lightenDarkenColor(colors.secondary, 0.03)}};
    --placeholder: {{colors.placeholder}}
  }

</template>

<script>
import colorsMixins from '@view-utils/colorsManipulation.js'

export default {
  name: 'AppStyles',

  mixins: [ colorsMixins ],

  computed: {
    colors () {
      return this.$store.getters.colors
    }
  }
}
</script>
