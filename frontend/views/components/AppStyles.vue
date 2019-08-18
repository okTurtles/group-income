<template lang='pug'>
v-style.
  :root {
    --primary_0: {{colors.primary_0}};
    --primary_0_1: {{lightenDarkenColor(colors.primary_0, -0.1)}};
    --primary_1: {{colors.primary_1}};
    --primary_2: {{colors.primary_2}};
    --success_0: {{colors.success_0}};
    --success_0_1: {{lightenDarkenColor(colors.success_0, -0.1)}};
    --success_1: {{colors.success_1}};
    --success_2: {{colors.success_2}};
    --warning_0: {{colors.warning_0}};
    --warning_0_1: {{lightenDarkenColor(colors.warning_0, -0.1)}};
    --warning_1: {{colors.warning_1}};
    --warning_2: {{colors.warning_2}};
    --danger_0: {{colors.danger_0}};
    --danger_0_1: {{lightenDarkenColor(colors.danger_0, -0.1)}};
    --danger_1: {{colors.danger_1}};
    --danger_2: {{colors.danger_2}};
    --text_0: {{colors.text_0}};
    --text_1: {{colors.text_1}};
    --general_0: {{colors.general_0}};
    --general_1: {{colors.general_1}};
    --general_2: {{colors.general_2}};
  }
</template>

<script>
import colorsMixins from '@view-utils/colorsManipulation.js'

export default {
  name: 'AppStyles',

  mixins: [colorsMixins],

  computed: {
    colors () {
      return this.$store.getters.colors
    }
  }
}
</script>
