<template lang='pug'>
.c-news-and-updates-container
  .c-post-block(v-for='(post, index) in dummyPosts' :key='index')
    .c-post-created-date {{ humanDate(post.createdAt, { month: 'long', year: 'numeric', day: 'numeric' }) }}

    .card.c-post-card
      .c-post-img-container
        avatar.c-post-img(
          src='/assets/images/group-income-icon-transparent-circle.png'
          alt='GI Logo'
          size='xs'
        )
      .c-post-content
        h3.is-title-4 {{ post.title }}
        render-message-with-markdown(:text='post.content')
        //- div(v-safe-html:a='renderMarkdown(post.content)')
</template>

<script>
import { humanDate } from '@model/contracts/shared/time.js'
import Avatar from '@components/Avatar.vue'
import RenderMessageWithMarkdown from '@containers/chatroom/chat-mentions/RenderMessageWithMarkdown.js'

const dummyPosts = [
  {
    createdAt: new Date('2025-06-10T00:00:01'),
    title: 'Version 2.0 + New Server! 🥳',
    content:
      'Read [the announcement blog post](https://groupincome.org/2025/06/group-income-2.0/) for more details.\n\n' +
      '**New Features**\n\n' +
      '- Long chatroom messages are now truncated with a "Show more" link\n' +
      '- Notification volume can now be adjusted in settings\n' +
      '- You can now mark messages as unread in chatrooms and DMs\n' +
      '- French localization\n' +
      '- Server: admins can now display custom messages on login/signup screen\n' +
      '- Server: archive mode lets server admins set Group Income to read-only\n' +
      '- Server: data accounting logic now keeps track of data usage\n\n' +
      '**Improvements**\n\n' +
      '- Chatroom names now displayed in bold when they have new messages\n' +
      '- Replying to a message no longer quotes entire message\n' +
      '- You can now delete your group, your identity, everything\n' +
      '- Push notifications much more reliable, and toggling them on and off in the settings fixes most issues\n' +
      '- Handling of unread messages greatly improved\n' +
      '- Extensionless files can now be uploaded in chat\n' +
      '- Darktheme arrows now used for picture viewer\n' +
      '- Profile cards can be opened in the Contributions page\n' +
      '- Set notification settings in private chatrooms to behave the same as DMs by default\n' +
      '- Server now keeps track of data usage\n' +
      '- Various low-level improvements to Shelter Protocol and Chelonia\n' +
      '- Various low-level server-side improvements related to data storage\n\n' +
      '**Bugfixes**\n\n' +
      '- Fixed missing "Delete message" button in menu on mobile\n' +
      '- Chat remembers chatroom scroll position\n' +
      '- Tooltips not disappearing when they should\n' +
      '- Various text alignment and overflow issues fixed\n' +
      '- Payment streaks are properly reset when switching to non-participant (pledging $0)\n' +
      '- Properly scroll chat on new message when window is in background\n' +
      '- Properly play notification sounds for chatroom events\n' +
      '- Multiple bugfixes for issues preventing chatrooms from rendering properly\n' +
      '- Fixed a bug that prevented multilingual translations from working\n' +
      '- Fixed instances of contractID showing up instead of user display name\n' +
      '- Various UI bugfixes\n' +
      '- Various bugfixes to Chelonia'
  },
  {
    createdAt: new Date('2025-01-23T00:00:01'),
    title: 'Version 1.2.0 + The coming server wipe!',
    content:
      '**New Features in 1.2.0:**\n\n' +
      '- Push notifications! This version includes full support for end-to-end encrypted web push notifications. ' +
      'Works best on mobile as a [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing). ' +
      'Please see [our blog](https://groupincome.org/blog/) for this release for more details and caveats about push notifications, especially on iOS.\n' +
      '- Push notifications are now used for important in-group events and reminders.\n' +
      '- You can now change your password!\n' +
      '- Image compression: uploaded images will take up a maximum of ~400KB each to speed up loading times and save server space.\n' +
      '- Image viewer now supports left/right arrow keys to switch between multiple image attachments.\n' +
      '- Chat file attachments now show their size.\n' +
      '- You can now use the paste feature to add an image attachment.\n' +
      '- Mobile: `<enter>` key creates newline instead of sending message\n' +
      '- Chelonia now runs in a service worker to support push notifications and better state management with multiple open tabs.\n\n' +
      '**Bugfixes**\n\n' +
      '- Prevent accidental creation of multiple DMs.\n' +
      '- Fixed rendering of payment table rows.\n' +
      '- Fixes for forced-color mode.\n' +
      '- Fixed remaining issues related to showing not-logged-in users under group inactivity.\n' +
      '- "See proposal" link should always lead to proposal.\n' +
      '- Fixed chat auto-scroll issue.\n' +
      '- Fixed various markdown rendering bugs in chat.\n' +
      '- Miscellaneous bug fixes.\n\n' +
      '**Improvements**\n\n' +
      '- Added download/delete buttons to the image viewer.\n' +
      '- Emojis rendered slightly larger in chat now.\n' +
      '- Increased the maximum length of payment details to support long Lightning payment addresses.\n' +
      '- Various UI/UX improvements. See the 1.2.0 release [here](https://github.com/okTurtles/group-income/releases) for a complete list.\n\n' +
      'Congratulations to [@Vayras](https://github.com/Vayras) on making their first contribution to the project!\n\n' +
      '**Server Wipe Coming in Version 2.0!**\n\n' +
      'Version 2.0 is coming soon, and with it some major backwards-incompatible changes to the internals of Group Income. ' +
      'We will be forced to wipe all data on the groupincome.app site. Therefore, **please backup** any ' +
      'important data before the release to your computer. We will host a temporary backup site where users will be able ' +
      'to access their data for a period of time after the new version launches.'
  },
  {
    createdAt: new Date('2024-10-29T00:00:01'),
    title: '1.1.0 Released!',
    content: '**New Features**\n\n' +
      '- New image viewer: zoom in and out of photos with ease!\n' +
      '- "Notes to self": can create DM\'s to yourself now\n' +
      '- Notifications for non-monetary contributions updates\n' +
      '- Anyone-can-join invite links are now updated to support maximum 150 invitations\n\n' +
      'NOTE: old anyone-can-join invite links are expired, please use the new one!\n\n' +
      '**Bugfixes**\n\n' +
      '- The emoji selector\'s search field is now selected when you open it\n' +
      '- Fix for usernames in app notifications when user is removed\n' +
      '- Fix for "haven\'t logged in" users metric\n' +
      '- Fixed a markdown-related formatting issue related to lists\n' +
      '- Fixed send button not enabled when pasting text into chat\n' +
      '- Fix closing expired proposals\n\n' +
      '**Improvements**\n\n' +
      '- Add a red badge to the info icon to make it easier to see where DMs are\n' +
      '- Improved edit message input field hight\n' +
      '- Placeholders for payment info fields\n' +
      '- Misc. internal improvements'
  },
  {
    createdAt: new Date('2024-07-26T00:00:01'),
    title: 'Group Income 1.0 released! 🥳',
    content: '🎦 See the release party footage:\n\n' +
      '[https://groupincome.org/2024/07/group-income-released/](https://groupincome.org/2024/07/group-income-released/)'
  },
  {
    createdAt: new Date('2023-06-08T00:00:01'),
    title: 'The Prototype is Ready',
    content: "It's been quite a journey, but we're finally here. A new kind of software is ready for testing. " +
      "If you have a group of friends/family that's interested in supporting one another using monetary and non-monetary means, " +
      "you're a perfect fit to try out the Group Income prototype, and we want to hear from you! Read more on our blog: " +
      '[https://groupincome.org/2023/06/the-prototype-is-ready/](https://groupincome.org/2023/06/the-prototype-is-ready/)'
  },
  {
    createdAt: new Date('2021-06-08T00:00:01'),
    title: 'Roadmap Updates',
    content: "Some say it's not the destination that matters so much, but the journey and friends you meet along the way. " +
    "I couldn't agree more. But also, destinations aren't to be underestimated either! Back in 2019, during the Before Times, " +
    'our team — a mixture of independent contractors and volunteers — got together. Read more on our blog: ' +
    '[https://groupincome.org/2021/06/bulgaria-hackathon-2019-roadmap-updates-hiring/](https://groupincome.org/2021/06/bulgaria-hackathon-2019-roadmap-updates-hiring/)'
  }
]

export default ({
  name: 'NewAndUpdates',
  components: {
    Avatar,
    RenderMessageWithMarkdown
  },
  data () {
    return {
      dummyPosts
    }
  },
  methods: {
    humanDate
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-post-block {
  position: relative;
  width: 100%;
  margin-bottom: 2rem;
}

.c-post-created-date {
  padding-left: 1rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.c-post-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.5rem;

  .c-post-img-container {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    background-color: $general_2;
    flex-shrink: 0;
  }

  .c-post-content {
    flex-grow: 1;

    h3 {
      margin-bottom: 0.5rem;
    }
  }
}
</style>
