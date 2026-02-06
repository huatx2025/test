<template>
  <a-modal
    v-model:open="visible"
    title="添加通用平台账号"
    :width="480"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="formState"
      :rules="formRules"
      layout="vertical"
      class="general-platform-form"
    >
      <a-form-item label="头像" name="avatar">
        <div class="avatar-section">
          <div class="avatar-preview">
            <img 
              v-if="!avatarLoadError"
              :src="formState.avatar" 
              alt="头像" 
              class="avatar-img"
              @error="handleAvatarError"
            />
            <div v-else class="avatar-fallback">
              {{ formState.name ? formState.name.charAt(0).toUpperCase() : '?' }}
            </div>
          </div>
          <a-button @click="generateRandomAvatar">
            <template #icon>
              <ReloadOutlined />
            </template>
            随机生成
          </a-button>
        </div>
      </a-form-item>

      <a-form-item label="昵称" name="name" required>
        <a-input
          v-model:value="formState.name"
          placeholder="请输入昵称"
          :maxlength="50"
          size="large"
        />
      </a-form-item>

      <a-form-item label="网站地址" name="url" required>
        <a-input
          v-model:value="formState.url"
          placeholder="请输入网站地址"
          size="large"
          @blur="handleUrlBlur"
        />
        <div class="platform-shortcuts-wrapper">
          <div class="platform-shortcuts">
            <div 
              v-for="platform in platformList" 
              :key="platform.key"
              class="platform-shortcut-item"
              :class="{ 'platform-shortcut-active': formState.url === platform.url }"
              @click="selectPlatform(platform)"
            >
              <img :src="platform.icon" :alt="platform.name" class="platform-shortcut-icon" />
              <span class="platform-shortcut-name">{{ platform.name }}</span>
            </div>
          </div>
        </div>
      </a-form-item>

      <a-form-item label="分组" name="groupId">
        <a-select
          v-model:value="formState.groupId"
          placeholder="请选择分组"
          :options="groupOptions"
          allow-clear
          size="large"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="handleOk">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { useAccountStore } from '@/store/modules/account'

// 平台图标
import douyinIcon from '@/assets/platform-icon/douyin.png'
import bilibiliIcon from '@/assets/platform-icon/bilibili.png'
import redbookIcon from '@/assets/platform-icon/redbook.png'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  // 预设平台类型：douyin / bilibili / redbook
  presetPlatform: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:open', 'success', 'cancel'])

// 使用 Store
const accountStore = useAccountStore()

// 本地显示状态
const visible = ref(props.open)

// 表单引用
const formRef = ref()

// 提交状态
const submitting = ref(false)

// 头像加载错误状态
const avatarLoadError = ref(false)

// 平台快捷列表
const platformList = [
  {
    key: 'douyin',
    name: '抖音',
    icon: douyinIcon,
    url: 'https://creator.douyin.com/'
  },
  {
    key: 'bilibili',
    name: 'B站',
    icon: bilibiliIcon,
    url: 'https://member.bilibili.com/'
  },
  {
    key: 'redbook',
    name: '小红书',
    icon: redbookIcon,
    url: 'https://creator.xiaohongshu.com/'
  }
]

// 处理 URL 输入框失去焦点
const handleUrlBlur = () => {
  if (formState.url && formState.url.trim()) {
    const trimmedUrl = formState.url.trim()
    // 如果既没有 http:// 也没有 https:// 前缀，则添加 https://
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      formState.url = `https://${trimmedUrl}`
    } else {
      formState.url = trimmedUrl
    }
  }
}

// 选择平台快捷填充
const selectPlatform = (platform) => {
  formState.url = platform.url
  // 清除该字段的验证错误
  formRef.value?.clearValidate(['url'])
}

// 随机头像种子列表（用于生成不同风格的头像）
const avatarStyles = [
  'adventurer',
  'adventurer-neutral',
  'avataaars',
  'big-ears',
  'big-ears-neutral',
  'big-smile',
  'bottts',
  'croodles',
  'croodles-neutral',
  'fun-emoji',
  'icons',
  'identicon',
  'lorelei',
  'lorelei-neutral',
  'micah',
  'miniavs',
  'notionists',
  'notionists-neutral',
  'open-peeps',
  'personas',
  'pixel-art',
  'pixel-art-neutral',
  'shapes',
  'thumbs'
]

// 生成随机头像 URL
const generateAvatarUrl = () => {
  const style = avatarStyles[Math.floor(Math.random() * avatarStyles.length)]
  const seed = Math.random().toString(36).substring(2, 15)
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`
}

// 表单数据
const formState = reactive({
  name: '',
  avatar: generateAvatarUrl(),
  url: '',
  groupId: null
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { max: 50, message: '昵称最多50个字符', trigger: 'blur' }
  ],
  url: [
    { required: true, message: '请输入网站地址', trigger: 'blur' },
    {
      pattern: /^https?:\/\/.+/,
      message: '请输入有效的URL地址（以 http:// 或 https:// 开头）',
      trigger: 'blur'
    }
  ]
}

// 分组选项
const groupOptions = computed(() => {
  const options = [
    {
      label: '不分组',
      value: null
    }
  ]
  
  // 添加所有分组
  accountStore.groups.forEach(group => {
    options.push({
      label: group.name,
      value: group.id
    })
  })
  
  return options
})

// 监听 props.open 变化
watch(
  () => props.open,
  (newVal) => {
    visible.value = newVal
    if (newVal) {
      // 打开时重置表单
      resetForm()
      // 如果有预设平台，自动填充URL
      if (props.presetPlatform) {
        const platform = platformList.find(p => p.key === props.presetPlatform)
        if (platform) {
          formState.url = platform.url
        }
      }
    }
  }
)

// 监听 visible 变化
watch(visible, (newVal) => {
  emit('update:open', newVal)
})

// 生成随机头像
const generateRandomAvatar = () => {
  avatarLoadError.value = false
  formState.avatar = generateAvatarUrl()
}

// 处理头像加载错误
const handleAvatarError = () => {
  avatarLoadError.value = true
}

// 重置表单
const resetForm = () => {
  formState.name = ''
  avatarLoadError.value = false
  formState.avatar = generateAvatarUrl()
  formState.url = ''
  formState.groupId = null
  formRef.value?.resetFields()
}

// 确认提交
const handleOk = async () => {
  try {
    // 验证表单
    await formRef.value.validate()
    
    submitting.value = true
    
    // 构造账号数据
    const accountData = {
      platform_type: 'general',
      name: formState.name,
      avatar: formState.avatar,
      url: formState.url,
      group_id: formState.groupId,
      // 生成唯一的 platform_id
      platform_id: `general_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    }
    
    // 调用 store 创建账号
    const result = await accountStore.createOrUpdateAccountAction(accountData)
    
    if (result.success) {
      message.success('添加成功')
      visible.value = false
      emit('success', result.account)
    } else {
      message.error(result.message || '添加失败')
    }
  } catch (error) {
    // 表单验证失败，不需要额外处理
    console.log('表单验证失败:', error)
  } finally {
    submitting.value = false
  }
}

// 取消
const handleCancel = () => {
  emit('cancel')
  visible.value = false
}
</script>

<style scoped lang="scss">
.general-platform-form {
  padding: 8px 0;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e8e8e8;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  font-size: 32px;
  font-weight: 600;
}

.platform-shortcuts-wrapper {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.platform-shortcuts {
  display: flex;
  gap: 12px;
}

.platform-shortcut-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--color-primary);
    background-color: rgba(102, 102, 255, 0.05);
  }
  
  &.platform-shortcut-active {
    border-color: var(--color-primary);
    background-color: rgba(102, 102, 255, 0.1);
  }
}

.platform-shortcut-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: cover;
}

.platform-shortcut-name {
  font-size: 13px;
  color: #333;
}
</style>

