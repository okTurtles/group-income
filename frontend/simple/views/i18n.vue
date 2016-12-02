<template>
    <span><slot></slot></span>
</template>
<style>

</style>
<script>
    export default{
        props:['id'],
        beforeMount: function(){
            this.$slots.default[0].text= this.$translate(this.id,{defaultValue: this.$slots.default[0].text})
        }
    }
</script>
