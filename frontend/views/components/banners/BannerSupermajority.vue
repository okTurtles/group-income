<template lang='pug'>
  banner-simple(severity='warning')
    i18n The percentage value you are choosing is most likely too low for a decision that can have a potentially significant impact  on a person's life. Please consider using a
    | &nbsp;
    i18n(
      tag='a'
      class='link'
      href='https://groupincome.org/2016/09/deprecating-mays-theorem/#when-majority-rule-can-harm'
      target='_blank'
    ) supermajority threshold.
</template>

<script>
import BannerSimple from '@components/banners/BannerSimple.vue'

export default {
  name: 'BannerSuperMajority',
  components: {
    BannerSimple
  }
}
</script>
