<template>
  <div class="waterfall-container" :style="containerStyle">
    <div
      v-for="col in columnItems"
      :key="col.index"
      class="waterfall-column"
    >
      <div
        v-for="item in col.items"
        :key="getItemKey(item.data, item.index)"
        class="waterfall-item"
      >
        <slot :item="item.data" :index="item.index"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 数据列表
  items: {
    type: Array,
    default: () => []
  },
  // 列数
  columns: {
    type: Number,
    default: 3
  },
  // 列间距
  gap: {
    type: Number,
    default: 16
  },
  // 获取 key 的函数
  itemKey: {
    type: [String, Function],
    default: 'id'
  }
})

// 按横向顺序分配到各列
const columnItems = computed(() => {
  const cols = Array.from({ length: props.columns }, (_, index) => ({
    index,
    items: []
  }))
  
  // 横向分配：第一个放第一列，第二个放第二列...第n个放第n列，第n+1个又放第一列
  props.items.forEach((item, index) => {
    const colIndex = index % props.columns
    cols[colIndex].items.push({
      data: item,
      index
    })
  })
  
  return cols
})

// 获取容器样式
const containerStyle = computed(() => {
  return {
    gap: `${props.gap}px`
  }
})

// 获取项目 key
const getItemKey = (item, index) => {
  if (typeof props.itemKey === 'function') {
    return props.itemKey(item, index)
  }
  return item[props.itemKey] || index
}
</script>

<style scoped lang="scss">
.waterfall-container {
  width: 100%;
  display: flex;
  align-items: flex-start;
}

.waterfall-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.waterfall-item {
  width: 100%;
  margin-bottom: var(--waterfall-gap, 16px);
  
  &:last-child {
    margin-bottom: 0;
  }
}
</style>

