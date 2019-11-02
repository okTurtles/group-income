<template lang='pug'>
.c-memberCircle-container
  svg.c-svg(viewbox='0 0 256 256' aria-hidden='true')
    circle.c-svg-circle(cx='128' cy='128' r='126')

  ul.c-list
    li.c-list-item(
      v-for='(member, username) in membersWithStyle.slice(0, 6)'
      :key='username'
    )
      .c-list-item-box(
        :style='member.style'
        v-on:mouseenter='toggleMemberActive(member, true)'
        v-on:mouseleave='toggleMemberActive(member, false)'
      )
        img.c-list-item-img(
          :src='member.attributes.picture'
          :alt='`${member.attributes.name}\'s avatar`'
        )

    li.c-list-item(v-if='members.length > maxMembers')
      .c-list-item-box(
        :style='membersWithStyle[maxMembers].style'
        v-on:mouseenter='toggleMemberActive("other", true)'
        v-on:mouseleave='toggleMemberActive("other", false)'
      )
        .c-list-item-others.is-flex
          i.icon-plus.is-size-4

  .c-member.has-text-centered(v-if='memberActive')
    strong(v-if='memberActive.attributes')
      | {{memberActive.attributes.name}}
    p.c-memberInfo-desc(v-if='memberActive.attributes')
      | Member since {2018}
    p.c-memberInfo-desc(v-if='!memberActive.attributes')
      | Plus
      strong {{members.length - maxMembers}} members
      |  since {2018}
    span.tag.c-memberInfo-tag(v-if='memberActive.attributes')
      | ${100}
  .c-member(v-else='')
    slot
</template>

<script>
export default {
  name: 'MembersCircle',
  props: {
    members: Array
  },
  data () {
    return {
      memberActive: false,
      maxMembers: 6
    }
  },
  methods: {
    toggleMemberActive (member, toActive = !this.memberActive) {
      this.memberActive = toActive ? member : false
    }
  },
  computed: {
    membersWithStyle () {
      const { members } = this
      const thetaIncr = Math.PI * 2.0 / members.length
      let mt = 0
      let ml = 0
      const sizeRadius = 8 // half $mainCircle-size

      members.forEach((member, i) => {
        mt = sizeRadius * Math.sin(thetaIncr * i) // r * sin(theta)
        ml = sizeRadius * Math.cos(thetaIncr * i) // r * sin(theta)

        members[i] = {
          attributes: members[i].attributes,
          style: {
            marginTop: mt + 'em',
            marginLeft: ml + 'em'
          }
        }
      })

      return members
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$scale-tablet: 1.1;
$scale-desktop: 1.6;

$mainCircle-size: 14rem;
$mainCircle-size-tablet: $mainCircle-size * $scale-tablet;
$mainCircle-size-desktop: 16.4rem;

$itemCircle-size: 2rem;
$itemCircle-size-tablet: 3rem;
$itemCircle-size-desktop: 4rem;

$border-width: 1px;

@mixin itemRound {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

@mixin centerXY {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

%circleScale {
  @include tablet {
    transform: scale($scale-tablet);
  }

  @include desktop {
    transform: scale($scale-desktop);
  }
}

%circleSize {
  position: relative;
  width: $mainCircle-size;
  height: $mainCircle-size;

  @include tablet {
    width: $mainCircle-size-tablet;
    height: $mainCircle-size-tablet;
  }

  @include desktop {
    width: $mainCircle-size-desktop;
    height: $mainCircle-size-desktop;
  }
}

.c-memberCircle-container {
  @extend %circleSize;
}

.c-svg {
  position: absolute;
  left: 0;
  top: 0;
  @extend %circleSize;

  &-circle {
    stroke: $primary_0;
    stroke-width: $border-width;
    stroke-dasharray: $spacer*0.75 $spacer;
    stroke-linecap: round;
    fill: transparent;
  }
}

.c-list {
  @extend %circleSize;
  @extend %circleScale;

  &-item {
    width: $itemCircle-size;
    height: $itemCircle-size;
    @include centerXY;

    @include tablet {
      width: $itemCircle-size-tablet;
      height: $itemCircle-size-tablet;
    }

    @include desktop {
      width: $itemCircle-size-desktop;
      height: $itemCircle-size-desktop;
    }

    &-box {
      position: relative;
      width: 100%;
      height: 100%;

      &::before {
        position: absolute;
        content: "";
        box-shadow: 0 0 0 $border-width $primary_0;
        opacity: 0;
        transition: opacity 150ms;
        @include itemRound;
      }

      &.is-active::before,
      &:hover::before {
        opacity: 1;
      }
    }

    &-img {
      border: $border-width solid $background;
      @include itemRound;
    }

    &-others {
      width: 100%;
      height: 100%;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      background: $general_2;
      color: $primary_0;
    }
  }
}

.c-member {
  max-width: $mainCircle-size - $itemCircle-size - $spacer-lg;
  @include centerXY;
}

.c-memberInfo {
  &-desc {
    margin: $spacer-xs 0 $spacer-sm;
  }

  &-tag {
    background: rgba($primary_0, 0.3);
  }
}
</style>
