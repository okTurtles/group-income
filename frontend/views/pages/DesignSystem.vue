<template lang="pug">
page(
  mainClass='full-width'
  pageTestName='designSystemPage'
  pageTestHeaderName='designSystemTitle'
  class='p-design-system'
)
  template(#title='') Design System
  template(#description='')
    | A design system exists to help you build more cohesive interfaces.
    br
    | Follow the guidelines for the most common elements: Typography, Spacing, Colors, etc...

  template(#sidebar='')
    #c-design-system-sidebar

  article#typography
    section.card.c-typography
      i18n(tag='h2' class='card-header') Typography

      h3 Titles

      table
        thead
          th code
          th demo
        tr(v-for='(scale, index) in [1, 2, 3, 4]' :key='index')
          td
            pre h{{scale}} or .title.is-{{scale}}
          td.title(:class='`is-${scale}`') This is an H{{scale}} title
        tr
          td
            pre
              | header p
              br
              | or
              br
              | .subtitle
          td.subtitle This is a subtitle
        tr
          td
            pre .label
          td
            label.label Label

      h3 Body Copy

      table
        thead
          th code
          th demo
        tr
          td (default)
          td.
            A basic income, also called basic income guarantee, universal basic income (UBI),
            basic living stipend (BLS), or universal demogrant, is a type of program in which
            citizens (or permanent residents) of a country may receive a regular sum of money
            from a source such as the government. A pure or unconditional basic income has no
            means test, but unlike Social Security in the United States it is distributed
            automatically to all citizens without a requirement to notify changes in the
            citizen's financial status. Basic income can be implemented nationally, regionally
            or locally. The World Bank's World Development Report 2019 on the future of work describes
            the existing schemes around the world.

        tr
          td
            pre .has-text-big
          td.has-text-big Body #[b big]

        tr
          td
            pre .has-text-small
          td.has-text-small Body #[b small]
        tr
          td
            pre .has-text-1
          td.has-text-1 Use this color on non critical texts.
        tr
          td
            pre .has-bold
          td.has-bold I'm bold, without using "b" or "strong" tag.
        tr
          td
            pre .has-ellipsis
          td.has-ellipsis.c-demo-ellipsis When a text is too long and you don't want to break in multiple lines, it's okay so use ellipsis.
        tr
          td
            pre .link
          td
            | Make sure&nbsp;
            a.link(href='#') the link is readable
            |  for everyone, this is, accessible.

  article#typography
    section.card
      i18n(tag='h2' class='card-header') Cards

      table
        thead
          th code
          th demo
        tr
          td
            pre .card
          td
            .card

        tr
          td
            pre .card-header
          td
            .card
              h2.card-header Title
              p Description

  article#icons
    section.card
      i18n(tag='h2' class='card-header') Icons
      p
        | This is only the currently used icons (at _icons.scss).
        br
        | A complete list can be find here:&nbsp;
        br
        a.link(href="https://fortawesome.com/sets/font-awesome-5-solid" target="_blank")
          | https://fortawesome.com/sets/font-awesome-5-solid
        |  or&nbsp;
        br
        a.link(href="https://fortawesome.com/sets/font-awesome-5-regular" target="_blank")
          | https://fortawesome.com/sets/font-awesome-5-regular
        br

      table
        thead
          th code
          th demo
        tr
          td
            pre
              | .c-icons
              |   i.icon-angle-left
          td
            .c-icons
              i.icon-angle-left icon-angle-left
              i.icon-angle-down icon-angle-down
              i.icon-arrow-right icon-arrow-right
              i.icon-bars icon-bars
              i.icon-bell icon-bell
              i.icon-chart-pie icon-chart-pie
              i.icon-check icon-check
              i.icon-check-circle icon-check-circle
              i.icon-chevron-left icon-chevron-left
              i.icon-chevron-right icon-chevron-right
              i.icon-cog icon-cog
              i.icon-columns icon-columns
              i.icon-comments icon-comments
              i.icon-edit icon-edit
              i.icon-ellipsis-v icon-ellipsis-v
              i.icon-envelope icon-envelope
              i.icon-exclamation-triangle icon-exclamation-triangle
              i.icon-eye icon-eye
              i.icon-eye-slash icon-eye-slash
              i.icon-globe icon-globe
              i.icon-heart icon-heart
              i.icon-info icon-info
              i.icon-info-circle icon-info-circle
              i.icon-lock icon-lock
              i.icon-minus-circle icon-minus-circle
              i.icon-paper-plane icon-paper-plane
              i.icon-pencil-alt icon-pencil-alt
              i.icon-plus icon-plus
              i.icon-question-circle icon-question-circle
              i.icon-tag icon-tag
              i.icon-times icon-times
              i.icon-times-circle icon-times-circle
              i.icon-undo icon-undo
              i.icon-user icon-user
              i.icon-user-plus icon-user-plus

  article#spacing
    section.card
      i18n(tag='h2' class='card-header') Spacing
      table
        thead
          th code
          th demo
          //- th usage
        tr(v-for="(spacer, index) in ['xs', 'sm', '', 'lg']" :key='index')
          td(v-if='spacer')
            code $spacer-{{spacer}}
          td(v-else='')
            code $spacer
          td
            span.c-spacer(:class='spacer')
          //- td Used to space element by {{Math.pow(2, (index+1))}}px

  article#color
    section.card
      i18n(tag='h2' class='card-header') Color

      h3 Variable

      table.colors
        thead
          th code
          th demo

        tr(v-for='(color, index) in config.colors' :key='`color-${index}`')
          td
            code {{color.name}}
            pre(v-for='num in [0, 1, 2]' :key='num') var(--{{color.name}}_{{num}})&nbsp
          td
            span.c-palette(v-for='num in [0, 1, 2]' :key='num' :style="{ backgroundColor: `var(--${color.name}_${num})`}")

      h3 Background

      table
        thead
          th code
          th demo
          //- th usage
        tr(v-for='(color, index) in config.colors' :key='`support-color-${index}`')
          td
            pre(v-if='!color.noClass') .has-background-{{color.name}}
          td
            span.c-palette(:class='`has-background-${color.name}`')
          //- td(v-html='color.usage')
  article#buttons
    section.card
      i18n(tag='h2' class='card-header') Buttons
      h3 Default size
      table
        thead
          th code
          th demo
        tr
          td
            pre .button
          td
            button Default text

        tr
          td
            pre .button.is-success
          td
            button.is-success Default text

        tr
          td
            pre .button.is-danger
          td
            button.is-danger Default text

        tr
          td
            pre .button.is-outlined
          td
            button.is-outlined Default text

        tr
          td
            pre .button.is-success.is-outlined
          td
            button.is-success.is-outlined Default text

        tr
          td
            pre .button.is-danger.is-outlined
          td
            button.is-danger.is-outlined Default text

        tr
          td
            pre .button disabled
          td
            button(disabled) Default text

        tr
          td
            pre
              | .button
              |   | Next
              |   i.icon-arrow-right
          td
            button
              | Next
              i.icon-arrow-right

      h3 Small size
      table
        thead
          th code
          th demo
        tr
          td
            pre .button.is-small
          td
            button.is-small Default text

        tr
          td
            pre .button.is-outlined.is-small
          td
            button.is-outlined.is-small Default text

        tr
          td
            pre .button.is-success.is-outlined.is-small
          td
            button.is-success.is-outlined.is-small Default text

        tr
          td
            pre .button.is-danger.is-outlined.is-small
          td
            button.is-danger.is-outlined.is-small Default text

      h3 Small size with icon
      table
        thead
          th code
          th demo
        tr
          td
            pre
              | .button.is-small.is-outlined
              |   i.icon-plus
              |   | Add
          td
            button.is-small.is-outlined
              i.icon-plus
              | Add

      h3 Icon Buttons
      table
        thead
          th code
          th demo
        tr
          td
            pre
              | button.is-icon
              |   i.icon-cog
          td
            button.is-icon
              i.icon-cog
        tr
          td
            pre
              | button.is-icon.has-background
              |   i.icon-cog
          td
            button.is-icon.has-background
              i.icon-cog
        tr
          td
            pre
              | button.is-icon-small
              |   i.icon-cog
          td
            button.is-icon-small
              i.icon-cog

  article#pills
    section.card
      i18n(tag='h2' class='card-header') Pills
      table
        thead
          th code
          th demo
        tr
          td
            pre .pill
          td
            span.pill Pending

  article#user-feedback
    section.card
      i18n(tag='h2' class='card-header') User Feedback
      h3 Simple

      table
        thead
          th code
          th demo
        tr
          td
            pre message(severity='warning')
          td
            message(severity='warning')
              | This is a&nbsp;
              strong warning message
              |  with a&nbsp;
              a.link(href='/') link
              | . This message can grow in width or height, as needed.
        tr
          td
            pre message(severity='danger')
          td
            message(severity='danger')
              | This is a&nbsp;
              strong danger / error message
              |  with a&nbsp;
              a.link(href='/') link
              | . This message can grow in width or height, as needed.
        tr
          td
            pre message(severity='info')
          td
            message(severity='info')
              | This is an&nbsp;
              strong infromation message
              |  with a&nbsp;
              a.link(href='/') link
              | . This message can grow in width or height, as needed.

      h3 With title
      table
        thead
          th code
          th demo
        tr
          td
            pre
            | message(severity='warning')
            |    div(slot='header')
          td
            message(severity='warning')
              div(slot='header')
                | A title that gives context to the message
              slot
                | This is a&nbsp;
                strong warning message
                |  with a&nbsp;
                a.link(href='/') link
                | . This message can grow in width or height, as needed.

  article#tooltips
    section.card
      i18n(tag='h2' class='card-header') Tooltips
      tooltip(
        text="A simple text inside"
        )
        i.icon-exclamation-triangle Basic

      | &nbsp;&nbsp;&nbsp;&nbsp;

      tooltip
        i.icon-exclamation-triangle Complete
        template(slot='tooltip')
          p.has-bold Custom markdown
          | It has a maximum width of&nbsp;
          strong 14rem
          |  (224px).

      | &nbsp;&nbsp;&nbsp;&nbsp;

      tooltip(
        direction="right"
        )
        i.icon-exclamation-triangle Custom Direction
        template(slot='tooltip')
          | It accepts multiple directions. Check sourcecode to know more.

  article#forms
    section.card
      i18n(tag='h2' class='card-header') Forms

      p
        | The width of the input depend of their container
        br
        | For more consistency anything inside a div call .field a margin bottom of 38px

      h3 Textbox

      table
        thead
          th code
          th demo
        tr
          td
            pre
              | label.label
              | input.input(type='text')
          td
            label.label This is a text input
            input.input(type='text' placeholder='Placeholder')

        tr
          td
            pre
              | label.label
              | input.input.error(type='text')
              | p.error
          td
            label.label This is a text input with error
            input.input.error(type='text' placeholder='Placeholder' value='Error')
            p.error There is an error in that field

        tr
          td
            pre
              | label.label
              | textarea
          td
            label.label This is a textarea
            textarea(placeholder='Placeholder' rows="4")

      h3 Selectbox

      table
        thead
          th code
          th demo
        tr
          td
            pre
              | .select-wrapper
              |    select
              |       option
          td
            label.label This is a dropdown
            .select-wrapper
              select
                option USD
                option BTC
                option EUR

      h3 Radio

      table
        thead
          th code
          th demo
        tr
          td
            pre
              | .radio-wrapper
              |   input.input(type='radio')
              |   i18n Radio label
          td
            .radio-wrapper
              input.radio(
                name="v-model"
                type='radio'
                checked='true'
              )
              i18n Radio label

            .radio-wrapper
              input.radio(
                name="v-model"
                type='radio'
              )
              i18n Radio label

      h3 Combination

      table
        thead
          th code
          th demo

        tr
          td
            pre
              | .field
              |    label.label
              |    input.input(type='text')
          td
            .field
              label.label This is a text input
              input.input(type='text' placeholder='Placeholder')

            .field
              label.label This is a text input
              input.input(type='text' placeholder='Placeholder')

        tr
          td
            pre
              | .select-wrapper
              |   input.input(type='text')
              |   select
              |     option USD
              |     option BTC
              |     option EUR
          td
            .select-wrapper
              input.input(type='text' placeholder='New amount')
              select
                option USD
                option BTC
                option EUR

        tr
          td
            pre
              | .input-combo
              |    input.input(type='text')
              |    label USD
          td
            .input-combo
              input.input(type='text' placeholder='New amount')
              label USD

        tr
          td
            pre
              | .input-combo
              |    input.input(type='text')
              |    button.is-icon
              |       i.icon-eye
          td
            .input-combo
              input.input(type='text' placeholder='Placeholder')
              button.is-icon
                i.icon-eye

        tr
          td
            pre
              | .input-combo
              |    input.input(type='text')
              |    button.is-icon
              |       i.icon-eye
          td
            .input-combo
              .is-icon
                i.icon-user
              input.input(type='text' placeholder='Placeholder')

  article#stepper
    section.card
      i18n(tag='h2' class='card-header') Stepper

      p Todo: replace with component once created
      table
        thead
          th code
          th demo
        tr
          td
            pre
              | .steps
              br
              |   a.step 1
              br
              |   a.step.active 2
              br
              |   a.step.next 3
          td
            .steps
              a.step 1
              a.step.active 2
              a.step.next 3
  article#menu
    section.card
      i18n(tag='h2' class='card-header') Menu
      table
        thead
          th code
          th demo
        tr
          td
            code
              | sbp('state/vuex/dispatch', 'login',
              br
              |   { username: 'TestUser', identityContractID }
              br
              | )
          td
            button(@click="login()")
              i18n Open Menu

  article#modal
    section.card
      i18n(tag='h2' class='card-header') Modal
      table
        thead
          th code
          th demo
        tr
          td
            code
              | sbp('okTurtles.events/emit',
              br
              |   OPEN_MODAL, 'DesignSystemModal'
              br
              | )
          td
            button(@click="openModal('DesignSystemModal')")
              i18n Open Modal
</template>

<script>
import Page from '@pages/Page.vue'
import sbp from '~/shared/sbp.js'
import Message from '@components/Message.vue'
import Tooltip from '@components/Tooltip.vue'
import { OPEN_MODAL } from '@utils/events.js'

export default {
  name: 'DesignSystemView',
  data () {
    return {
      articles: [],
      config: {
        colors: [
          {
            name: 'primary',
            usage: 'Used on main decorative / interactive elements.'
          },
          {
            name: 'success',
            usage: 'Used on elements to show something good happened - Do not mix its usage with success (same color in this theme but with  different meanings)'
          },
          {
            name: 'warning',
            usage: 'Used on elements to show something not that good happened - Do not mix its usage with $tertiary (same color in this theme but with different meanings)'
          },
          {
            name: 'danger',
            usage: 'Used on elements to show something wrong happened'
          }
        ]
      }
    }
  },
  components: {
    Page,
    Message,
    Tooltip
  },
  mounted () {
    const menu = document.getElementById('c-design-system-sidebar')
    menu.parentElement.setAttribute('style', 'position: fixed')
    document.querySelectorAll('article').forEach((el) => {
      const link = document.createElement('A')
      link.appendChild(document.createTextNode(el.querySelector('h2').innerHTML))
      link.setAttribute('href', `#${el.id}`)
      menu.appendChild(link)
      this.articles.push({
        link: link,
        top: el.getBoundingClientRect().top - window.innerHeight
      })
    })

    document.querySelectorAll('.l-page')[0].addEventListener('scroll', this.handleScroll)

    // Keep the position of the current element you're working on
    const hash = document.location.hash
    if (hash) {
      document.querySelector(hash).scrollIntoView()
    }
  },
  destroyed () {
    window.removeEventListener('scroll', this.handleScroll)
  },
  methods: {
    login () {
      console.error('unimplemented, try using the actual Login.vue modal')
    },
    openModal (mode) {
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
    },
    handleScroll (e) {
      const top = e.target.scrollTop
      let last = 0
      this.articles.forEach((el, index) => {
        if (top > (el.top)) {
          el.link.classList.add('active')
          last = index
        } else {
          el.link.classList.remove('active')
        }
        el.link.classList.remove('last')
      })
      this.articles[last].link.classList.add('last')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";
$pagePadding: 1rem;
$pagePaddingTablet: 24px;
$pagePaddingDesktop: 75px;

article h3 {
  margin-top: $spacer;
}

pre {
  color: $primary_0;
}

code {
  color: $success_0;
}

section.card {
  margin-bottom: $spacer-lg;
}

table {
  width: 100%;
  th,
  td {
    min-width: 6rem;
    padding-right: 1rem;
    vertical-align: baseline;
  }
  td:first-child {
    min-width: 21rem;
  }
  td:last-child {
    width: 30rem;
  }
}

.c-icons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  grid-gap: 1rem;
  margin-top: 2rem;
  margin-bottom: 1rem;

  [class^='icon-']::before {
    margin-right: 10px;
  }
}

.c-spacer {
  display: inline-block;
  border: 1px dashed $primary_0;
  width: $spacer;
  height: $spacer;
  margin-right: $spacer;

  &.lg {
    width: $spacer-lg;
    height: $spacer-lg;
  }

  &.sm {
    width: $spacer-sm;
    height: $spacer-sm;
  }

  &.xs {
    width: $spacer-xs;
    height: $spacer-xs;
  }
}

.c-palette {
  display: inline-block;
  width: $spacer-xl;
  height: $spacer-xl;
  border-radius: $radius;
  margin-right: $spacer;

  .table td{
    vertical-align: top;
  }
}

.c-demo-ellipsis {
  max-width: 10rem;
}

.colors td {
  vertical-align: top
}

.message {
  margin-bottom: $spacer-lg;
}

#c-design-system-sidebar {
  display: flex;
  flex-direction: column;

  ::v-deep .active {
    color: $general_0;
    text-decoration: line-through;
  }

  ::v-deep .last {
    text-decoration: underline;
    color: $primary_0;
  }
}
</style>
