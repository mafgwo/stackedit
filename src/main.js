import { createApp } from 'vue';
import 'indexeddbshim/dist/indexeddbshim';
import { registerSW } from "virtual:pwa-register";
import './extensions';
import './services/optional';
import icons from './icons';
import App from './components/App.vue';
import store from './store';
import localDbSvc from './services/localDbSvc';
import timeSvc from './services/timeSvc';

if (!indexedDB) {
  throw new Error('不支持您的浏览器，请升级到最新版本。');
}

registerSW({
  onOfflineReady: () => {
    // Tells to new SW to take control immediately
    // Not needed in Vite as default behavior is to take control immediately
  },
  onNeedRefresh: async () => {
    if (!store.state.light) {
      await localDbSvc.sync();
      localStorage.updated = true;
      // Reload the webpage to load into the new version
      window.location.reload();
    }
  },
});

if (localStorage.updated) {
  store.dispatch('notification/info', 'StackEdit中文版刚刚更新了！');
  setTimeout(() => localStorage.removeItem('updated'), 3000);
}

if (!localStorage.installPrompted) {
  window.addEventListener('beforeinstallprompt', async (promptEvent) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    promptEvent.preventDefault();

    try {
      await store.dispatch('notification/confirm', '将StackEdit中文版添加到您的主屏幕上？');
      promptEvent.prompt();
      await promptEvent.userChoice;
    } catch (err) {
      console.log(err)
      // Cancel
    }
    localStorage.installPrompted = true;
  });
}

const app = createApp(App);

// Global directives
app.directive('focus', {
  inserted(el) {
    el.focus();
    const { value } = el;
    if (value && el.setSelectionRange) {
      el.setSelectionRange(0, value.length);
    }
  },
});

const setElTitle = (el, title) => {
  el.title = title;
  el.setAttribute('aria-label', title);
};
app.directive('title', {
  bind(el, { value }) {
    setElTitle(el, value);
  },
  update(el, { value, oldValue }) {
    if (value !== oldValue) {
      setElTitle(el, value);
    }
  },
});

// Clipboard 使用浏览器原生的复制
app.directive('clipboard', {
  mounted(el, { value }) {
    el.addEventListener('click', () => {
      navigator.clipboard.writeText(value)
        .then(() => {
          console.log('复制成功');
        })
        .catch((err) => {
          console.error('复制失败:', err);
        });
    });
  },
  updated(el, { value }) {
    el.value = value; // 更新绑定的值
  }
});

// Global filters
app.config.globalProperties.$filters= {
  formatTime(time) {
    return timeSvc.format(time, store.state.timeCounter);
  }
}

for (const key in icons) {
  app.component(key, icons[key]);
}

app.use(store)
  .mount('#app');
