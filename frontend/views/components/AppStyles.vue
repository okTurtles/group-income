<template lang='pug'>
v-style.
  :root {
    --primary_0: {{colors.primary_0}};
    --primary_0_1: {{lightenDarkenColor(colors.primary_0, softTone)}};
    --primary_1: {{colors.primary_1}};
    --primary_2: {{colors.primary_2}};
    --success_0: {{colors.success_0}};
    --success_0_1: {{lightenDarkenColor(colors.success_0, softTone)}};
    --success_1: {{colors.success_1}};
    --success_2: {{colors.success_2}};
    --warning_0: {{colors.warning_0}};
    --warning_0_1: {{lightenDarkenColor(colors.warning_0, softTone)}};
    --warning_0_text: {{colors.warning_0_text}};
    --warning_0_2: {{colors.warning_0_2}};
    --warning_1: {{colors.warning_1}};
    --warning_2: {{colors.warning_2}};
    --danger_0: {{colors.danger_0}};
    --danger_0_1: {{lightenDarkenColor(colors.danger_0, softTone)}};
    --danger_1: {{colors.danger_1}};
    --danger_2: {{colors.danger_2}};
    --danger_3: {{colors.danger_3}};
    --text_0: {{colors.text_0}};
    --text_1: {{colors.text_1}};
    --general_0: {{colors.general_0}};
    --general_1: {{colors.general_1}};
    --general_1_opacity_6: {{hexToRgbA(colors.general_1, 0.6)}};
    --general_2: {{colors.general_2}};
    --background_0: {{colors.background_0}};
    --background_0_opacity_0: {{hexToRgbA(colors.background_0, 0)}};
    --text-size: {{fontSize}}px;
  }
</template>

<script>
import colorsMixins from '@view-utils/colorsManipulation.js'

// importing this here (outside of the style tag) is important,
// because this is what results in the global main.css file
// being placed in dist/assets/css/main.css, which is included
// by index.html
import '@assets/style/main.scss'
import { mapGetters } from 'vuex'

export default ({
  name: 'AppStyles',

  mixins: [colorsMixins],

  computed: {
    ...mapGetters([
      'fontSize',
      'colors'
    ]),
    softTone () {
      return this.colors.theme === 'dark' ? 0.1 : -0.1
    }
  }
}: Object)
</script>
