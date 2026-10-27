import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import UsersView from './views/UsersView.vue'
import SimpleUsersView from './views/SimpleUsersView.vue'
import CompareView from './views/CompareView.vue'
import UserView from './views/UserView.vue'
import PlaygroundView from './views/PlaygroundView.vue'
import './fonts.css'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'simple-users', component: SimpleUsersView },
    { path: '/usuarios', name: 'users', component: UsersView },
    { path: '/comparar', name: 'compare', component: CompareView },
    { path: '/users/:id', name: 'user', component: UserView, props: true },
    { path: '/playground', name: 'playground', component: PlaygroundView },
  ],
})

createApp(App).use(router).mount('#app')
