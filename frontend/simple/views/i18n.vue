<template>
    <span><slot></slot></span>
</template>
<style>

</style>
<script>
    import L from '../js/translations'
    export default{
        props:['id'],
        beforeMount: function(){
            this.$slots.default[0].text= L(`${this.$slots.default[0].text}.text`,{defaultValue: this.$slots.default[0].text})
        }
    }
</script>
