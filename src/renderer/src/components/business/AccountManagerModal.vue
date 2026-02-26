<template>
  <a-modal
    v-model:open="visible"
    title="账号管理器"
    :width="1000"
    :footer="null"
    :centered="true"
    :bodyStyle="{ height: '70vh', display: 'flex', flexDirection: 'column' }"
    @cancel="handleCancel"
  >
    <div class="account-manager">
      <!-- 筛选区域 -->
      <div class="filters">
        <a-form :model="filterForm" layout="inline" class="filter-form">
          <a-form-item label="账号名称">
            <a-input
              v-model:value="filterForm.keyword"
              placeholder="请输入账号名称/关键词"
              allow-clear
              style="width: 200px"
              @pressEnter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="平台类型">
            <a-select
              v-model:value="filterForm.platformType"
              placeholder="全部平台"
              allow-clear
              style="width: 150px"
            >
              <a-select-option value="wechat">公众号</a-select-option>
              <a-select-option value="general">通用平台</a-select-option>

            </a-select>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" @click="handleSearch">
              <template #icon>
                <SearchOutlined />
              </template>
              搜索
            </a-button>
            <a-button style="margin-left: 8px" @click="handleReset">
              <template #icon>
                <ReloadOutlined />
              </template>
              重置
            </a-button>
          </a-form-item>
        </a-form>
      </div>

      <!-- 操作栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <a-button
            type="primary"
            danger
            :disabled="selectedRowKeys.length === 0"
            @click="handleBatchDelete"
          >
            <template #icon>
              <DeleteOutlined />
            </template>
            批量删除
          </a-button>
          <a-button
            type="primary"
            :disabled="selectedRowKeys.length === 0"
            @click="handleBatchChangeGroup"
            style="margin-left: 8px"
          >
            <template #icon>
              <FolderOutlined />
            </template>
            批量修改分组
          </a-button>
          <a-divider type="vertical" style="height: 24px; margin: 0 12px" />
          <a-button
            :disabled="!currentSelectedGroup"
            @click="handleOpenEditGroup"
            style="margin-left: 0"
          >
            <template #icon>
              <EditOutlined />
            </template>
            修改分组名称
          </a-button>
          <a-button
            danger
            :disabled="!currentSelectedGroup"
            @click="handleDeleteGroup"
            style="margin-left: 8px"
          >
            <template #icon>
              <DeleteOutlined />
            </template>
            删除分组
          </a-button>
        </div>
        <div class="toolbar-right">
          <a-button @click="handleRefresh">
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </a-button>
        </div>
      </div>

      <!-- 分组筛选列 + 表格 -->
      <div class="table-container">
        <!-- 左侧分组筛选列 -->
        <div class="group-filter-sidebar">
          <div class="group-list">
            <div
              class="group-item"
              :class="{ active: selectedGroupFilter === 'all' }"
              @click="handleGroupFilterClick('all')"
            >
              <span class="group-name">全部账号</span>
              <span class="group-count">{{ totalAccountCount }}</span>
            </div>
            <div
              class="group-item"
              :class="{ active: selectedGroupFilter === 'ungrouped' }"
              @click="handleGroupFilterClick('ungrouped')"
            >
              <span class="group-name">未分组</span>
              <span class="group-count">{{ ungroupedCount }}</span>
            </div>
            <a-divider style="margin: 8px 0" />
            <div ref="groupListRef" class="sortable-group-list">
              <div
                v-for="group in accountStore.groups"
                :key="group.id"
                class="group-item"
                :class="{ active: selectedGroupFilter === group.id }"
                :data-id="group.id"
                @click="handleGroupFilterClick(group.id)"
              >
                <HolderOutlined class="drag-handle" />
                <span class="group-name" :title="group.name">{{ group.name }}</span>
                <span class="group-count">{{ getGroupAccountCount(group.id) }}</span>
              </div>
            </div>
          </div>
          <!-- 添加分组按钮 -->
          <div class="add-group-btn" @click="handleOpenCreateGroup">
            <PlusOutlined />
            <span>添加分组</span>
          </div>
        </div>

        <!-- 右侧表格 -->
        <div class="table-wrapper">
          <a-table
            :columns="columns"
            :data-source="paginatedAccounts"
            :row-selection="rowSelection"
            :loading="loading"
            :pagination="paginationConfig"
            row-key="id"
            :scroll="{ x: 'max-content', y: 'calc(70vh - 280px)' }"
            @change="handleTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'avatar'">
                <a-avatar :src="record.avatar" :size="40">
                  {{ record.name?.charAt(0) || '账' }}
                </a-avatar>
              </template>
              <template v-else-if="column.key === 'platform'">
                <div class="platform-cell">
                  <img
                    :src="getPlatformIcon(record.platform_type)"
                    :alt="record.platform_type"
                    class="platform-icon"
                  />
                  <span class="platform-name">{{ getPlatformName(record.platform_type) }}</span>
                </div>
              </template>
              <template v-else-if="column.key === 'group'">
                <a-select
                  :value="record.group_id || null"
                  placeholder="选择分组"
                  style="width: 120px"
                  size="small"
                  @change="(value) => handleInlineGroupChange(record, value)"
                >
                  <a-select-option :value="null">未分组</a-select-option>
                  <a-select-option
                    v-for="group in accountStore.groups"
                    :key="group.id"
                    :value="group.id"
                  >
                    {{ group.name }}
                  </a-select-option>
                </a-select>
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" size="small" @click="handleEdit(record)">
                    编辑
                  </a-button>
                  <a-popconfirm
                    title="确定要删除该账号吗？"
                    ok-text="确定"
                    cancel-text="取消"
                    @confirm="handleDelete(record)"
                  >
                    <a-button type="link" size="small" danger>删除</a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </div>
    </div>

    <!-- 编辑账号弹窗 -->
    <a-modal
      v-model:open="editModalVisible"
      title="编辑账号"
      :width="500"
      :centered="true"
      @ok="handleEditConfirm"
      @cancel="handleEditCancel"
    >
      <a-form
        ref="editFormRef"
        :model="editForm"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 18 }"
      >
        <a-form-item label="账号名称" name="name">
          <a-input v-model:value="editForm.name" placeholder="请输入账号名称" />
        </a-form-item>
        <a-form-item label="分组" name="groupId">
          <a-select
            v-model:value="editForm.groupId"
            placeholder="请选择分组"
            allow-clear
          >
            <a-select-option :value="null">未分组</a-select-option>
            <a-select-option
              v-for="group in accountStore.groups"
              :key="group.id"
              :value="group.id"
            >
              {{ group.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="handleEditCancel">取消</a-button>
        <a-button type="primary" :loading="editSubmitting" @click="handleEditConfirm">
          确定
        </a-button>
      </template>
    </a-modal>

    <!-- 批量修改分组弹窗 -->
    <a-modal
      v-model:open="batchGroupModalVisible"
      title="批量修改分组"
      :width="400"
      :centered="true"
      @ok="handleBatchGroupConfirm"
      @cancel="handleBatchGroupCancel"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="目标分组">
          <a-select
            v-model:value="batchGroupForm.groupId"
            placeholder="请选择分组"
            allow-clear
          >
            <a-select-option :value="null">未分组</a-select-option>
            <a-select-option
              v-for="group in accountStore.groups"
              :key="group.id"
              :value="group.id"
            >
              {{ group.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-alert
          message="提示"
          :description="`已选择 ${selectedRowKeys.length} 个账号`"
          type="info"
          show-icon
          style="margin-top: 16px"
        />
      </a-form>
      <template #footer>
        <a-button @click="handleBatchGroupCancel">取消</a-button>
        <a-button type="primary" :loading="batchGroupSubmitting" @click="handleBatchGroupConfirm">
          确定
        </a-button>
      </template>
    </a-modal>

    <!-- 创建分组弹窗 -->
    <a-modal
      v-model:open="createGroupModalVisible"
      title="创建分组"
      :width="400"
      :centered="true"
      @ok="handleCreateGroupConfirm"
      @cancel="handleCreateGroupCancel"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="分组名称" required>
          <a-input
            v-model:value="createGroupForm.name"
            placeholder="请输入分组名称"
            :maxlength="20"
            show-count
          />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="handleCreateGroupCancel">取消</a-button>
        <a-button type="primary" :loading="createGroupSubmitting" @click="handleCreateGroupConfirm">
          确定
        </a-button>
      </template>
    </a-modal>

    <!-- 编辑分组弹窗 -->
    <a-modal
      v-model:open="editGroupModalVisible"
      title="修改分组名称"
      :width="400"
      :centered="true"
      @ok="handleEditGroupConfirm"
      @cancel="handleEditGroupCancel"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="分组名称" required>
          <a-input
            v-model:value="editGroupForm.name"
            placeholder="请输入分组名称"
            :maxlength="20"
            show-count
          />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="handleEditGroupCancel">取消</a-button>
        <a-button type="primary" :loading="editGroupSubmitting" @click="handleEditGroupConfirm">
          确定
        </a-button>
      </template>
    </a-modal>
  </a-modal>
</template>

<script setup>
import { ref, computed, reactive, watch, onBeforeUnmount, nextTick } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  FolderOutlined,
  PlusOutlined,
  EditOutlined,
  HolderOutlined
} from '@ant-design/icons-vue'
import Sortable from 'sortablejs'
import { useAccountStore } from '@/store/modules/account'

// 平台图标
import gzhIcon from '@/assets/platform-icon/gzh.png'
import douyinIcon from '@/assets/platform-icon/douyin.png'
import bilibiliIcon from '@/assets/platform-icon/bilibili.png'
import redNoteIcon from '@/assets/platform-icon/red-note.png'
import tongyongIcon from '@/assets/platform-icon/tongyong.png'

// 平台图标映射
const platformIconMap = {
  wechat: gzhIcon,
  douyin: douyinIcon,
  bilibili: bilibiliIcon,
  xiaohongshu: redNoteIcon,
  rednote: redNoteIcon,
  general: tongyongIcon
}

// 平台名称映射
const platformNameMap = {
  wechat: '公众号',
  general: '通用平台'
}

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:open', 'refresh'])

const accountStore = useAccountStore()

// 弹窗显示状态
const visible = ref(props.open)

// 加载状态
const loading = ref(false)

// 筛选表单
const filterForm = reactive({
  keyword: '',
  platformType: undefined,
  groupId: undefined
})

// 选中的行
const selectedRowKeys = ref([])

// 编辑弹窗
const editModalVisible = ref(false)
const editFormRef = ref(null)
const editSubmitting = ref(false)
const editForm = reactive({
  id: null,
  name: '',
  groupId: null
})

// 批量修改分组弹窗
const batchGroupModalVisible = ref(false)
const batchGroupSubmitting = ref(false)
const batchGroupForm = reactive({
  groupId: null
})

// 分组筛选侧边栏选中状态
const selectedGroupFilter = ref('all')

// 创建分组弹窗
const createGroupModalVisible = ref(false)
const createGroupSubmitting = ref(false)
const createGroupForm = reactive({
  name: ''
})

// 编辑分组弹窗
const editGroupModalVisible = ref(false)
const editGroupSubmitting = ref(false)
const editGroupForm = reactive({
  id: null,
  name: ''
})

// 分组列表 ref（用于拖拽排序）
const groupListRef = ref(null)
let sortableInstance = null

// 当前选中的分组（用于启用/禁用修改分组按钮）
const currentSelectedGroup = computed(() => {
  if (selectedGroupFilter.value === 'all' || selectedGroupFilter.value === 'ungrouped') {
    return null
  }
  return accountStore.groups.find(g => g.id === selectedGroupFilter.value)
})

// 监听 open 属性变化
watch(() => props.open, (newVal) => {
  visible.value = newVal
})

// 监听 visible 变化，同步到父组件
watch(visible, (newVal) => {
  emit('update:open', newVal)
  if (!newVal) {
    // 关闭时重置状态
    handleReset()
    selectedRowKeys.value = []
  }
})

// 获取平台图标
const getPlatformIcon = (platformType) => {
  return platformIconMap[platformType] || tongyongIcon
}

// 获取平台名称
const getPlatformName = (platformType) => {
  return platformNameMap[platformType] || '未知平台'
}

// 获取分组名称
const getGroupName = (groupId) => {
  if (!groupId) {
    return '未分组'
  }
  const group = accountStore.groups.find(g => g.id === groupId)
  return group ? group.name : '未知分组'
}

// 获取总账号数量 - 只计算一次
const totalAccountCount = computed(() => {
  let count = accountStore.ungroupedAccounts.length
  accountStore.groups.forEach(group => {
    count += group.accounts?.length || 0
  })
  return count
})

// 获取未分组账号数量 - 直接使用 ungroupedAccounts，避免重复计算
const ungroupedCount = computed(() => accountStore.ungroupedAccounts.length)

// 获取指定分组的账号数量 - 直接从分组对象获取，避免重复遍历
const getGroupAccountCount = (groupId) => {
  const group = accountStore.groups.find(g => g.id === groupId)
  return group?.accounts?.length || 0
}

// 点击分组筛选
const handleGroupFilterClick = (filter) => {
  selectedGroupFilter.value = filter
  // 同步更新顶部筛选表单的分组选择
  if (filter === 'all') {
    filterForm.groupId = undefined
  } else if (filter === 'ungrouped') {
    filterForm.groupId = null
  } else {
    filterForm.groupId = filter
  }
  paginationConfig.current = 1
}

// 行内切换分组
const handleInlineGroupChange = async (record, newGroupId) => {
  try {
    const result = await accountStore.changeAccountGroup(record.id, newGroupId)
    if (result.success) {
      message.success('分组修改成功')
      loadAccounts()
      emit('refresh')
    } else {
      message.error(result.message || '分组修改失败')
    }
  } catch (error) {
    message.error('分组修改失败')
  }
}

// 过滤后的账号列表
const filteredAccounts = computed(() => {
  let accounts = accountStore.getAllAccounts

  // 按关键词筛选
  if (filterForm.keyword) {
    const keyword = filterForm.keyword.toLowerCase()
    accounts = accounts.filter(account =>
      account.name?.toLowerCase().includes(keyword) ||
      account.platform_id?.toLowerCase().includes(keyword)
    )
  }

  // 按平台类型筛选
  if (filterForm.platformType) {
    accounts = accounts.filter(account => account.platform_type === filterForm.platformType)
  }

  // 按分组筛选
  if (filterForm.groupId !== undefined) {
    if (filterForm.groupId === null) {
      // 未分组
      accounts = accounts.filter(account => !account.group_id)
    } else {
      // 指定分组
      accounts = accounts.filter(account => account.group_id === filterForm.groupId)
    }
  }

  return accounts
})

// 表格列定义
const columns = [
  {
    title: '头像',
    key: 'avatar',
    width: 80,
    align: 'center'
  },
  {
    title: '账号名称',
    dataIndex: 'name',
    key: 'name',
    width: 150,
    ellipsis: true
  },
  {
    title: '平台',
    key: 'platform',
    width: 150
  },
  {
    title: '分组',
    key: 'group',
    width: 160
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    align: 'center',
    fixed: 'right'
  }
]

// 行选择配置
const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  }
}))

// 分页配置
const paginationConfig = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`,
  pageSizeOptions: ['10', '20', '50', '100']
})

// 分页后的账号列表
const paginatedAccounts = computed(() => {
  const start = (paginationConfig.current - 1) * paginationConfig.pageSize
  const end = start + paginationConfig.pageSize
  return filteredAccounts.value.slice(start, end)
})

// 监听过滤后的账号列表变化，更新分页总数
watch(filteredAccounts, (accounts) => {
  paginationConfig.total = accounts.length
  // 如果当前页超出范围，重置到第一页
  if (paginationConfig.current > 1 && accounts.length === 0) {
    paginationConfig.current = 1
  }
}, { immediate: true })

// 监听顶部筛选框的分组变化，同步更新侧边栏选中状态
watch(() => filterForm.groupId, (newGroupId) => {
  if (newGroupId === undefined) {
    selectedGroupFilter.value = 'all'
  } else if (newGroupId === null) {
    selectedGroupFilter.value = 'ungrouped'
  } else {
    selectedGroupFilter.value = newGroupId
  }
})

// 加载账号数据
const loadAccounts = async () => {
  loading.value = true
  try {
    await accountStore.fetchGroups()
  } catch (error) {
    message.error('加载账号数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  paginationConfig.current = 1
}

// 重置筛选
const handleReset = () => {
  filterForm.keyword = ''
  filterForm.platformType = undefined
  filterForm.groupId = undefined
  selectedGroupFilter.value = 'all'
  paginationConfig.current = 1
}

// 刷新
const handleRefresh = () => {
  loadAccounts()
  message.success('刷新成功')
}

// 表格变化
const handleTableChange = (pagination) => {
  paginationConfig.current = pagination.current
  paginationConfig.pageSize = pagination.pageSize
}

// 编辑账号
const handleEdit = (record) => {
  editForm.id = record.id
  editForm.name = record.name
  editForm.groupId = record.group_id || null
  editModalVisible.value = true
}

// 确认编辑
const handleEditConfirm = async () => {
  if (!editForm.name?.trim()) {
    message.warning('请输入账号名称')
    return
  }

  editSubmitting.value = true
  try {
    const result = await accountStore.updateAccountAction(editForm.id, {
      name: editForm.name.trim(),
      group_id: editForm.groupId
    })

    if (result.success) {
      message.success('编辑成功')
      editModalVisible.value = false
      loadAccounts()
      emit('refresh')
    } else {
      message.error(result.message || '编辑失败')
    }
  } catch (error) {
    message.error('编辑失败')
  } finally {
    editSubmitting.value = false
  }
}

// 取消编辑
const handleEditCancel = () => {
  editModalVisible.value = false
  editForm.id = null
  editForm.name = ''
  editForm.groupId = null
}

// 删除账号
const handleDelete = async (record) => {
  try {
    const result = await accountStore.deleteAccountAction(record.id)
    if (result.success) {
      message.success('删除成功')
      loadAccounts()
      emit('refresh')
    } else {
      message.error(result.message || '删除失败')
    }
  } catch (error) {
    message.error('删除失败')
  }
}

// 批量删除
const handleBatchDelete = () => {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要删除的账号')
    return
  }

  Modal.confirm({
    title: '确定要删除选中的账号吗？',
    content: `已选择 ${selectedRowKeys.value.length} 个账号，删除后无法恢复`,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        let successCount = 0
        let failCount = 0

        for (const accountId of selectedRowKeys.value) {
          const result = await accountStore.deleteAccountAction(accountId)
          if (result.success) {
            successCount++
          } else {
            failCount++
          }
        }

        if (failCount === 0) {
          message.success(`成功删除 ${successCount} 个账号`)
        } else {
          message.warning(`成功删除 ${successCount} 个账号，失败 ${failCount} 个`)
        }

        selectedRowKeys.value = []
        loadAccounts()
        emit('refresh')
      } catch (error) {
        message.error('批量删除失败')
      }
    }
  })
}

// 批量修改分组
const handleBatchChangeGroup = () => {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要修改分组的账号')
    return
  }

  batchGroupForm.groupId = null
  batchGroupModalVisible.value = true
}

// 确认批量修改分组
const handleBatchGroupConfirm = async () => {
  batchGroupSubmitting.value = true
  try {
    let successCount = 0
    let failCount = 0

    for (const accountId of selectedRowKeys.value) {
      const result = await accountStore.changeAccountGroup(accountId, batchGroupForm.groupId)
      if (result.success) {
        successCount++
      } else {
        failCount++
      }
    }

    if (failCount === 0) {
      message.success(`成功修改 ${successCount} 个账号的分组`)
    } else {
      message.warning(`成功修改 ${successCount} 个账号，失败 ${failCount} 个`)
    }

    batchGroupModalVisible.value = false
    selectedRowKeys.value = []
    loadAccounts()
    emit('refresh')
  } catch (error) {
    message.error('批量修改分组失败')
  } finally {
    batchGroupSubmitting.value = false
  }
}

// 取消批量修改分组
const handleBatchGroupCancel = () => {
  batchGroupModalVisible.value = false
  batchGroupForm.groupId = null
}

// 打开创建分组弹窗
const handleOpenCreateGroup = () => {
  createGroupForm.name = ''
  createGroupModalVisible.value = true
}

// 确认创建分组
const handleCreateGroupConfirm = async () => {
  if (!createGroupForm.name?.trim()) {
    message.warning('请输入分组名称')
    return
  }

  createGroupSubmitting.value = true
  try {
    const result = await accountStore.createGroupAction({
      name: createGroupForm.name.trim()
    })

    if (result.success) {
      message.success('分组创建成功')
      createGroupModalVisible.value = false
      createGroupForm.name = ''
      loadAccounts()
      emit('refresh')
    } else {
      message.error(result.message || '创建分组失败')
    }
  } catch (error) {
    message.error('创建分组失败')
  } finally {
    createGroupSubmitting.value = false
  }
}

// 取消创建分组
const handleCreateGroupCancel = () => {
  createGroupModalVisible.value = false
  createGroupForm.name = ''
}

// 打开编辑分组弹窗
const handleOpenEditGroup = () => {
  if (!currentSelectedGroup.value) return
  editGroupForm.id = currentSelectedGroup.value.id
  editGroupForm.name = currentSelectedGroup.value.name
  editGroupModalVisible.value = true
}

// 确认编辑分组
const handleEditGroupConfirm = async () => {
  if (!editGroupForm.name?.trim()) {
    message.warning('请输入分组名称')
    return
  }

  editGroupSubmitting.value = true
  try {
    const result = await accountStore.updateGroupAction(editGroupForm.id, {
      name: editGroupForm.name.trim()
    })

    if (result.success) {
      message.success('分组修改成功')
      editGroupModalVisible.value = false
      editGroupForm.id = null
      editGroupForm.name = ''
      loadAccounts()
      emit('refresh')
    } else {
      message.error(result.message || '修改分组失败')
    }
  } catch (error) {
    message.error('修改分组失败')
  } finally {
    editGroupSubmitting.value = false
  }
}

// 取消编辑分组
const handleEditGroupCancel = () => {
  editGroupModalVisible.value = false
  editGroupForm.id = null
  editGroupForm.name = ''
}

// 删除分组
const handleDeleteGroup = () => {
  if (!currentSelectedGroup.value) return
  
  const group = currentSelectedGroup.value
  const accountCount = getGroupAccountCount(group.id)
  
  Modal.confirm({
    title: '确定要删除该分组吗？',
    content: accountCount > 0 
      ? `该分组下有 ${accountCount} 个账号，删除分组后这些账号将变为未分组状态`
      : '删除后无法恢复',
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        const result = await accountStore.deleteGroupAction(group.id)
        if (result.success) {
          message.success('分组删除成功')
          // 重置为全部
          selectedGroupFilter.value = 'all'
          filterForm.groupId = undefined
          loadAccounts()
          emit('refresh')
        } else {
          message.error(result.message || '删除分组失败')
        }
      } catch (error) {
        message.error('删除分组失败')
      }
    }
  })
}

// 初始化分组拖拽排序
const initGroupSortable = () => {
  nextTick(() => {
    if (groupListRef.value && !sortableInstance) {
      sortableInstance = Sortable.create(groupListRef.value, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'group-item-ghost',
        chosenClass: 'group-item-chosen',
        dragClass: 'group-item-drag',
        onEnd: async (evt) => {
          const { oldIndex, newIndex } = evt
          if (oldIndex === newIndex) return
          
          // 获取新的排序
          const groups = [...accountStore.groups]
          const [movedGroup] = groups.splice(oldIndex, 1)
          groups.splice(newIndex, 0, movedGroup)
          
          // 构建排序数据
          const sortItems = groups.map((g, index) => ({
            id: g.id,
            sort_order: index
          }))
          
          try {
            const result = await accountStore.sortGroupsAction(sortItems)
            if (result.success) {
              message.success('分组排序已更新')
            } else {
              message.error(result.message || '排序更新失败')
              loadAccounts()
            }
          } catch (error) {
            message.error('排序更新失败')
            loadAccounts()
          }
        }
      })
    }
  })
}

// 销毁拖拽实例
const destroySortable = () => {
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
}

// 监听弹窗显示状态，初始化/销毁拖拽
watch(visible, (newVal) => {
  if (newVal) {
    nextTick(() => {
      initGroupSortable()
    })
  } else {
    destroySortable()
  }
})

// 组件卸载时销毁拖拽实例
onBeforeUnmount(() => {
  destroySortable()
})

// 取消
const handleCancel = () => {
  visible.value = false
}
</script>

<style scoped lang="scss">
.account-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .filters {
    flex-shrink: 0;
    margin-bottom: 16px;
    padding: 16px;
    background: #fafafa;
    border-radius: 8px;

    .filter-form {
      margin: 0;
    }
  }

  .toolbar {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .toolbar-left,
    .toolbar-right {
      display: flex;
      align-items: center;
    }
  }

  .table-container {
    flex: 1;
    display: flex;
    gap: 16px;
    overflow: hidden;
  }

  .group-filter-sidebar {
    width: 160px;
    min-width: 160px;
    background: #fafafa;
    border-radius: 8px;
    padding: 12px;
    overflow-y: auto;

    .group-list {
      .group-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: 4px;
        user-select: none;

        &:hover {
          background: #e6f4ff;
        }

        &.active {
          background: #1890ff;
          color: #fff;

          .group-count {
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
          }

          .drag-handle {
            color: rgba(255, 255, 255, 0.7);
          }
        }

        .drag-handle {
          cursor: grab;
          color: #999;
          margin-right: 6px;
          flex-shrink: 0;
          
          &:hover {
            color: #1890ff;
          }
          
          &:active {
            cursor: grabbing;
          }
        }

        .group-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          user-select: none;
        }

        .group-count {
          min-width: 24px;
          height: 20px;
          line-height: 20px;
          text-align: center;
          background: #e8e8e8;
          border-radius: 10px;
          font-size: 12px;
          color: #666;
          margin-left: 8px;
        }
      }
      
      // 拖拽排序样式
      .group-item-ghost {
        opacity: 0.5;
        background: #c8ebfb;
      }
      
      .group-item-chosen {
        background: #e6f4ff;
      }
      
      .group-item-drag {
        opacity: 0.9;
      }
    }

    .add-group-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      margin-top: 8px;
      border: 1px dashed #d9d9d9;
      border-radius: 6px;
      cursor: pointer;
      color: #666;
      font-size: 13px;
      transition: all 0.2s;

      &:hover {
        border-color: #1890ff;
        color: #1890ff;
      }
    }
  }

  .table-wrapper {
    flex: 1;
    overflow: hidden;
  }

  .platform-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .platform-icon {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }

    .platform-name {
      font-size: 14px;
    }
  }
}

:deep(.ant-table) {
  .ant-table-thead > tr > th {
    background: #fafafa;
    font-weight: 600;
  }
}
</style>
