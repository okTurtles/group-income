<template>
  <div>
  <button class="btn">{{ label }}</button>
  </div>
</template>

<script>
export default {
  name: 'GIButton',
  props: {
    label: String
  }
}
</script>

<style>
.btn {
  background-color: rgba(161, 206, 41, 1);
  color: rgba(255,255,255,1);
  border-radius: .5rem;
  font-size: 1.8rem;
  font-weight: 700;
  border: none;
  padding: 1.8rem;
}
</style>
