<template lang='pug'>
  .settings-container
    section.card
      .c-header
        p.c-instructions
          i18n(
            :args='{ a_: okTurtlesPageTag, _a: "</a>" }'
          ) Group Income is developed by the {a_}okTurtles Foundation{_a} and is funded entirely by individual contributions.
      i18n.link(tag='button' @click='openURL(ALLOWED_URLS.OKTURTLES_SUPPORT_PAGE)') Support this project

      .c-wrapper(
        v-for='(item, index) in list'
        :key='index'
      )
        .c-title(tag='h2') {{ item.legend }}
        .c-smaller-title(
          v-for='(link, idx) in item.links'
          :key='idx'
        ) {{ link.title }}
          a.sublink(@click='openURL(link.url)') {{ link.name }}
</template>

<script>
import safeLinkTag from '@view-utils/safeLinkTag.js'
import { L } from '@common/common.js'

export default ({
  name: 'Acknowledgements',
  data () {
    return {
      okTurtlesPageTag: safeLinkTag('OKTURTLES_PAGE'),
      list: [{
        legend: L('Libraries'),
        links: [
          {
            title: 'Vue',
            name: 'vuejs.org',
            url: 'https://vuejs.org'
          },
          {
            title: 'Grunt',
            name: 'gruntjs.com',
            url: 'https://gruntjs.com'
          },
          {
            title: 'Cypress',
            name: 'cypress.io',
            url: 'https://www.cypress.io'
          },
          {
            title: 'Hapi',
            name: 'hapi.dev',
            url: 'https://hapi.dev'
          }
        ]
      }, {
        legend: L('Illustrations'),
        links: [
          // {
          //   title: 'Voting',
          //   name: 'By Nikita Kozin',
          //   url: '#'
          // },
          // {
          //   title: 'Broken Link',
          //   name: 'By HeadsOfBirds',
          //   url: '#'
          // },
          // {
          //   title: 'Send',
          //   name: 'By Gregor Cresnar',
          //   url: '#'
          // },
          // {
          //   title: 'Hello',
          //   name: 'By Allie',
          //   url: '#'
          // },
          // {
          //   title: 'Conversation',
          //   name: 'By Gregor Cresnar',
          //   url: '#'
          // },
          // {
          //   title: 'Vote',
          //   name: 'By HeadsOfBirds',
          //   url: '#'
          // }
        ]
      }]
    }
  },
  methods: {
    openURL (url) {
      window.open(url, '_blank').focus()
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

.c-instructions {
  margin-bottom: 1rem;
}

.c-wrapper {
  margin-top: 2rem;

  .c-title {
    font-family: "Poppins";
    font-size: $size_4;
    font-weight: bold;
  }

  .c-smaller-title {
    font-family: "Lato";
    font-size: $size_4;
    font-weight: bold;
    margin-top: 1rem;
    display: flex;

    .sublink {
      margin-left: 0.5rem;
    }
  }
}
</style>
