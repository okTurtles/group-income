<template>
  <div class="gi-memberCircle-container">
    <svg viewBox="0 0 320 320" version="1.1" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="gi-svg">
      <circle cx="160" cy="160" r="158" class="gi-svg-circle"/>
    </svg>

    <ul class="gi-circle-list">
      <li v-for="(member, username) in membersWithStyle.slice(0, 6)" class="gi-item">
        <div class="gi-item-box"
          :style="member.style"
          v-on:mouseenter="toggleMemberActive(member, true)"
          v-on:mouseleave="toggleMemberActive(member, false)"
          >
          <img class="gi-item-img"
            :src='member.attributes.picture'
            :alt="`${member.attributes.name}'s avatar`">
        </div>
      </li>

      <li v-if="members.length > maxMembers" class="gi-item">
        <div class="gi-item-box"
          :style="membersWithStyle[maxMembers].style"
          v-on:mouseenter="toggleMemberActive('other', true)"
          v-on:mouseleave="toggleMemberActive('other', false)"
          >
          <div class="gi-item-others is-flex">
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

$mainCircle-size: 16rem;
$mainCircle-size-tablet: 20rem; // same as <svg> viewBox
$itemCircle-size: 2rem;
$itemCircle-size-tablet: 6rem;
$border-width: 2px;

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

.gi-memberCircle-container,
.gi-svg,
.gi-circle-list {
  position: relative;
  width: $mainCircle-size;
  height: $mainCircle-size;

  @include tablet {
    width: $mainCircle-size-tablet;
    height: $mainCircle-size-tablet;
  }
}

.gi-svg {
  position: absolute;

  &-circle {
    stroke: $primary;
    stroke-width: $border-width;
    stroke-dasharray: $gi-spacer*0.75 $gi-spacer;
    stroke-linecap: round;
    fill: transparent;
  }
}

.gi-item {
  width: $itemCircle-size;
  height: $itemCircle-size;
  @include centerXY;

  @include tablet {
    width: $itemCircle-size-tablet;
    height: $itemCircle-size-tablet;
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
      const isTablet = window.innerWidth >= 768 // should be a utility like SCSS variables
      const thetaIncr = Math.PI * 2.0 / members.length
      let mt = 0
      let ml = 0
      const sizeRadius = isTablet ? 10 : 8

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
