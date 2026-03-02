import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import GraphView from './views/GraphView.vue'

const routes = [
  { path: '/', component: App },
  { path: '/graph', component: GraphView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
