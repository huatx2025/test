import { createPinia } from 'pinia'

// 创建 pinia 实例
const store = createPinia();

export function setupStore(app) {
  app.use(store);
}

export { store };