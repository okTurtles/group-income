<template lang='pug'>
.p-wrapper
  header.p-header
    h1.is-title-2.p-title
      img.c-logo(
        src='/assets/images/group-income-icon-transparent.png'
        alt=''
      )
      | {{$route.meta.title}}

  main.p-main
    .loading-box
    .loading-box
    .loading-box
</template>

<script>
export default {
  name: 'LoadingPage'
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$pagePadding: 1rem;
$pagePaddingDesktop: 5.5rem;

.p-wrapper {
  display: grid;
  grid-template-areas: "p-header" "p-main";
  grid-template-columns: 1fr;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100vh;
  width: 100vw;

  @include desktop {
    width: auto;
    grid-template-columns: 1fr $rightSideWidth;
    grid-template-areas:
      "p-header p-sidebar"
      "p-main p-sidebar";
  }
}

.p-main {
  grid-area: p-main;
  width: calc(100% - 2rem);
  margin: 0 auto;
  padding-top: 1.5rem;
  max-width: 50rem;
  display: flex;
  flex-direction: column;
  @include overflow-touch;

  @include tablet {
    width: calc(100% - 4rem);
  }

  @include desktop {
    width: auto;
    padding-top: 0;
    margin-right: 2rem;
    margin-left: $pagePaddingDesktop;
  }
}

.p-header {
  grid-area: p-header;
  transition: padding ease-out 300ms;
  text-align: center;
  min-height: 4rem;

  @include touch {
    display: flex;
    justify-content: center;
    align-items: center;
    position: sticky;
    top: 0;
    background: $general_2;
    z-index: 3;
  }

  @include desktop {
    display: block;
    padding-top: 1.125rem;
    text-align: left;
    min-height: 4.75rem;
    padding-left: $pagePaddingDesktop;
  }
}

.p-title {
  display: flex;
  align-items: center;
}

.c-logo {
  width: 1.5rem;
  height: 1.5rem;
  margin-right: 1rem;

  @include desktop {
    display: none;
  }
}
</style>
