<template lang="pug">
v-style.
  :root {
    --black: {{colors.black}};
    --white: {{colors.white}};
    --text_black: {{colors.text_black}};
    --primary_blue: {{colors.primary_blue}};
    --primary_purple: {{colors.primary_purple}};
    --secondary_purple_0: {{colors.secondary_purple_0}};
    --secondary_purple_1: {{colors.secondary_purple_1}};
    --secondary_blue_0: {{colors.secondary_blue_0}};
    --secondary_blue_1: {{colors.secondary_blue_1}};
    --secondary_green_0: {{colors.secondary_green_0}};
    --secondary_green_1: {{colors.secondary_green_1}};
    --warning: {{colors.warning}};
    --danger: {{colors.danger}};
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
