<template>
  <view class="symbol" :class="kind" aria-hidden="true">
    <template v-if="kind==='dumbbell'"><view class="bar"/><view class="plate left-inner"/><view class="plate left-outer"/><view class="plate right-inner"/><view class="plate right-outer"/></template>
    <template v-else-if="kind==='person'"><view class="head"/><view class="shoulders"/></template>
    <template v-else-if="kind==='folder'"><view class="folder-tab"/><view class="folder-body"/></template>
    <view v-else-if="kind==='ring'" class="ring-shape"/>
  </view>
</template>

<script setup>
defineProps({kind:{type:String,required:true}})
</script>

<style scoped>
.symbol{position:relative;display:inline-block;flex:none;width:32rpx;height:32rpx;color:inherit}
.dumbbell .bar{position:absolute;left:4rpx;right:4rpx;top:14rpx;height:4rpx;border-radius:3rpx;background:currentColor}.dumbbell .plate{position:absolute;top:7rpx;width:5rpx;height:18rpx;border-radius:3rpx;background:currentColor}.dumbbell .left-inner{left:7rpx}.dumbbell .left-outer{left:1rpx;top:10rpx;height:12rpx}.dumbbell .right-inner{right:7rpx}.dumbbell .right-outer{right:1rpx;top:10rpx;height:12rpx}
.person .head{position:absolute;top:2rpx;left:12rpx;width:9rpx;height:9rpx;border-radius:50%;background:currentColor}.person .shoulders{position:absolute;bottom:3rpx;left:4rpx;width:25rpx;height:15rpx;border-radius:13rpx 13rpx 5rpx 5rpx;background:currentColor}
.folder .folder-tab{position:absolute;top:5rpx;left:3rpx;width:13rpx;height:7rpx;border-radius:3rpx 4rpx 0 0;background:currentColor}.folder .folder-body{position:absolute;top:10rpx;left:3rpx;width:27rpx;height:19rpx;border-radius:3rpx 5rpx 5rpx 5rpx;background:currentColor}
.ring-shape{position:absolute;top:6rpx;left:6rpx;box-sizing:border-box;width:21rpx;height:21rpx;border:3rpx solid currentColor;border-radius:50%}
</style>
