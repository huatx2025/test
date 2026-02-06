import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import { getToken } from '@/api/index'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Auth/index.vue'),
    meta: {
      title: '登录',
      requiresAuth: false
    }
  },
  {
    path: '/',
    component: MainLayout,
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: '',
        name: 'MultiAccountPanel',
        component: () => import('@/views/MultiAccountPanel/index.vue'),
        meta: {
          title: '多开面板'
        }
      },
      {
        path: 'draft-box',
        name: 'DraftBox',
        component: () => import('@/views/DraftBox/index.vue'),
        meta: {
          title: '草稿箱'
        }
      },
      {
        path: 'editor',
        name: 'Editor',
        component: () => import('@/views/Editor/index.vue'),
        meta: {
          title: '编辑器'
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - EasyDraft` : 'EasyDraft'
  
  const token = getToken()
  
  // 检查是否需要认证
  if (to.meta.requiresAuth !== false) {
    // 需要认证的页面
    if (!token) {
      // 未登录，跳转到登录页
      next({ name: 'Login' })
      return
    }
  } else {
    // 登录页面
    if (token && to.name === 'Login') {
      // 已登录，跳转到首页
      next({ path: '/' })
      return
    }
  }
  
  next()
})

export default router
