<template lang="pug">
v-style.
  :root {
    --black: {{colors.black}};
    --white: {{colors.white}};
    --text_black: {{colors.text_black}};
    --primary_blue: {{colors.primary_blue}};
    --primary_purple: {{colors.primary_purple}};
    --primary_green: {{colors.primary_green}};
    --secondary_purple_0: {{colors.secondary_purple_0}};
    --secondary_purple_1: {{colors.secondary_purple_1}};
    --secondary_purple_2: {{colors.secondary_purple_2}};
    --secondary_blue_0: {{colors.secondary_blue_0}};
    --secondary_blue_1: {{colors.secondary_blue_1}};
    --secondary_blue_2: {{colors.secondary_blue_2}};
    --secondary_green_0: {{colors.secondary_green_0}};
    --secondary_green_1: {{colors.secondary_green_1}};
    --secondary_green_2: {{colors.secondary_green_2}};
    --warning: {{colors.warning}};
    --warning_1: {{colors.warning_1}};
    --warning_bg: {{colors.warning_bg}};
    --danger: {{colors.danger}};
    --danger_bg: {{colors.danger_bg}};
    --background_0: {{colors.background_0}};
    --background_1: {{colors.background_1}};
    --background_active: {{colors.background_active}};
    --text_0: {{colors.text_0}};
    --text_1: {{colors.text_1}};
    --border: {{colors.border}};
    --emphasis: {{colors.emphasis}};
    --helper: {{colors.helper}};
  }
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'AppStyles',
  computed: {
    ...mapGetters(['colors'])
  }
}
</script>
