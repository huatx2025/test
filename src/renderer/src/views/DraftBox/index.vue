<template>
  <div class="draft-box">
    <div class="draft-box-container">
      <!-- 草稿内容区域 -->
      <div class="draft-content-area">
        <!-- 草稿列表为空时显示 -->
        <div v-if="!selectedAccountId" class="empty-state">
          <AEmpty description="请选择账号查看草稿" />
        </div>
        
        <!-- 选中账号后显示草稿列表 -->
        <div v-else class="draft-list-container">
          <div class="draft-header">
            <div class="header-left">
              <WechatCreateMenu placement="bottomLeft" :trigger="['hover']" @action="handleCreateDraft">
                <AButton type="primary">
                  <template #icon>
                    <PlusOutlined />
                  </template>
                  创建草稿
                </AButton>
              </WechatCreateMenu>
              
              <AInput
                v-model:value="searchKeyword"
                placeholder="搜索标题/关键字"
                allow-clear
                class="search-input"
                @press-enter="handleSearch"
              >
                <template #suffix>
                  <SearchOutlined class="search-icon" @click="handleSearch" />
                </template>
              </AInput>
            </div>
            
            <div class="header-right">
              <ACheckbox
                :checked="isAllCurrentPageSelected"
                :indeterminate="isIndeterminate"
                @change="handleToggleSelectAll"
                class="select-all-checkbox"
              >
                {{ isAllCurrentPageSelected ? '取消全选' : '全选当前页' }}
              </ACheckbox>
              
              <APopover placement="bottomRight" trigger="hover">
                <template #content>
                  <SelectedDraftsList 
                    :selected-drafts="selectedDrafts"
                    @remove="removeDraftFromSelection"
                    @clear="clearSelection"
                  />
                </template>
                <ABadge :count="selectedDrafts.length" :overflow-count="99">
                  <AButton>
                    <template #icon>
                      <InboxOutlined />
                    </template>
                  </AButton>
                </ABadge>
              </APopover>

              <AButton 
                danger
                :disabled="selectedDrafts.length === 0"
                @click="handleBatchDelete"
              >
                <template #icon>
                  <DeleteOutlined />
                </template>
                批量删除
              </AButton>
              
              <AButton @click="handleRefresh">
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新
              </AButton>
              
              <ATooltip :title="viewMode === 'waterfall' ? '切换到列表模式' : '切换到瀑布流模式'">
                <AButton @click="toggleViewMode">
                  <template #icon>
                    <AppstoreOutlined v-if="viewMode === 'waterfall'" />
                    <UnorderedListOutlined v-else />
                  </template>
                </AButton>
              </ATooltip>
            </div>
          </div>
          
          <div ref="scrollContainer" class="draft-list">
            <div v-if="!loading && draftList.length === 0" class="empty-wrapper">
              <AEmpty description="暂无草稿" />
            </div>
            
            <div v-else class="draft-list-content">
              <!-- 瀑布流模式 -->
              <WaterfallContainer
                v-if="viewMode === 'waterfall'"
                :items="draftList"
                :columns="columns"
                :gap="16"
                :item-key="item => item.data_seq"
                class="waterfall-wrapper"
              >
                <template #default="{ item }">
                  <DraftCard
                    :draft-data="item"
                    :is-selected="isDraftSelected(item)"
                    @edit="handleDraftEdit"
                    @delete="handleDraftDelete"
                    @publish="handleDraftPublish"
                    @sync="handleDraftSync"
                    @select="handleDraftSelect"
                  />
                </template>
              </WaterfallContainer>
              
              <!-- 列表卡片模式 -->
              <div v-else class="grid-wrapper">
                <DraftCard
                  v-for="item in draftList"
                  :key="item.data_seq"
                  :draft-data="item"
                  :is-selected="isDraftSelected(item)"
                  @edit="handleDraftEdit"
                  @delete="handleDraftDelete"
                  @publish="handleDraftPublish"
                  @sync="handleDraftSync"
                  @select="handleDraftSelect"
                />
              </div>
            </div>
          </div>
          
          <!-- 分页 -->
          <div v-if="pagination.total > 0" class="draft-pagination">
            <APagination
              v-model:current="pagination.current"
              v-model:page-size="pagination.pageSize"
              :total="pagination.total"
              :show-size-changer="true"
              :show-quick-jumper="true"
              :show-total="total => `共 ${total} 篇草稿`"
              :page-size-options="['10', '20', '30', '50']"
              :locale="zhCN.Pagination"
              @change="handlePageChange"
            />
          </div>
          
          <!-- 加载遮罩层 -->
          <div v-if="loading" class="loading-overlay">
            <Spin size="large" />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 公众号选择器 -->
    <AccountSelector
      v-model:visible="accountSelectorVisible"
      :exclude-account-ids="[selectedAccountId]"
      ok-text="开始同步"
      @confirm="handleAccountSelectorConfirm"
      @cancel="handleAccountSelectorCancel"
    />
    
    <!-- 批量删除确认对话框 -->
    <AModal
      v-model:open="batchDeleteModalVisible"
      title="确定要批量删除选中的草稿吗？"
      ok-text="确定"
      cancel-text="取消"
      ok-type="danger"
      @ok="handleBatchDeleteConfirm"
      @cancel="handleBatchDeleteCancel"
    >
      <div class="batch-delete-content">
        <div class="delete-info">
          共选择了 <strong>{{ selectedDrafts.length }}</strong> 个草稿，删除后无法恢复
        </div>
        <div v-if="batchDeleteAccountNames.length > 0" class="delete-warning">
          <div class="warning-label">提示：</div>
          <div class="warning-text">
            草稿中包含账户（
            <span 
              v-for="(name, index) in batchDeleteAccountNames" 
              :key="index"
              class="account-name-highlight"
            >
              {{ name }}<span v-if="index < batchDeleteAccountNames.length - 1">、</span>
            </span>
            ），请谨慎操作。
          </div>
        </div>
      </div>
    </AModal>
    
    <!-- 发表对话框 -->
    <PublishModal
      v-model:open="publishModalVisible"
      :account-id="selectedAccountId"
      :draft="currentPublishDraft"
      @success="handlePublishSuccess"
      @cancel="handlePublishCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Empty as AEmpty, message, Modal, Modal as AModal, Spin, Pagination as APagination, Button as AButton, Input as AInput, Checkbox as ACheckbox, Tooltip as ATooltip } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, SearchOutlined, InboxOutlined, DeleteOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons-vue'
import { Badge as ABadge, Popover as APopover } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import DraftCard from './components/DraftCard.vue'
import WaterfallContainer from '@/components/common/WaterfallContainer.vue'
import SelectedDraftsList from './components/SelectedDraftsList.vue'
import AccountSelector from '@/components/common/AccountSelector.vue'
import WechatCreateMenu from '@/components/common/WechatCreateMenu.vue'
import PublishModal from './components/PublishModal.vue'
import { useAccountStore } from '@/store/modules/account'
import { useTaskManager } from '@/composables/useTaskManager'
import { getWechatDraftList, deleteWechatDraft, getDraftDetail } from '@/.thidparty_api/wechat'
import { createDeleteWechatDraftsTask, createSyncWechatDraftTask } from '@/utils/wechat'

// 路由
const router = useRouter()

// 使用账号store
const accountStore = useAccountStore()

// 使用任务管理器
const { createTask, updateTask, completeTask, failTask, showTaskPopover } = useTaskManager()

// 选中的账号ID - 使用草稿箱专用的状态
const selectedAccountId = computed(() => accountStore.draftBoxSelectedAccountId)

// 选中的账号对象 - 使用草稿箱专用的状态
const selectedAccount = computed(() => accountStore.getDraftBoxSelectedAccount)

// 草稿列表
const draftList = ref([])

// 加载状态
const loading = ref(false)

// 分页信息
const pagination = ref({
  current: 1,      // 当前页码
  pageSize: 20,    // 每页数量
  total: 0         // 总数
})

// 瀑布流列数
const columns = ref(4)

// 视图模式: 'waterfall' 瀑布流, 'grid' 列表卡片
// 从 localStorage 读取保存的设置，默认为瀑布流
const viewMode = ref(localStorage.getItem('draftbox_view_mode') || 'waterfall')

// 滚动容器引用
const scrollContainer = ref(null)

// ResizeObserver 实例
let resizeObserver = null

// 搜索关键词
const searchKeyword = ref('')

// 已选择的草稿列表（存储草稿数据和所属账号信息）
const selectedDrafts = ref([])

// 公众号选择器显示状态
const accountSelectorVisible = ref(false)

// 当前要同步的草稿
const currentSyncDraft = ref(null)

// 批量删除确认对话框
const batchDeleteModalVisible = ref(false)
const batchDeleteAccountNames = ref([])

// 发表对话框
const publishModalVisible = ref(false)
const currentPublishDraft = ref(null)

// 加载草稿列表
const loadDrafts = async (accountId, page = 1) => {
  try {
    loading.value = true
    const begin = (page - 1) * pagination.value.pageSize
    
    console.log('开始加载草稿列表，账号ID:', accountId, '页码:', page)
    
    const result = await getWechatDraftList(accountId, {
      begin,
      count: pagination.value.pageSize,
      query: searchKeyword.value
    })
    
    // 请求返回后，检查账号是否已切换，如果已切换则丢弃结果
    if (accountId !== selectedAccountId.value) {
      console.log('账号已切换，丢弃结果')
      return
    }
    
    console.log('草稿列表加载成功', result.items)
    

    draftList.value = result.items || []
    pagination.value.current = page
    pagination.value.total = result.total || 0
  } catch (error) {
    // 同样检查账号是否已切换
    if (accountId !== selectedAccountId.value) {
      return
    }
    
    console.error('加载草稿列表失败:', error)
    draftList.value = []
    message.error('加载草稿列表失败')
  } finally {
    // 只有当前账号的请求才关闭loading
    if (accountId === selectedAccountId.value) {
      loading.value = false
    }
  }
}

// 分页切换
const handlePageChange = async (page, pageSize) => {
  if (selectedAccountId.value) {
    // 如果每页数量变化，更新并重置到第一页
    if (pageSize !== pagination.value.pageSize) {
      pagination.value.pageSize = pageSize
      page = 1
    }
    
    await loadDrafts(selectedAccountId.value, page)
    
    // 重置滚动位置
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = 0
    }
  }
}

// 搜索草稿
const handleSearch = () => {
  if (selectedAccountId.value) {
    pagination.value.current = 1
    loadDrafts(selectedAccountId.value, 1)
  }
}

// 刷新列表
const handleRefresh = () => {
  if (selectedAccountId.value) {
    loadDrafts(selectedAccountId.value, pagination.value.current)
    message.success('刷新成功')
  }
}

// 切换视图模式
const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'waterfall' ? 'grid' : 'waterfall'
  // 保存到 localStorage
  localStorage.setItem('draftbox_view_mode', viewMode.value)
}

// 创建新草稿
const handleCreateDraft = (actionInfo) => {
  if (!selectedAccountId.value) {
    message.error('请先选择一个账号')
    return
  }

  const account = selectedAccount.value
  if (!account) {
    message.error('账号不存在')
    return
  }

  if (account.is_expired) {
    message.error('账号认证已过期，请先在多开面板重新登录')
    return
  }

  // 解析 token
  let token = ''
  try {
    if (account.auth_data) {
      const authData = JSON.parse(account.auth_data)
      token = authData.token || ''
    }
  } catch (error) {
    console.error('[微信编辑器] 解析认证数据失败:', error)
    message.error('账号认证数据异常')
    return
  }

  if (!token) {
    message.error('账号缺少必要的认证信息')
    return
  }

  // 使用组件提供的 buildUrl 方法构建URL
  const url = actionInfo.buildUrl(token)

  // 跳转到编辑器页面
  router.push({
    name: 'Editor',
    query: {
      action: 'create',
      accountId: account.id,
      url: url,
      title: actionInfo.title
    }
  })
}

// 计算瀑布流列数
const calculateColumns = () => {
  if (!scrollContainer.value) return
  
  const width = scrollContainer.value.clientWidth
  // 如果宽度为 0，说明容器还没有正确渲染，不进行计算
  if (width === 0) return
  
  if (width >= 1600) {
    columns.value = 5
  } else if (width >= 1200) {
    columns.value = 4
  } else if (width >= 900) {
    columns.value = 3
  } else if (width >= 600) {
    columns.value = 2
  } else {
    columns.value = 1
  }
}

// 初始化 ResizeObserver
const initResizeObserver = () => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  
  if (scrollContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      calculateColumns()
    })
    resizeObserver.observe(scrollContainer.value)
  }
}

// 组件挂载
onMounted(() => {
  // 使用 ResizeObserver 监听容器大小变化
  // 这样当从其他页面切换回来时，容器变为可见会触发尺寸变化
  initResizeObserver()
})

// 组件卸载
onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

// 监听选中账号变化
watch(selectedAccountId, (newAccountId) => {
  if (newAccountId) {
    draftList.value = []
    pagination.value.current = 1
    pagination.value.total = 0
    loadDrafts(newAccountId, 1)
  } else {
    draftList.value = []
  }
})

// 监听滚动容器变化，重新初始化 ResizeObserver
watch(scrollContainer, () => {
  if (scrollContainer.value) {
    initResizeObserver()
  }
})

// 处理草稿编辑
const handleDraftEdit = (draft) => {
  console.log('编辑草稿:', draft)
  
  // 检查是否有选中的账号
  if (!selectedAccountId.value) {
    message.error('请先选择一个账号')
    return
  }

  // 获取草稿标题（取第一篇文章的标题）
  const draftTitle = draft.multi_item?.[0]?.title || '无标题'
  
  // 跳转到编辑器页面，通过 query 参数传递信息
  router.push({
    name: 'Editor',
    query: {
      action: 'edit-draft',
      accountId: selectedAccountId.value,
      appmsgId: draft.app_id,
      draftTitle: draftTitle
    }
  })
}

// 处理草稿删除
const handleDraftDelete = (draft) => {
  Modal.confirm({
    title: '确定要删除该草稿吗？',
    content: ``,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        console.log('删除草稿:', draft)
        
        // 调用删除草稿接口（单个删除）
        await deleteWechatDraft(selectedAccountId.value, draft.app_id)
        
        console.log('删除草稿成功')
        message.success('删除成功')
        
        // 重新加载草稿列表
        if (selectedAccountId.value) {
          loadDrafts(selectedAccountId.value, pagination.value.current)
        }
      } catch (error) {
        console.error('删除草稿失败:', error)
        message.error(error.message || '删除草稿失败')
        throw error
      }
    }
  })
}

// 处理草稿发布
const handleDraftPublish = (draft) => {
  console.log('发布草稿:', draft)
  
  // 检查是否有选中的账号
  if (!selectedAccountId.value) {
    message.error('请先选择一个账号')
    return
  }
  
  // 检查账号是否过期
  const account = selectedAccount.value
  if (account?.is_expired) {
    message.error('账号认证已过期，请先在多开面板重新登录')
    return
  }
  
  // 保存当前要发布的草稿
  currentPublishDraft.value = draft
  
  // 显示发布对话框
  publishModalVisible.value = true
}

// 发表成功回调
const handlePublishSuccess = () => {
  // 刷新草稿列表
  if (selectedAccountId.value) {
    loadDrafts(selectedAccountId.value, pagination.value.current)
  }
}

// 取消发表
const handlePublishCancel = () => {
  currentPublishDraft.value = null
}

// 处理草稿同步
const handleDraftSync = async (draft) => {
  console.log('同步草稿:', draft)
  
  // 检查是否有选中的账号
  if (!selectedAccountId.value) {
    message.error('请先选择一个账号')
    return
  }
  
  // 保存当前草稿
  currentSyncDraft.value = draft
  
  // 显示公众号选择器
  accountSelectorVisible.value = true
}

// 确认选择公众号并开始同步
const handleAccountSelectorConfirm = async (selectedAccounts) => {
  if (!currentSyncDraft.value || !selectedAccountId.value) {
    return
  }
  
  if (selectedAccounts.length === 0) {
    message.warning('请选择至少一个公众号')
    return
  }
  
  try {
    // 显示加载提示
    const hide = message.loading('正在获取草稿详情...', 0)
    
    // 调用获取草稿详情接口
    const result = await getDraftDetail(selectedAccountId.value, currentSyncDraft.value.app_id)
    
    // 关闭加载提示
    hide()
    
    if (!result.success) {
      message.error('获取草稿详情失败')
      return
    }
    
    console.log('获取草稿详情成功:', result.app_msg_info)
    
    // 获取草稿标题
    const draftTitle = result.app_msg_info.item?.[0]?.multi_item?.[0]?.title || '无标题'
    
    // 创建同步任务
    createSyncWechatDraftTask(result.app_msg_info, selectedAccounts, {
      taskName: `同步《${draftTitle}》`,
      delayMs: 1000
    }).then(() => {
      console.log('同步任务完成')
    }).catch(error => {
      console.error('同步任务失败:', error)
    })
    
    // 打开任务中心弹窗
    showTaskPopover()
    
    // 提示用户任务已开始
    message.success(`已开始同步到 ${selectedAccounts.length} 个公众号`, 2)
    
  } catch (error) {
    console.error('同步失败:', error)
    message.error(error.message || '同步失败')
  } finally {
    // 清除当前草稿
    currentSyncDraft.value = null
  }
}

// 取消选择公众号
const handleAccountSelectorCancel = () => {
  currentSyncDraft.value = null
}

// 判断草稿是否被选中
const isDraftSelected = (draft) => {
  return selectedDrafts.value.some(item => 
    item.draft.data_seq === draft.data_seq && item.accountId === selectedAccountId.value
  )
}

// 处理草稿选择
const handleDraftSelect = (draft, checked) => {
  if (checked) {
    console.log(selectedAccount.value);
    
    // 添加到选中列表
    selectedDrafts.value.push({
      draft,
      accountId: selectedAccountId.value,
      accountName: selectedAccount.value.name,
      accountAvatar: selectedAccount.value.avatar
    })
  } else {
    // 从选中列表移除
    selectedDrafts.value = selectedDrafts.value.filter(item => 
      !(item.draft.data_seq === draft.data_seq && item.accountId === selectedAccountId.value)
    )
  }
}

// 从选中列表中移除草稿
const removeDraftFromSelection = (draft, accountId) => {
  selectedDrafts.value = selectedDrafts.value.filter(item => 
    !(item.draft.data_seq === draft.data_seq && item.accountId === accountId)
  )
}

// 清空选中列表
const clearSelection = () => {
  selectedDrafts.value = []
}

// 当前页面选中的草稿数量
const currentPageSelectedCount = computed(() => {
  if (draftList.value.length === 0) return 0
  
  return draftList.value.filter(draft => 
    selectedDrafts.value.some(item => 
      item.draft.data_seq === draft.data_seq && item.accountId === selectedAccountId.value
    )
  ).length
})

// 判断当前页面是否全选
const isAllCurrentPageSelected = computed(() => {
  if (draftList.value.length === 0) return false
  return currentPageSelectedCount.value === draftList.value.length
})

// 判断是否半选状态（部分选中）
const isIndeterminate = computed(() => {
  const count = currentPageSelectedCount.value
  return count > 0 && count < draftList.value.length
})

// 处理全选/取消选择
const handleToggleSelectAll = (e) => {
  const checked = e.target.checked
  
  if (checked) {
    // 全选：添加当前页面的所有草稿
    draftList.value.forEach(draft => {
      // 如果该草稿还未被选中，则添加
      if (!isDraftSelected(draft)) {
        selectedDrafts.value.push({
          draft,
          accountId: selectedAccountId.value,
          accountName: selectedAccount.value.name,
          accountAvatar: selectedAccount.value.avatar
        })
      }
    })
  } else {
    // 取消选择：移除当前页面的所有草稿
    draftList.value.forEach(draft => {
      selectedDrafts.value = selectedDrafts.value.filter(item => 
        !(item.draft.data_seq === draft.data_seq && item.accountId === selectedAccountId.value)
      )
    })
  }
}

// 批量删除草稿
const handleBatchDelete = () => {
  if (selectedDrafts.value.length === 0) {
    message.warning('请先选择要删除的草稿')
    return
  }
  
  // 检查是否选择了不同账户的草稿
  const accountIds = new Set(selectedDrafts.value.map(item => item.accountId))
  if (accountIds.size > 1) {
    batchDeleteAccountNames.value = Array.from(accountIds).map(accountId => {
      const item = selectedDrafts.value.find(item => item.accountId === accountId)
      return item?.accountName || `账号${accountId}`
    })
  } else {
    batchDeleteAccountNames.value = []
  }
  
  // 显示对话框
  batchDeleteModalVisible.value = true
}

// 确认批量删除
const handleBatchDeleteConfirm = () => {
  try {
    // 按账号分组
    const groupedByAccount = {}
    selectedDrafts.value.forEach(item => {
      if (!groupedByAccount[item.accountId]) {
        groupedByAccount[item.accountId] = {
          accountName: item.accountName,
          drafts: []
        }
      }
      groupedByAccount[item.accountId].drafts.push(item.draft)
    })
    
    // 启动批量删除任务
    for (const accountId in groupedByAccount) {
      const { accountName, drafts } = groupedByAccount[accountId]
      
      // 异步执行
      createDeleteWechatDraftsTask(Number(accountId), drafts, {
        taskName: `批量删除草稿(${accountName})`,
        delayMs: 100 // 单线程间隔
      }).then(() => {
        // 删除完成后，如果还在当前账号页面，刷新列表
        if (selectedAccountId.value === Number(accountId)) {
          loadDrafts(selectedAccountId.value, pagination.value.current)
        }
      }).catch(error => {
        console.error('批量删除失败:', error)
      })
    }
    
    // 清空选中列表
    clearSelection()
    
    // 关闭对话框
    batchDeleteModalVisible.value = false
    
    // 打开任务中心弹窗
    showTaskPopover()
    
    // 提示用户任务已开始
    message.success('批量删除任务已开始', 2)
  } catch (error) {
    console.error('批量删除失败:', error)
    message.error(error.message || '批量删除失败')
  }
}

// 取消批量删除
const handleBatchDeleteCancel = () => {
  batchDeleteModalVisible.value = false
}
</script>

<style scoped lang="scss">
.draft-box {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.draft-box-container {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.draft-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f5f5;
  min-height: 0;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.draft-list-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  position: relative;
}

.draft-header {
  padding: 16px 20px;
  background-color: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.select-all-checkbox {
  user-select: none;
  white-space: nowrap;
  
  :deep(.ant-checkbox) {
    top: 0;
  }
}

.search-input {
  width: 300px;
  
  .search-icon {
    color: #8c8c8c;
    cursor: pointer;
    
    &:hover {
      color: #1890ff;
    }
  }
}

.draft-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  min-height: 0;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f5f5f5;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #d9d9d9;
    border-radius: 4px;
    
    &:hover {
      background: #bfbfbf;
    }
  }
}

.empty-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.draft-list-content {
  min-height: 200px;
}

.waterfall-wrapper {
  --waterfall-gap: 16px;
}

.grid-wrapper {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  
  /* 卡片高度自适应内容 */
  grid-auto-rows: auto;
  
  /* 卡片顶部对齐 */
  align-items: start;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
  background: rgba(255, 255, 255, 0.8);
  z-index: 100;
}

.draft-pagination {
  padding: 16px 20px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.batch-delete-content {
  line-height: 1.8;
  
  .delete-info {
    margin-bottom: 12px;
    color: #262626;
    font-size: 14px;
  }
  
  .delete-warning {
    margin-top: 16px;
    padding: 12px;
    background: #fff7e6;
    border: 1px solid #ffe58f;
    border-radius: 4px;
    display: flex;
    gap: 8px;
    
    .warning-label {
      color: #fa8c16;
      font-weight: 500;
      flex-shrink: 0;
    }
    
    .warning-text {
      color: #595959;
      font-size: 14px;
      flex: 1;
      word-break: break-all;
      
      .account-name-highlight {
        color: #ff4d4f;
        font-weight: 600;
      }
    }
  }
}
</style>




