<template>
  <div class="gi-memberCircle-container">
    <svg viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="gi-svg">
      <circle cx="128" cy="128" r="126" class="gi-svg-circle"/>
    </svg>

    <ul class="gi-list">
      <li v-for="(member, username) in membersWithStyle.slice(0, 6)" class="gi-list-item">
        <div class="gi-list-item-box"
          :style="member.style"
          v-on:mouseenter="toggleMemberActive(member, true)"
          v-on:mouseleave="toggleMemberActive(member, false)"
          >
          <img class="gi-list-item-img"
            :src='member.attributes.picture'
            :alt="`${member.attributes.name}'s avatar`">
        </div>
      </li>

      <li v-if="members.length > maxMembers" class="gi-list-item">
        <div class="gi-list-item-box"
          :style="membersWithStyle[maxMembers].style"
          v-on:mouseenter="toggleMemberActive('other', true)"
          v-on:mouseleave="toggleMemberActive('other', false)"
          >
          <div class="gi-list-item-others is-flex">
            <i class="fa fa-plus is-size-4"></i>
          </div>
        </div>
      </li>
    </ul>

    <div class="gi-center has-text-centered"
      v-if="memberActive">
      <strong class="is-size-5 has-text-font-weight-bold"
        v-if="memberActive.attributes">
        {{memberActive.attributes.name}}
      </strong>
      <p class="gi-memberInfo-desc"
        v-if="memberActive.attributes">
        Member since {2018}
      </p>
      <p class="gi-memberInfo-desc"
        v-if="!memberActive.attributes">
        Plus <strong>{{members.length - maxMembers}} members</strong> since {2018}
      </p>
      <span class="tag gi-memberInfo-tag"
        v-if="memberActive.attributes">
        ${100}
      </span>
    </div>

    <div class="gi-center" v-else>
      <slot></slot>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import "../sass/theme/index";

$scale-tablet: 1.25;
$scale-desktop: 1.5;

$mainCircle-size: 16rem;
$mainCircle-size-tablet: $mainCircle-size * $scale-tablet;
$mainCircle-size-desktop: $mainCircle-size * $scale-desktop;

$itemCircle-size: 2rem;
$itemCircle-size-tablet: 3rem;
$itemCircle-size-desktop: 4rem;

$border-width: 1.5px;

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

.gi-memberCircle-container {
  @extend %circleSize;
}

.gi-svg {
  position: absolute;
  left: 0;
  top: 0;
  @extend %circleSize;

  &-circle {
    stroke: $primary;
    stroke-width: $border-width;
    stroke-dasharray: $gi-spacer*0.75 $gi-spacer;
    stroke-linecap: round;
    fill: transparent;
  }
}

.gi-list {
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
        content: '';
        box-shadow: 0 0 0 $border-width $primary;
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
      border: $border-width solid $body-background-color;
      @include itemRound;
    }

    &-others {
      width: 100%;
      height: 100%;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      background: $white-ter;
      color: $primary;
    }
  }
}

.gi-center {
  max-width: $mainCircle-size - $itemCircle-size - $gi-spacer-lg;
  @include centerXY;
}

.gi-memberInfo {
  &-desc {
    margin: $gi-spacer-xs 0 $gi-spacer-sm;
  }

  &-tag {
    background: rgba($primary, 0.3);
  }
}
</style>
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
