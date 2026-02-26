<template>
  <AModal
    v-model:open="visible"
    :title="modalTitle"
    :width="720"
    :mask-closable="false"
    :keyboard="false"
    :closable="!processing"
    class="batch-publish-modal"
    @cancel="handleCancel"
  >
    <ASpin :spinning="loading" :tip="loadingTip">
      <!-- 发布内容 -->
      <div class="publish-content">
        <!-- 发布设置 -->
          <!-- 账号选择 -->
          <div class="publish-option-card account-select-card">
            <div class="option-header">
              <div class="option-title">
                <span>发布到账号</span>
              </div>
              <div class="account-select-actions">
                <a class="select-more-link" @click="showAccountSelector = true">选择更多</a>
                <span class="selected-count">当前已选择 {{ selectedAccounts.length }} 个账号</span>
              </div>
            </div>
            <div class="selected-accounts-list">
              <ATag
                v-for="account in selectedAccounts"
                :key="account.id"
                closable
                class="account-tag"
                @close.prevent="removeSelectedAccount(account.id)"
              >
                <AAvatar :src="account.avatar" :size="20" class="account-tag-avatar">
                  {{ account.name?.charAt(0) || '账' }}
                </AAvatar>
                <span class="account-tag-name">{{ account.name }}</span>
              </ATag>
              <span v-if="selectedAccounts.length === 0" class="no-account-hint">请选择要发布的账号</span>
            </div>
          </div>

          <!-- 发布参数设置 -->
         

      </div>
    </ASpin>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="modal-footer">
        <AButton @click="handleCancel" :disabled="processing">取消</AButton>
        <AButton 
          type="primary" 
          @click="handleStartPublish"
        >
          开始发布
        </AButton>
      </div>
    </template>
  </AModal>

  <!-- 账号选择弹窗 -->
  <AccountSelector
    v-model:visible="showAccountSelector"
    :exclude-account-ids="[]"
    ok-text="确认选择"
    @confirm="handleAccountSelectConfirm"
  />
</template>

<script setup>

</script>

<style scoped lang="scss">
.batch-publish-modal {
  :deep(.ant-modal-body) {
    padding: 16px 24px;
    max-height: 65vh;
    overflow-y: auto;
  }
}

.publish-content {
  min-height: 250px;
}

.publish-option-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.option-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.option-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 500;
  color: #262626;
}

.account-select-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.select-more-link {
  color: #1890ff;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    color: #40a9ff;
  }
}

.selected-count {
  color: #8c8c8c;
  font-size: 13px;
}

.selected-accounts-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  min-height: 32px;
}

.account-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 4px;
  border-radius: 4px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  
  .account-tag-avatar {
    flex-shrink: 0;
  }
  
  .account-tag-name {
    font-size: 13px;
    color: #262626;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  :deep(.ant-tag-close-icon) {
    margin-left: 4px;
    font-size: 10px;
    color: #8c8c8c;
    
    &:hover {
      color: #ff4d4f;
    }
  }
}

.no-account-hint {
  color: #bfbfbf;
  font-size: 13px;
  line-height: 32px;
}

.modal-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
