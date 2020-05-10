<template lang='pug'>
.theme-list
  fieldset.theme(v-for='(color, label) in themes' :key='label' @click='setTheme(color.name)')
    label(:for='label')
      svg(width='113' height='113' viewBox='0 0 113 113' fill='none' xmlns='http://www.w3.org/2000/svg')
        path.bg(:fill='color.general_0' :stroke='color.border' d='M2.60769 0.5H110.392C111.012 0.5 111.555 0.692751 111.933 0.981206C112.309 1.2693 112.5 1.63189 112.5 1.99412V111.006C112.5 111.368 112.309 111.731 111.933 112.019C111.555 112.307 111.012 112.5 110.392 112.5H2.60769C1.98753 112.5 1.44466 112.307 1.06745 112.019C0.690715 111.731 0.5 111.368 0.5 111.006V1.99412C0.5 1.63189 0.690715 1.2693 1.06745 0.981206C1.44466 0.692751 1.98753 0.5 2.60769 0.5Z')
        path.nav-bg(:fill='color.general_1 || lightenDarkenColor(color.primary_0, 0.28)' fill-rule='evenodd' clip-rule='evenodd' d='M2.10769 1H47.8923C48.5041 1 49 1.8769 49 2.95882V110.041C49 111.123 48.5041 112 47.8923 112H2.10769C1.49588 112 1 111.123 1 110.041V2.95882C1 1.8769 1.49588 1 2.10769 1Z')
        path.search(fill-rule='evenodd' clip-rule='evenodd' d='M8 8H41C41.552 8 42 8.447 42 9V12C42 12.553 41.552 13 41 13H8C7.448 13 7 12.553 7 12V9C7 8.447 7.448 8 8 8Z')
        path.placeholder(:fill='color.general_2' fill-rule='evenodd' clip-rule='evenodd' d='M15.7714 18H41.2286C41.6544 18 42 18.447 42 19V22C42 22.553 41.6544 23 41.2286 23H15.7714C15.3456 23 15 22.553 15 22V19C15 18.447 15.3456 18 15.7714 18Z')
        path.main-color(:fill='color.primary_2' fill-rule='evenodd' clip-rule='evenodd' d='M7.14286 18H11.8571C11.936 18 12 18.447 12 19V22C12 22.553 11.936 23 11.8571 23H7.14286C7.064 23 7 22.553 7 22V19C7 18.447 7.064 18 7.14286 18Z')
        path.placeholder(:fill='color.general_2' fill-rule='evenodd' clip-rule='evenodd' d='M15.7714 92H41.2286C41.6544 92 42 92.447 42 93V96C42 96.553 41.6544 97 41.2286 97H15.7714C15.3456 97 15 96.553 15 96V93C15 92.447 15.3456 92 15.7714 92Z')
        path.placeholder(:fill='color.general_2' fill-rule='evenodd' clip-rule='evenodd' d='M15.7714 82H41.2286C41.6544 82 42 82.447 42 83V86C42 86.553 41.6544 87 41.2286 87H15.7714C15.3456 87 15 86.553 15 86V83C15 82.447 15.3456 82 15.7714 82Z')
        path.placeholder(:fill='color.general_2' fill-rule='evenodd' clip-rule='evenodd' d='M15.7714 72H41.2286C41.6544 72 42 72.447 42 73V76C42 76.553 41.6544 77 41.2286 77H15.7714C15.3456 77 15 76.553 15 76V73C15 72.447 15.3456 72 15.7714 72Z')
        rect(:fill='color.primary_1 || hexToRgbA(color.primary_0, 0.2)' x='1' y='30' width='48' height='36')
        path.placeholder(:fill='color.general_2' fill-rule='evenodd' clip-rule='evenodd' d='M15.7714 55H41.2286C41.6544 55 42 55.447 42 56V59C42 59.553 41.6544 60 41.2286 60H15.7714C15.3456 60 15 59.553 15 59V56C15 55.447 15.3456 55 15.7714 55Z')
        path.placeholder(:fill='color.general_2' fill-rule='evenodd' clip-rule='evenodd' d='M15.7714 37H41.2286C41.6544 37 42 37.447 42 38V41C42 41.553 41.6544 42 41.2286 42H15.7714C15.3456 42 15 41.553 15 41V38C15 37.447 15.3456 37 15.7714 37Z')
        path.placeholder(:fill='color.general_2' fill-rule='evenodd' clip-rule='evenodd' d='M15.5143 46H32.4857C32.7696 46 33 46.447 33 47V50C33 50.553 32.7696 51 32.4857 51H15.5143C15.2304 51 15 50.553 15 50V47C15 46.447 15.2304 46 15.5143 46Z')
        path.action(:fill='color.action' fill-rule='evenodd' clip-rule='evenodd' d='M37 46H40C40.0789 46 41 46.447 41 47V50C41 50.553 40.0789 51 40 51H36.9609C36.8821 51 36 50.553 36 50V47C36 46.447 36.9211 46 37 46Z')
        rect(:fill='color.primary_1 || hexToRgbA(color.primary_0, 0.2)' x='1' y='102' width='48' height='10')
        path.main-color(:fill='color.primary_2' fill-rule='evenodd' clip-rule='evenodd' d='M7.14286 37H11.8571C11.936 37 12 37.447 12 38V41C12 41.553 11.936 42 11.8571 42H7.14286C7.064 42 7 41.553 7 41V38C7 37.447 7.064 37 7.14286 37Z')
        path.main-color(:fill='color.primary_2' fill-rule='evenodd' clip-rule='evenodd' d='M7.14286 46H11.8571C11.936 46 12 46.447 12 47V50C12 50.553 11.936 51 11.8571 51H7.14286C7.064 51 7 50.553 7 50V47C7 46.447 7.064 46 7.14286 46Z')
        path.main-color(:fill='color.primary_2' fill-rule='evenodd' clip-rule='evenodd' d='M7.14286 55H11.8571C11.936 55 12 55.447 12 56V59C12 59.553 11.936 60 11.8571 60H7.14286C7.064 60 7 59.553 7 59V56C7 55.447 7.064 55 7.14286 55Z')
        path.main-color(:fill='color.primary_2' fill-rule='evenodd' clip-rule='evenodd' d='M7.14286 72H11.8571C11.936 72 12 72.447 12 73V76C12 76.553 11.936 77 11.8571 77H7.14286C7.064 77 7 76.553 7 76V73C7 72.447 7.064 72 7.14286 72Z')
        path.main-color(:fill='color.primary_2' fill-rule='evenodd' clip-rule='evenodd' d='M7.14286 82H11.8571C11.936 82 12 82.447 12 83V86C12 86.553 11.936 87 11.8571 87H7.14286C7.064 87 7 86.553 7 86V83C7 82.447 7.064 82 7.14286 82Z')
        path.main-color(:fill='color.primary_2' fill-rule='evenodd' clip-rule='evenodd' d='M7.14286 92H11.8571C11.936 92 12 92.447 12 93V96C12 96.553 11.936 97 11.8571 97H7.14286C7.064 97 7 96.553 7 96V93C7 92.447 7.064 92 7.14286 92Z')
      .radio
        input.input(type='radio' name='theme' :value='label' :id='label' v-model='colors.name')
        span {{ label }}
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import Themes from '@model/colors.js'
import colorsMixins from '@view-utils/colorsManipulation.js'

export default {
  name: 'SelectorTheme',

  mixins: [colorsMixins],

  data () {
    return {
      themes: Themes
    }
  },

  methods: {
    ...mapMutations([
      'setTheme'
    ])
  },

  computed: {
    ...mapGetters([
      'colors'
    ])
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.theme-list {
  display: flex;
  flex-wrap: wrap;
  margin: 0;
  padding: 0;
  width: 410px;
  max-width: 100%;
}

.search {
  fill: $white;
}

svg {
  display: block;
  transition: all 250ms cubic-bezier(0.4, 0.25, 0.3, 1);
  margin-bottom: 0.5rem;
}

.theme {
  position: relative;
  margin: 0 23px 18px 0;
  padding: 0;
  border: 0;

  &:hover {
    svg {
      transform: scale(1.05);
    }

    .main-color,
    .action {
      @for $i from 1 through 20 {
        &:nth-child(#{$i}) {
          animation: blink-animation 0.3s #{$i * 100ms} steps(5, start);
        }
      }
    }
  }
}

.placeholder:hover {
  transform: translate(3px);
}

.label-text {
  display: block;
  padding: 13px 22px;
  line-height: 1rem;
}
</style>
