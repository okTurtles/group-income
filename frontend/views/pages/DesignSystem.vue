<template lang='pug'>
page(
  pageTestName='designSystemPage'
  pageTestHeaderName='designSystemTitle'
  class='p-design-system'
)
  template(#title='') Design System
  template(#description='')
    | A design system exists to help you build more cohesive interfaces.
    br
    | Follow the guidelines for the most common elements: Typography, Spacing, Colors, etc...
  br
  template(#sidebar='')
    #c-design-system-sidebar

  article#typography
    section.card.c-typography
      h2.is-title-2.card-header Typography

      h3.is-title-3 Titles
      br
      br
      table
        thead
          th code
          th demo
        tr(v-for='(scale, index) in [1, 2, 3, 4]' :key='index')
          td
            pre .is-title-{{scale}}
          td(:class='`is-title-${scale}`') This is an title level {{scale}}
        tr
          td
            pre
              | .is-subtitle
          td.is-subtitle This is a subtitle

      h3.is-title-3 Body Copy

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
            pre .has-text-bold
          td.has-text-bold I'm bold, without using "b" or "strong" tag.
        tr
          td
            pre .has-text-primary
          td.has-text-primary An informative text, but use it only for icons.
        tr
          td
            pre .has-text-success
          td.has-text-success Mission completed!
        tr
          td
            pre .has-text-warning
          td.has-text-warning Be careful...
        tr
          td
            pre .has-text-danger
          td.has-text-danger Ups! something went wrong..
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
        tr
          td
            pre .link.has-icon
          td
            a.link.has-icon(href='#')
              i.icon-link
              | Share with everyone

  article#cards
    section.card
      h2.is-title-2.card-header Cards

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
              h2.is-title-2.card-header Title
              p Description
        tr
          td
            pre
              | callout-card(
              |   title='Proposals'
              |   :svg='config.SvgVote'
              |   :isCard='true'
              | )
              |   Any content inside
          td
            callout-card(
              title='Proposals'
              :svg='config.SvgVote'
              :isCard='true'
            )
              i18n(tag='p') In Group Income, every member of the group gets to vote on important decisions, like removing or adding members, changing the mincome value and others.
              i18n.has-text-1(tag='p') No one has created a proposal yet.

  article#icons
    section.card
      h2.is-title-2.card-header Icons
      p
        | This is only the currently used icons (at _icons.scss). A complete list can be find here:&nbsp;
        br
        a.link(href='https://fortawesome.com/sets/font-awesome-5-solid' target='_blank') fortawesome 5 solid
        |  or&nbsp;
        a.link(href='https://fortawesome.com/sets/font-awesome-5-regular' target='_blank') fortawesome 5 regular
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
              i.icon-coins icon-coins
              i.icon-columns icon-columns
              i.icon-comments icon-comments
              i.icon-copy icon-copy
              i.icon-dollar-sign icon-dollar-sign
              i.icon-download icon-download
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
              i.icon-link icon-link
              i.icon-lock icon-lock
              i.icon-minus-circle icon-minus-circle
              i.icon-paper-plane icon-paper-plane
              i.icon-pencil-alt icon-pencil-alt
              i.icon-plus icon-plus
              i.icon-poll icon-poll
              i.icon-question icon-question
              i.icon-question-circle icon-question-circle
              i.icon-tag icon-tag
              i.icon-share-atl share-atl
              i.icon-search search
              i.icon-sort-down sort-down
              i.icon-times icon-times
              i.icon-times-circle icon-times-circle
              i.icon-undo icon-undo
              i.icon-user icon-user
              i.icon-user-plus icon-user-plus
              i.icon-user-minus icon-user-minus
              i.icon-vote-yea icon-vote-yea
              i.icon-wifi icon-wifi
        tr
          td
            pre
              | i.icon-round
          td
            i.icon-angle-left.icon-round.has-background-success.has-text-success
        tr
          td
            pre
              | Try again
              | i.icon-undo.is-suffix
          td
            | Try again
            i.icon-undo.is-suffix
        tr
          td
            pre
              | i.icon-bell.is-prefix
              | Notifications
          td
            i.icon-bell.is-prefix
            | Notifications
  article#spacing
    section.card
      h2.is-title-2.card-header Spacing
      table
        thead
          th code
          th demo
          //- th usage
        tr(v-for='(spacer, index) in ["xs", "sm", "", "lg"]' :key='index')
          td(v-if='spacer')
            code $spacer-{{spacer}}
          td(v-else='')
            code $spacer
          td
            span.c-spacer(:class='spacer')
          //- td Used to space element by {{Math.pow(2, (index+1))}}px

  article#color
    section.card
      h2.is-title-2.card-header Color

      h3.is-title-3 Variable

      table.colors
        thead
          th code
          th demo

        tr(v-for='(color, index) in config.colors' :key='`color-${index}`')
          td
            code {{color.name}}
            pre(v-for='num in [0, 1, 2]' :key='num') var(--{{color.name}}_{{num}})&nbsp
          td
            span.c-palette(v-for='num in [0, 1, 2]' :key='num' :style='{ backgroundColor: `var(--${color.name}_${num})`}')

      h3.is-title-3 Background

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
      h2.is-title-2.card-header Buttons
      br
      h3.is-title-3 Default size
      br
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
      h3.is-title-3 Small size
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

      h3.is-title-3 Button Submit
      p Use #[code ButtonSubmit] on buttons that will trigger an async action.
      br
      table
        thead
          th code
          th demo
        tr
          td
            pre
              | button-submit.is-sucess(
              |   @click='saveIn2500ms'
              | ) Save Changes
          td
            button-submit.is-sucess(
              @click='saveIn2500ms'
            ) Save Changes
      br
      h3.is-title-3 With an icon
      table
        thead
          th code
          th demo
        tr
          td
            pre
              | .button
              |   i.icon-plus.is-prefix
              |   Add
          td
            .button.has-icon-start
              i.icon-plus.is-prefix
              | Add
        tr
          td
            pre
              | .button
              |   Next
              |   i.icon-arrow-right.is-suffix
          td
            .button
              | Next
              i.icon-arrow-right.is-suffix

      h3.is-title-3 Icon Buttons
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
        tr
          td
            pre
              | button.is-icon-smaller
              |   i.icon-info
          td
            tooltip(text='Additional information')
              button.is-icon-smaller
                i.icon-info

  article#notification-badges
    section.card
      h2.is-title-2.card-header Notification Badges
      table
        thead
          th code
          th demo
        tr
          td
            pre
              | $spacer-lg
              |   badge(type='default') 3
          td
            span.c-badge-container
              badge(type='default') 3
        tr
          td
            pre
              | $spacer-lg
              |   badge(type='compact') 3
          td
            span.c-badge-container
              badge(type='compact') 3
        tr
          td
            pre
              | button.is-icon(style='position: relative')
              |   i.icon-cog
              |   badge(type='default') 3

          td
            button.is-icon(style='position: relative')
              i.icon-cog
              badge(type='default') 3
        tr
          td
            pre
              | i.icon-comments
              |   badge(type='compact') 3
          td
            i.icon-comments.c-badge-container-small
              badge(type='compact') 3

  article#pills
    section.card
      h2.is-title-2.card-header Pills
      table
        thead
          th code
          th demo
        tr
          td
            pre .pill.is-neutral
          td
            span.pill.is-neutral Pending

        tr
          td
            pre .pill.is-success
          td
            span.pill.is-success Payment received

        tr
          td
            pre .pill.is-warning
          td
            span.pill.is-warning Not received

        tr
          td
            pre .pill.is-primary
          td
            span.pill.is-primary Partial

        tr
          td
            pre .pill.is-danger
          td
            span.pill.is-danger Due march 08

  article#user-feedback
    section.card
      h2.is-title-2.card-header Feedback Banners
      h3.is-title-3 Simple

      table
        thead
          th code
          th demo
        tr
          td
            pre banner-simple(severity='success')
          td
            banner-simple(severity='success')
              | This is a&nbsp;
              strong success message
              |  with a&nbsp;
              a.link(href='/') link
              | . This message can grow in width or height, as needed.
        tr
          td
            pre banner-simple(severity='warning')
          td
            banner-simple(severity='warning')
              | This is a&nbsp;
              strong warning message
              |  with a&nbsp;
              a.link(href='/') link
              | . This message can grow in width or height, as needed.
        tr
          td
            pre banner-simple(severity='danger')
          td
            banner-simple(severity='danger')
              | This is a&nbsp;
              strong danger / error message
              |  with a&nbsp;
              a.link(href='/') link
              | . This message can grow in width or height, as needed.
        tr
          td
            pre banner-simple(severity='info')
          td
            banner-simple(severity='info')
              | This is a&nbsp;
              strong short message
              |  with a&nbsp;
              a.link(href='/') link.

      h4.is-title-4 With title
      table
        thead
          th code
          th demo
        tr
          td
            pre
            | banner-simple(severity='warning')
            |    div(slot='header')
          td
            banner-simple(severity='warning')
              div(slot='header')
                | A title that gives context to the message
              slot
                | This is a&nbsp;
                strong warning message
                |  with a&nbsp;
                a.link(href='/') link
                | . This message can grow in width or height, as needed.
      h3.is-title-3 Scoped Banners
      table
        thead
          th code
          th demo
        tr
          td
            pre
              | banner-scoped(ref='banner')
              | button(
              |   @click='$refs.banner.danger("Ups!")'
              | ) Save

          td
            div
              banner-scoped(ref='banner')
              .buttons.is-centered
                button.is-small.is-outlined(@click='$refs.banner.success("Changes saved!")') Save Success
                button.is-small.is-outlined(@click='$refs.banner.danger("Failed to save the world, please try again.")') Save Danger

  article#tooltips
    section.card
      h2.is-title-2.card-header Tooltips
      tooltip(
        text='A simple text inside'
        )
        i.icon-exclamation-triangle Basic

      | &nbsp;&nbsp;&nbsp;&nbsp;

      tooltip
        i.icon-exclamation-triangle Complete
        template(slot='tooltip')
          p.has-text-bold Custom markdown
          | It has a maximum width of&nbsp;
          strong 14rem
          |  (224px).

      | &nbsp;&nbsp;&nbsp;&nbsp;

      tooltip(
        direction='right'
        )
        i.icon-exclamation-triangle Custom Direction
        template(slot='tooltip')
          | It accepts multiple directions. Check sourcecode to know more.

  article#InviteLink
    section.card
      h2.is-title-2.card-header InviteLink

      p
        | Invitation links that are used across the app have the uniform design with 'click-to-copy' functionality.
        | Please refer to&nbsp;
        a.link(
          href='https://github.com/okTurtles/group-income-simple/issues/756'
          target='_link'
        ) issue #756
        | &nbsp;for more information.
      br
      table
        thead
          th code
          th demo
        tr
          td
            pre
              | link-to-copy(
              |   link='https://groupincome.org/f4k3_H45h_t0_5h4r3'
              | )
          td
            link-to-copy(link='https://groupincome.org/f4k3_H45h_t0_5h4r3')

  article#forms
    section.card
      h2.is-title-2.card-header Forms

      p
        | - The input's width depends on their container #[br]
        | - Use #[code .field] to have a margin bottom of 1rem #[br]
        | - #[b Accessibility:] Every form field must have a respective label associated, even if hidden using #[code .sr-only].
        | Whenever possible, use the respective HTML attributes to describe the field status (type, disabled, required, error, etc...)
      br
      button.is-small.is-outlined.is-danger(
        @click='ephemeral.forms.hasError = !ephemeral.forms.hasError'
      ) Toggle Errors
      br
      br
      table
        thead
          th code
          th demo
        tr
          td
            h3.is-title-3 Input
            br
            pre
              | label.field
              |   .label Your username
              |   input.input(type='text' required)
              |   span.error Name already taken
              |   .helper Pick a name without spaces
          td
            label.field
              .label Username
              input.input(
                placeholder='Placeholder'
                :class='{ error: ephemeral.forms.hasError }'
                :aria-invalid='ephemeral.forms.hasError'
              )
              span.error(v-if='ephemeral.forms.hasError') Name already taken
              .helper Pick a name without spaces.
        tr
          td
            h3.is-title-3 Textarea
            br
            pre
              | label.field
              |   .label Explain why
              |   textarea.textarea.error(rows='4')
          td
            label.field
              .label Explain why
              textarea.textarea(placeholder='Placeholder' rows='4'
                :class='{ error: ephemeral.forms.hasError }'
              )
              span.error(v-if='ephemeral.forms.hasError') You can do better than that.
        tr
          td
            h3.is-title-3 Selectbox
            br
            pre
              | label.field
              |   .label Select currency
              |   .selectbox.error
              |     select.select
              |       option $ USD
          td
            label.field
            .label Select currency
            .selectbox(:class='{ error: ephemeral.forms.hasError }')
              select.select
                option $ USD
                option Ƀ BTC
                option € EUR
            span.error(v-if='ephemeral.forms.hasError') Something went wrong.
        tr
          td(colspan='2')
            h3.is-title-3 Select Group
            p Use #[code fieldset] to group related inputs. Each input must have an individual label. If a label has multiple associated inputs, it won't work on iPhone. A simple but effective solution is to add #[code aria-label] to each input.&nbsp;
              a.link(href='https://codepen.io/sandrina-p/pen/oNXyGPE') See reference.
            br
        tr
          td
            pre
              | fieldset.field
              |   .label What's your mincome
              |   .selectgroup.error
              |     input.input(aria-label='Amount')
              |     select.select(aria-label='Currency')
              |       option $ USD
          td
            fieldset.field
              .label What's your mincome
              .selectgroup(:class='{ error: ephemeral.forms.hasError }')
                input.input(aria-label='Amount')
                select.select(aria-label='Currency')
                  option $ USD
                  option Ƀ BTC
                  option € EUR
              span.error(v-if='ephemeral.forms.hasError') Something went wrong.
        tr
          td
            pre
              | fieldset.field
              |   .label Payment method
              |   .selectgroup.is-reversed
              |     select.select(aria-label='Method')
              |       option(disabled='true') Choose...
              |       option Bitcoin
              |     input.input(aria-label='Value')
          td
            fieldset.field
              .label Payment method
              .selectgroup.is-reversed.c-payments(:class='{ error: ephemeral.forms.hasError }')
                select.select(
                  v-model='form.selectPayment'
                  :class='{ "is-empty": form.selectPayment === "choose"}'
                  aria-label='Method'
                  selected='choose')
                  option(value='choose' disabled='true') Choose...
                  option Bitcoin
                  option Paypal
                  option Other
                input.input(aria-label='Value')
              span.error(v-if='ephemeral.forms.hasError') Something went wrong.
        tr
          td
            h3.is-title-3 Input Group
            h4.is-title-4 With suffix
            br
            pre
              | label.field
              |   .label New Amount
              |   .inputgroup.error
              |     input.input
              |     .suffix USD
          td
            label.field
              .label Mincome
              .inputgroup(:class='{ error: ephemeral.forms.hasError }')
                input.input(type='text' placeholder='Amount')
                .suffix USD
              span.error(v-if='ephemeral.forms.hasError') Something went wrong.
        tr
          td
            h4.is-title-4 With shifted btn
            br
            pre
              | label.field
              |   .label Add invitee
              |   .inputgroup
              |     input.input
              |     button.is-icon-small.is-btn-shifted(
              |       :aria-label='Remove member'
              |     )
              |       i.icon-times
          td
            label.field
              .label Add invitee
              .inputgroup(:class='{ error: ephemeral.forms.hasError }')
                input.input(type='text' placeholder='Member name')
                button.is-icon-small.is-btn-shifted(
                  :aria-label='L("Remove member")'
                )
                  i.icon-times
              span.error(v-if='ephemeral.forms.hasError') Something went wrong.

        tr
          td
            h4.is-title-4 With addons
            br
            pre
              | label.field
              |   .label Password
              |   .inputgroup
              |     input.input
              |     .addons
              |       button.is-icon(
              |         :aria-label='Show password'
              |         :aria-pressed='false'
              |       )
              |         i.icon-eye
          td
            label.field
              .label Password
              .inputgroup(:class='{ error: ephemeral.forms.hasError }')
                input.input(:type='ephemeral.passwordHidden ? "password" : "text"')
                .addons
                  button.is-icon(
                    aria-label='Show password'
                    :aria-pressed='false'
                    @click='ephemeral.passwordHidden = !ephemeral.passwordHidden'
                  )
                    i(:class='ephemeral.passwordHidden ? "icon-eye" : "icon-eye-slash"')
              span.error(v-if='ephemeral.forms.hasError') Wrong password.

            label.field
              .label Your message
              .inputgroup(:class='{ error: ephemeral.forms.hasError }')
                input.input(type='text' placeholder='Placeholder')
                .addons
                  button.is-icon(aria-label='Copy text')
                    i.icon-copy
                  button.is-icon(aria-label='Create pool')
                    i.icon-poll
              span.error(v-if='ephemeral.forms.hasError') Say something.
        tr
          td
            h3.is-title-3 Radio
        tr
          td
            pre
              | fieldset
              |   legend.legend Pick a favorite food
              |   label.radio
              |     input.input(type='radio' name='food'
              |       value='Pizza'
              |       checked='true')
              |     span Pizza
              |   label.radio
              |     input.input(type='radio' name='food'
              |       value='Burger')
              |     span Burger
          td
            fieldset
              legend.legend Pick a favorite food
              label.radio
                input.input(type='radio' name='fruit' value='Pizza' checked='true')
                span Pizza
              label.radio
                input.input(type='radio' name='fruit' value='Burger')
                span Burger
              label.radio
                input.input(type='radio' name='fruit' value='Salad' disabled)
                span Salad
        tr
          td
            h3.is-title-3 Checkbox
        tr
          td
            pre
              | fieldset.is-column
              |   legend.legend What browsers do you use?
              |   label.checkbox
              |     input.input(type='checkbox' name='browser'
              |       value='Chrome')
              |     span Chrome
              |   label.checkbox
              |     input.input(type='checkbox' name='browser'
              |       value='Firefox')
              |     span Firefox
          td
            fieldset.is-column
              legend.legend What browsers do you use?
              label.checkbox
                input.input(type='checkbox' name='browser' value='Chrome')
                span Chrome
              label.checkbox
                input.input(type='checkbox' name='browser' value='Firefox')
                span Firefox
              label.checkbox
                input.input(type='checkbox' name='browser' value='Edge')
                span Edge
              label.checkbox
                input.input(type='checkbox' name='browser' value='Edge' disabled)
                span Internet Explorer
          tr
            td
              h3.is-title-3 Switch
          tr
            td
              pre
                | label
                |   i18n.sr-only Send donation
                |   input.switch(
                |     type='checkbox'
                |     name='switch'
                |     @change=''
                |   )
            td
              label
                i18n.sr-only Send donation
                input.switch(
                  type='checkbox'
                )
        tr
          td
            tr
              h3.is-title-3 Selectsolo
          tr
            td
              pre
                | .selectsolo
                |   select.select
                |     option 10 results

            td
              .selectsolo
                select.select
                  option(
                    v-for='count in [10, 20, 30]'
                    :index='count'
                    :value='count'
                  ) {{ count }} results
        tr
          td
            tr
              h3.is-title-3 Search (component)
          tr
            td
              pre
                | search(
                |   label='Search for a payment'
                |   placeholder='Search...'
                |   value=""
                | )

            td
              search(
                label='Search for a payment'
                placeholder='Search...'
                v-model='form.searchValue'
              )

  article#tabs
    section.card
      h2.is-title-2.card-header Tabs

      p Todo: replace with component once created
      table
        thead
          th code
          th demo
        tr
          td
            pre
              | nav.tabs
              br
              | button.is-unstyled.tabs-link tab1
              br
              | button.is-unstyled.tabs-link.tabs-link-active
              br
              |   | tab2
              br
              |   span.tabs-notification 3
          td
            br
            nav.tabs
              button.is-unstyled.tabs-link tab1
              button.is-unstyled.tabs-link.tabs-link-active
                | tab2
                span.tabs-notification 3

  article#stepper
    section.card
      h2.is-title-2.card-header Stepper

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
              |   button.step 1
              br
              |   button.step.active 2
              br
              |   button.step.next 3
          td
            .steps
              button.step 1
              button.step.active 2
              button.step.next 3
  article#menu
    section.card
      h2.is-title-2.card-header Menu
      table
        thead
          th code
          th demo
        tr
          td
            pre
              | menu-parent
              |   menu-trigger.is-icon-small(
              |    :aria-label='L("Show info")
              |   )
              |     i.icon-ellipsis-v
              |   menu-content
              |     ul
              |       menu-item(
              |         tag='button'
              |         item-id='profile'
              |         icon='info'
              |       ) Edit profile
          td
            menu-parent
              menu-trigger.is-icon-small(:aria-label='L("Show info")')
                i.icon-ellipsis-v

              menu-content.c-menu-content
                ul
                  menu-item(
                    tag='button'
                    item-id='profile'
                    icon='pencil-alt'
                  ) Edit profile

                  menu-item(
                    tag='button'
                    item-id='message'
                    icon='comment'
                  ) Send message

  article#modal
    section.card
      h2.is-title-2.card-header Modal
      table
        thead
          th code
          th demo
        tr
          td
            code
              | sbp('okTurtles.events/emit',
              br
              |   OPEN_MODAL, 'DSModalSimple'
              br
              | )
          td
            button(@click='openModal("DSModalSimple")')
              i18n Open Modal

  article#modalBase
    section.card
      h2.is-title-2.card-header Modal Base
      i18n(tag='p') The modal base as very basic functionality. Compare to normal modal it has very basic style and let us add any kind of content.
      i18n(tag='p') It only contain opening and closing mechanism (shared with the modal in modal mixin).
      i18n(tag='p') The main use at the moment is to be used on a fullscreen master modal that can contains other small sub modals (ex: income details)
      br
      i18n(tag='p') NB: at the moment we don't have sub sub modal, there for the implementation is flexible to allow an inifinty of modal but the animation is not implemented
      br
      table
        thead
          th code
          th demo
        tr
          td
            code
              | sbp('okTurtles.events/emit',
              br
              |   OPEN_MODAL, 'DSModalNested'
              br
              | )
          td
            button(@click='openModal("DSModalNested")')
              i18n Open Modal
  article#Illustrations
    section.card
      h2.is-title-2.card-header Illustrations (SVGs)
      p We have a good amount of nice illustrations across Group Income. Those illustrations' colors need to be customized based on the current theme. For that reason we display them in inline SVGs.
      br
      p Here's how you can load a SVG:
      br
      table.c-svgTable(:class='{ isDarkTheme }')
        thead
          th code
          th demo
        tr
          td.c-top
            pre
              | svg-hello
              |
              | import SvgHello from '@svgs/hello.svg'
          td
            svg-hello.c-svg

            // NOTE: this is a very dummy POC for handling themes
            // The final solution should be implemented at #665.
            button.is-small(@click='isDarkTheme = !isDarkTheme') Toggle Dark Theme
      br
      br

      p Know more about how all of this works at #[pre(style='display:inline') assets/svg/README.md]
      br
      b.is-title-4 Available SVGs:
      .c-svgList
        .c-svgList-item(
          v-for='svg in config.svgs'
          :key='svg.name'
          )
          component.c-svg(:is='svg.component')
          .c-svgList-text
            p #[b Name]: {{svg.name}}
</template>

<script>
import Page from '@components/Page.vue'
import sbp from '~/shared/sbp.js'
import Badge from '@components/Badge.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import CalloutCard from '@components/CalloutCard.vue'
import LinkToCopy from '@components/LinkToCopy.vue'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'
import Tooltip from '@components/Tooltip.vue'
import Search from '@components/Search.vue'
import { OPEN_MODAL } from '@utils/events.js'
import SvgAccess from '@svgs/access.svg'
import SvgBitcoin from '@svgs/bitcoin.svg'
import SvgBrokenLink from '@svgs/broken-link.svg'
import SvgContributions from '@svgs/contributions.svg'
import SvgConversation from '@svgs/conversation.svg'
import SvgCreateGroup from '@svgs/create-group.svg'
import SvgHello from '@svgs/hello.svg'
import SvgInvitation from '@svgs/invitation.svg'
import SvgJoinGroup from '@svgs/join-group.svg'
import SvgMoney from '@svgs/money.svg'
import SvgProposal from '@svgs/proposal.svg'
import SvgVote from '@svgs/vote.svg'

export default {
  name: 'DesignSystemView',
  data () {
    return {
      articles: [],
      config: {
        SvgVote,
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
          },
          {
            name: 'general',
            usage: 'Used on backgrounds and interactions'
          },
          {
            name: 'text',
            usage: 'Used on text elements'
          }
        ],
        svgs: [
          {
            component: SvgAccess,
            name: 'SvgAccess',
            sprite: 'Dashboard'
          },
          {
            component: SvgBitcoin,
            name: 'SvgBitcoin',
            sprite: 'IncomeDetails'
          },
          {
            component: SvgBrokenLink,
            name: 'SvgBrokenLink',
            sprite: 'Newcomers'
          },
          {
            component: SvgContributions,
            name: 'SvgContributions',
            sprite: 'Dashboard'
          },
          {
            component: SvgConversation,
            name: 'SvgConversation',
            sprite: 'Dashboard'
          },
          {
            component: SvgCreateGroup,
            name: 'SvgCreateGroup',
            sprite: 'Newcomers'
          },
          {
            component: SvgHello,
            name: 'SvgHello',
            sprite: 'IncomeDetails'
          },
          {
            component: SvgInvitation,
            name: 'SvgInvitation',
            sprite: 'Newcomers'
          },
          {
            component: SvgJoinGroup,
            name: 'SvgJoinGroup',
            sprite: 'Newcomers'
          },
          {
            component: SvgMoney,
            name: 'SvgMoney',
            sprite: 'IncomeDetails'
          },
          {
            component: SvgProposal,
            name: 'SvgProposal',
            sprite: 'Dashboard'
          },
          {
            component: SvgVote,
            name: 'SvgVote',
            sprite: 'Dashboard'
          }
        ]
      },
      form: {
        searchValue: '',
        selectPayment: 'choose'
      },
      ephemeral: {
        passwordHidden: true,
        forms: {
          hasError: false,
          isDisabled: false
        }
      },
      isDarkTheme: false
    }
  },
  components: {
    Page,
    Badge,
    BannerSimple,
    BannerScoped,
    ButtonSubmit,
    CalloutCard,
    LinkToCopy,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem,
    Search,
    Tooltip,
    SvgHello
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
        if (top > (el.top + window.innerHeight - 40)) { // 30 - space between each card.
          el.link.classList.add('scrolled')
          last = index
        } else {
          el.link.classList.remove('scrolled')
        }
        el.link.classList.remove('last')
      })
      this.articles[last].link.classList.add('last')
    },
    saveIn2500ms () {
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 2500)
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
$pagePadding: 1rem;
$pagePaddingTablet: 24px;
$pagePaddingDesktop: 75px;

.p-design-system ::v-deep .p-main {
  max-width: 70rem;
}

article .is-title-3 {
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
    &.c-top {
      vertical-align: top;
    }
  }
  td:first-child {
    min-width: 14rem;
  }
  td:last-child {
    width: 35rem;
  }
}

.c-icons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  grid-gap: $spacer-md;
  margin-top: $spacer-lg;
  margin-bottom: $spacer-md;

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

.c-badge-container {
  position: relative;
  display: inline-block;
  width: $spacer-lg;
  height: $spacer-lg;
  border: 1px dashed $primary_1;

  &-small {
    @extend .c-badge-container;
    width: $spacer-md * 1.5;
    height: $spacer-md * 1.5;
    line-height: $spacer-md * 1.5;
    text-align: center;
    border: none;
  }
}

.c-payments {
  .select {
    min-width: 7rem;
  }

  &::after { // icon-sort-down
    left: 5.5rem;
  }
}

.c-svg {
  width: 6rem;
  height: 6rem;
}

.c-svgTable {
  &.isDarkTheme {
    --text_0: white;
    --primary_0: white;
    --primary_1: wheat;
    --primary_0_1: white;
    --background_0: #363636;
    background: $background_0;

    th {
      color: $text_0;
    }

    pre {
      color: $primary_1;
    }
  }
}

.c-svgList {
  display: flex;
  flex-wrap: wrap;
  margin-top: $spacer;

  &-item {
    padding: $spacer;
    border: 1px solid $general_1;
    width: 50%;
    min-width: 16rem;
    text-align: center;
    flex-grow: 1;

    .c-svg {
      max-width: none;
      width: $spacer-xxl;
      height: $spacer-xxl;
    }
  }

  &-text {
    padding-top: $spacer-sm;
    text-align: left;
  }
}

.c-menu-content {
  width: 12rem;
  margin-left: 2rem;
}

#c-design-system-sidebar {
  display: flex;
  flex-direction: column;

  ::v-deep .scrolled {
    opacity: 0.4;
    text-decoration: line-through;
  }

  ::v-deep .last {
    opacity: 1;
    text-decoration: underline;
    color: $primary_0;
  }
}
</style>
