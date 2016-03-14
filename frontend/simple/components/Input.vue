<template>
  <div>
    <input class="text-input"
           name="{{ name }}"
           placeholder="{{ placeholder }}"
           v-bind:class="{'with-prefix-label': prefix }">
    <label for="{{ name }}">{{ label }} 
      <span v-if="prefix"
            class="prefix-label">
        {{prefix}}
      </span>
    </label>
  </div>
</template>

<script>
export default {
  name: 'GIInput',
  props: {
    name: String,
    label: String,
    placeholder: String,
    prefix: String
  }
}
</script>

<style>
label {
  display: block;
  position: relative;
  text-transform: uppercase;
  font-size: 1.2rem;
  margin-top: .5rem;
  margin-bottom: 1.5rem;
  font-weight: bold;
}
.prefix-label {
  position: absolute;
  left: 0;
  top: -3.4rem;
  font-size: 1.8rem;
}
.text-input {
  width: 27rem;
  border: none;
  padding: 1.5rem 1.5rem .5rem 0;
  border-bottom: .2rem dashed rgba(204, 204, 204, 1);
  font-size: 1.8rem;
}
.text-input.with-prefix-label {
  padding: 1.5rem 1.5rem .5rem 1.5rem;
}
input:focus {
  border-bottom: 2px solid rgba(161, 206, 41, 1);
  outline: none;
}
</style>
