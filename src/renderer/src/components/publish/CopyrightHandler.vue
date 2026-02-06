<template>
  <div class="copyright-handler">
    <!-- 步骤0: 确认发表方式 -->
    <div v-if="step === 0" class="confirm-step">
      <div class="warning-text">
        共 {{ copyrightList.length }} 篇内容未通过原创校验逻辑，将按照下列方式进行发表，如有异议可申诉
        <a class="guide-link" href="javascript:;">原创规则指引</a>
      </div>
      <div class="copyright-table-wrapper">
        <table class="copyright-table">
          <thead>
            <tr>
              <th style="width: 75%">未通过原因</th>
              <th style="width: 25%">发表方式</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in copyrightList" :key="item.source_idx">
              <td>
                你的内容《{{ item.article_title }}》与原创内容《{{ item.source_title }}》相似度过高，
                将以分享方式发表，如有异议可在当前页面申诉。
              </td>
              <td>
                <div class="publish-method">
                  <span>分享</span>
                  <span class="method-appeal">如有异议，可申诉</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 步骤1: 填写编者寄语 -->
    <div v-if="step === 1" class="guide-step">
      <div class="warning-text">
        共 {{ copyrightList.length }} 篇内容未通过原创校验逻辑，将按照下列方式进行发表
      </div>
      <div class="copyright-table-wrapper">
        <table class="copyright-table guide-table">
          <thead>
            <tr>
              <th style="width: 34%">待群发内容</th>
              <th style="width: 22%">群发方式</th>
              <th style="width: 44%">编者寄语</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in copyrightList" :key="idx">
              <td class="article-title-cell">{{ item.article_title }}</td>
              <td>
                <div class="publish-method-preview">
                  <span>分享</span>
                  <span class="method-preview-text">分享样式，可预览</span>
                </div>
              </td>
              <td>
                <ATextarea
                  v-model:value="guideWordsLocal[idx]"
                  :maxlength="140"
                  :rows="3"
                  placeholder="分享推荐语，可以不填写"
                  :show-count="true"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Textarea as ATextarea } from 'ant-design-vue'

const props = defineProps({
  // 原创检测命中的文章列表
  copyrightList: {
    type: Array,
    default: () => []
  },
  // 当前步骤（0=确认方式，1=填写寄语）
  step: {
    type: Number,
    default: 0
  },
  // 编者寄语数组（v-model）
  guideWords: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:guideWords', 'skip'])

const guideWordsLocal = ref([])

// 初始化寄语数组
watch(() => props.copyrightList, (list) => {
  guideWordsLocal.value = new Array(list.length).fill('')
}, { immediate: true })

// 外部传入值时同步
watch(() => props.guideWords, (val) => {
  if (val && val.length > 0) {
    guideWordsLocal.value = [...val]
  }
}, { immediate: true })

// 同步寄语变化
watch(guideWordsLocal, (val) => {
  emit('update:guideWords', [...val])
}, { deep: true })
</script>

<style scoped lang="scss">
.copyright-handler {
  .warning-text {
    font-size: 14px;
    color: #595959;
    margin-bottom: 16px;
    line-height: 1.6;
  }
  
  .guide-link {
    color: #1890ff;
    margin-left: 8px;
    
    &:hover {
      color: #40a9ff;
    }
  }
}

.copyright-table-wrapper {
  overflow-x: auto;
}

.copyright-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  
  th {
    background: #fafafa;
    color: #8c8c8c;
    font-weight: normal;
    text-align: left;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 14px;
  }
  
  td {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 14px;
    color: #262626;
    vertical-align: top;
  }
  
  tr:last-child td {
    border-bottom: none;
  }
}

.guide-table {
  td {
    vertical-align: middle;
  }
}

.article-title-cell {
  word-break: break-all;
}

.publish-method {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.method-appeal {
  font-size: 12px;
  color: #8c8c8c;
}

.publish-method-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.method-preview-text {
  font-size: 12px;
  color: #1890ff;
  cursor: pointer;
}

:deep(.ant-input-textarea) {
  .ant-input {
    resize: none;
  }
}

:deep(.ant-input-textarea-show-count::after) {
  font-size: 12px;
  color: #8c8c8c;
}
</style>
