<template>
    <span><slot></slot></span>
</template>
<style>

</style>
<script>
    export default{
        props:['id'],
        beforeMount: function(){
            this.$slots.default[0].text= this.$L(`${this.$slots.default[0].text}.text`,{defaultValue: this.$slots.default[0].text})
        }
    }
</script>
