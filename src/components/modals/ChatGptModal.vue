<template>
  <modal-inner class="modal__inner-1--chatgpt" aria-label="chatgpt">
    <div class="modal__content">
      <div class="modal__image">
        <icon-chat-gpt></icon-chat-gpt>
      </div>
      <p><b>ChatGPT内容生成</b><br>生成时长受ChatGPT服务响应与网络响应时长影响，时间可能较长</p>
      <form-entry label="生成内容要求详细描述" error="content">
        <textarea slot="field" class="text-input" type="text" placeholder="输入内容(支持换行)" v-model.trim="content" :disabled="generating || !chatGptConfig.apiKey"></textarea>
        <div class="form-entry__info">
          <span v-if="!chatGptConfig.apiKey" class="config-warning">
            未配置apiKey，请点击 <a href="javascript:void(0)" @click="openConfig">配置</a> apiKey。
          </span>
          <span v-else>
            <span v-if="chatGptConfig.proxyHost">
              <b>当前使用的接口代理：</b>{{ chatGptConfig.proxyHost }}
            </span>
            <a href="javascript:void(0)" @click="openConfig">修改apiKey配置</a>
          </span>
        </div>
      </form-entry>
      <div class="modal__result">
        <pre class="result_pre" v-if="generating && !result">(等待生成中...)</pre>
        <pre class="result_pre" v-else v-text="result"></pre>
      </div>
    </div>
    <div class="modal__button-bar">
      <button class="button" @click="reject()">{{ generating ? '停止' : '关闭' }}</button>
      <button class="button button--resolve" @click="generate" v-if="!generating && !!content">{{ !!result ? '重新生成' : '开始生成' }}</button>
      <button class="button button--resolve" @click="resolve" v-if="!generating && !!result">确认插入</button>
    </div>
  </modal-inner>
</template>

<script>
import { mapGetters } from 'vuex';
import modalTemplate from './common/modalTemplate';
import chatGptSvc from '../../services/chatGptSvc';
import store from '../../store';

export default modalTemplate({
  data: () => ({
    generating: false,
    content: '',
    result: '',
    xhr: null,
  }),
  computed: {
    ...mapGetters('chatgpt', [
      'chatGptConfig',
    ]),
  },
  methods: {
    resolve(evt) {
      evt.preventDefault(); // Fixes https://github.com/mafgwo/stackedit/issues/1503
      const { callback } = this.config;
      this.config.resolve();
      callback(this.result);
    },
    process({ done, content, error }) {
      if (done) {
        this.generating = false;
        // 已结束
      } else if (content) {
        this.result = this.result + content;
        const container = document.querySelector('.result_pre');
        container.scrollTo(0, container.scrollHeight); // 滚动到最底部
      } else if (error) {
        this.generating = false;
      }
    },
    generate() {
      this.generating = true;
      this.result = '';
      try {
        this.xhr = chatGptSvc.chat({
          proxyHost: this.chatGptConfig.proxyHost,
          apiKey: this.chatGptConfig.apiKey,
          content: `${this.content}\n(使用Markdown方式输出结果)`,
          temperature: this.chatGptConfig.temperature || 1,
        }, this.process);
      } catch (err) {
        this.generating = false;
        store.dispatch('notification/error', err);
      }
    },
    async openConfig() {
      try {
        const config = await store.dispatch('modal/open', {
          type: 'chatGptConfig',
          apiKey: this.chatGptConfig.apiKey,
          proxyHost: this.chatGptConfig.proxyHost,
          temperature: this.chatGptConfig.temperature,
        });
        store.dispatch('chatgpt/setCurrConfig', config);
      } catch (e) { /* Cancel */ }
    },
    reject() {
      if (this.generating) {
        if (this.xhr) {
          this.xhr.abort();
          this.generating = false;
        }
        return;
      }
      const { callback } = this.config;
      this.config.reject();
      callback(null);
    },
  },
  async created() {
    // store chatgpt配置
    const config = localStorage.getItem('chatgpt/config');
    store.dispatch('chatgpt/setCurrConfig', JSON.parse(config || '{}'));
  },
});
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.modal__inner-1.modal__inner-1--chatgpt {
  max-width: 560px;

  .result_pre {
    font-size: 0.9em;
    font-variant-ligatures: no-common-ligatures;
    line-height: 1.25;
    white-space: pre-wrap;
    word-break: break-word;
    word-wrap: break-word;
    height: 300px;
    border: 1px solid rgb(126, 126, 126);
    border-radius: $border-radius-base;
    padding: 10px;
    overflow-y: scroll; /* 开启垂直滚动条 */
  }

  .result_pre::-webkit-scrollbar {
    display: none; /* 隐藏滚动条 */
  }

  .result_pre.scroll-bottom {
    scroll-behavior: smooth;
  }

  .config-warning {
    color: #f00;
  }

  .text-input {
    min-height: 60px;
  }
}
</style>
