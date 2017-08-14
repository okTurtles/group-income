<template>
  <div>
    <ul class='circle-container'>
      <li v-for="(member, username) in members">
        <img :src='member.attrs.picture' :style="member.style">
      </li>
    </ul>
  </div>
</template>
<style lang="scss" scoped>
// https://codepen.io/camsong/pen/yqsoK
// https://codepen.io/HugoGiraudel/pen/Bigqr
// https://codepen.io/juanbrujo/pen/ykpqw
// svg: https://codepen.io/JMChristensen/pen/Ablch

/// Mixin to put items on a circle
/// [1] - Allows children to be absolutely positioned
/// [2] - Allows the mixin to be used on a list
/// [3] - In case box-sizing: border-box has been enabled
/// [4] - Allows any type of direct children to be targeted
.circle-container {
  position: relative; // 1
  width:  20em;
  height: 20em;
  padding: 0;
  border-radius: 50%;
  list-style: none; // 2
  box-sizing: content-box; // 3
  margin: 5em auto 0;
  border: solid 5px #64caf1;

  > * {
    display: block;
    position: absolute;
    top:  50%;
    left: 50%;
    width:  6em;
    height: 6em;
    margin: -3em; // half previous value
  }

  img {
    display: block;
    width: 100%;
    border-radius: 50%;
    box-shadow: 0 0 0 5px #64caf1;
  }

  // a {
  //   display: block;
  //   border-radius: 50%;
  //   box-shadow: 0 0 0 5px tomato;
  // }
}

</style>
<script>
import {mapGetters} from 'vuex'
export default {
  name: 'MembersCircle',
  mounted () {
  },
  methods: {

  },
  computed: {
    members () {
      var members = this.$store.getters.membersForGroup()
      const usernames = Object.keys(members)
      const thetaIncr = Math.PI * 2.0 / usernames.length
      usernames.map(function (username, idx) {
        var mt = 10 * Math.sin(thetaIncr * idx) // r * sin(theta)
        var ml = 10 * Math.cos(thetaIncr * idx) // r * sin(theta)
        members[username] = {
          attrs: members[username].globalProfile,
          style: {
            marginTop: mt + 'em',
            marginLeft: ml + 'em'
          }
        }
      })
      return members
    },
    ...mapGetters(['currentGroup'])
  },
  data () {
    return {}
  }
}
</script>
