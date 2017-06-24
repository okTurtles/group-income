<template>
  <div>
    <ul class='circle-container'>
      <li v-for="member in members"><img :src='member.picture'></li>
    </ul>
  </div>
</template>
<style lang="scss" scoped>
/// Mixin to put items on a circle
/// [1] - Allows children to be absolutely positioned
/// [2] - Allows the mixin to be used on a list
/// [3] - In case box-sizing: border-box has been enabled
/// [4] - Allows any type of direct children to be targeted
///
/// @param {Integer} $nb-items - Number or items
/// @param {Length} $circle-size - Container size
/// @param {Length} $item-size - Item size
/// @param {String | false} $class-for-IE - Base class name for old IE
@mixin distribute-on-circle(
  $nb-items,
  $circle-size,
  $item-size,
  $class-for-IE
) {
  $half-item: ($item-size / 2);
  $half-parent: ($circle-size / 2);

  position: relative; // 1
  width:  $circle-size;
  height: $circle-size;
  padding: 0;
  border-radius: 50%;
  list-style: none; // 2
  box-sizing: content-box; // 3

  > * { // 4
    display: block;
    position: absolute;
    top:  50%;
    left: 50%;
    width:  $item-size;
    height: $item-size;
    margin: -$half-item;
  }

  $angle: (360 / $nb-items);
  $rot: 0;

  @for $i from 1 through $nb-items {
    @if not $class-for-IE {
      > :nth-of-type(#{$i}) {
        transform: rotate($rot * 1deg) translate($half-parent) rotate($rot * -1deg);
      }
    } @else {
      > .#{$class-for-IE}#{$i} {
        // If CSS transforms are not supported
        $mt: sin($rot * pi() / 180) * $half-parent - $half-item;
        $ml: cos($rot * pi() / 180) * $half-parent - $half-item;
        margin: $mt 0 0 $ml;
      }
    }

    $rot: ($rot + $angle);
  }

}

.circle-container {
  @include distribute-on-circle(8, 20em, 6em, false);
  margin: 5em auto 0;
  border: solid 5px tomato;
}

.circle-container img {
  display: block;
  width: 100%;
  border-radius: 50%;
  filter: grayscale(100%);

  &:hover {
    filter: grayscale(0);
  }
}
</style>
<script>
import {mapGetters} from 'vuex'
export default {
  name: 'MembersCircle',
  mounted () {
    console.log('currentGroup:', this.currentGroup)
    // console.log('members:', this.members)
  },
  methods: {

  },
  computed: {
    members () { return this.$store.getters.membersForGroup },
    ...mapGetters(['currentGroup'])
  },
  data () {
    return {}
  }
}
</script>
