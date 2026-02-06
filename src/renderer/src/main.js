import { createApp } from 'vue'
import { setupStore } from '@/store';
import router from '@/router';
import Antd from 'ant-design-vue';
// 导入组件
import App from './App.vue'
// 导入样式文件
import 'ant-design-vue/dist/reset.css';
import '@/style/index.scss';
// iconfont
import '@/assets/iconfont/iconfont.css';

const app = createApp(App)

setupStore(app); // 设置store
app.use(router); // 使用路由
app.use(Antd); // 使用 Ant Design Vue
app.mount('#app')
