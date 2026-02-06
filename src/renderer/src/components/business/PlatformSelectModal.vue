<template>
  <AModal
    v-model:open="visible"
    title="选择平台"
    :footer="null"
    :width="400"
    :mask-closable="true"
    @cancel="handleCancel"
  >
    <div class="platform-selector">
      <div class="platform-grid">
        <div
          v-for="platform in platforms"
          :key="platform.key"
          class="platform-item"
          :class="{
            'platform-selected': selectedPlatform === platform.key,
            'platform-disabled': platform.disabled
          }"
          @click="handlePlatformSelect(platform)"
        >
          <div class="platform-icon" :class="`platform-icon-${platform.key}`">
            <!-- 公众号 -->
            <img
              v-if="platform.key === 'wechat'"
              src="@/assets/platform-icon/gzh.png"
              alt="公众号"
              class="platform-img"
            >
            <!-- 通用平台 -->
            <img
              v-else-if="platform.key === 'general'"
              src="@/assets/platform-icon/tongyong.png"
              alt="通用平台"
              class="platform-img"
            >
          
          </div>
          <div class="platform-name" :class="{ 'platform-name-disabled': platform.disabled }">
            {{ platform.name }}
          </div>
        </div>
      </div>
    </div>
  </AModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Modal as AModal } from 'ant-design-vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:open', 'select', 'cancel'])

const visible = ref(props.open)

// 平台列表
const platforms = ref([
  {
    key: 'wechat',
    name: '公众号',
    disabled: false
  },
  {
    key: 'general',
    name: '通用平台',
    disabled: false
  }
])

// 选中的平台（默认不选中）
const selectedPlatform = ref(null)

// 监听 open 属性变化
watch(() => props.open, (newVal) => {
  visible.value = newVal
})

// 监听 visible 变化，同步到父组件
watch(visible, (newVal) => {
  emit('update:open', newVal)
  // 关闭时重置选择状态
  if (!newVal) {
    selectedPlatform.value = null
  }
})

// 处理平台选择
const handlePlatformSelect = (platform) => {
  if (platform.disabled) {
    return
  }
  selectedPlatform.value = platform.key
  emit('select', platform)
  // 选择后自动关闭弹窗
  visible.value = false
}

// 处理取消
const handleCancel = () => {
  visible.value = false
  emit('cancel')
}
</script>

<style scoped lang="scss">
.platform-selector {
  padding: 8px 0;
}

.platform-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.platform-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
  background: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(.platform-disabled),
  &.platform-selected {
    border-color: var(--color-primary);
    background-color: rgba(102, 102, 255, 0.05);
  }

  &.platform-disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.platform-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 40px;
    height: 40px;
  }
}

.platform-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.platform-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  text-align: center;

  &.platform-name-disabled {
    color: #9ca3af;
  }
}

</style>

