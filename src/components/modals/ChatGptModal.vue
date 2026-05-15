<template>
  <modal-inner class="modal__inner-1--chatgpt" aria-label="AI内容生成">
    <div class="modal__content">
      <div class="modal__image">
        <icon-chat-gpt></icon-chat-gpt>
      </div>
      <p><b>AI内容生成</b><br>使用{{ selectedProvider.name }} - {{ chatGptConfig.model }}生成<span v-if="chatGptConfig.search.enabled">，联网搜索已启用</span></p>
      <form-entry label="生成内容要求详细描述" error="content">
        <template v-slot:field><textarea class="text-input" type="text" placeholder="输入内容(支持换行)" v-model.trim="content" :disabled="generating || !isConfigured"></textarea></template>
        <div class="form-entry__info">
          <span v-if="!isConfigured" class="config-warning">
            未配置模型服务，请点击 <a href="javascript:void(0)" @click="openConfig">配置</a> 模型服务。
          </span>
          <span v-else>
            <a href="javascript:void(0)" @click="openConfig">修改模型配置</a>
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
import aiSearchSvc from '../../services/aiSearchSvc';
import { isAiSearchConfigured } from '../../services/aiSearchConfig';
import { normalizeAiModelConfig } from '../../services/aiModelConfig';
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
    selectedProvider() {
      return chatGptSvc.getProvider(this.chatGptConfig.providerId);
    },
    isConfigured() {
      return !!(this.chatGptConfig.apiKey && this.chatGptConfig.baseUrl && this.chatGptConfig.model)
        && isAiSearchConfigured(this.chatGptConfig.search);
    },
  },
  methods: {
    resolve(evt) {
      evt.preventDefault();
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
        if (container) {
          container.scrollTo(0, container.scrollHeight); // 滚动到最底部
        }
      } else if (error) {
        this.generating = false;
      }
    },
    buildMessages(searchResult) {
      if (!searchResult || !searchResult.context) {
        return [{ role: 'user', content: this.content }];
      }
      return [{
        role: 'system',
        content: '你是写作助手。用户启用了联网搜索。请优先基于搜索结果生成内容；如果搜索结果不足，请明确说明。涉及事实、数据、新闻、政策、版本、价格时，请在正文或末尾标注来源序号。',
      }, {
        role: 'user',
        content: [
          `用户需求：${this.content}`,
          '',
          `搜索查询：${searchResult.query}`,
          '',
          '搜索结果：',
          searchResult.context,
        ].join('\n'),
      }];
    },
    appendSources(searchResult) {
      if (!searchResult || !searchResult.results.length) {
        return;
      }
      const sources = searchResult.results
        .filter(result => result.url)
        .map((result, index) => `[${index + 1}] ${result.title} ${result.url}`)
        .join('\n');
      if (sources) {
        this.result = `${this.result}\n\n参考来源：\n${sources}`;
      }
    },
    async generate() {
      this.generating = true;
      this.result = '';
      try {
        let searchResult = null;
        if (this.chatGptConfig.search.enabled) {
          this.result = '(联网搜索中...)';
          searchResult = await aiSearchSvc.search(this.chatGptConfig.search, this.content);
          this.result = '';
          if (!searchResult.results.length) {
            this.result = '(未搜索到可用结果，继续生成中...)\n';
          }
        }
        this.xhr = chatGptSvc.chat({
          ...this.chatGptConfig,
          content: this.content,
          messages: this.buildMessages(searchResult),
        }, (message) => {
          this.process(message);
          if (message.done) {
            this.appendSources(searchResult);
          }
        });
      } catch (err) {
        this.generating = false;
        this.result = '';
        store.dispatch('notification/error', err.message || err);
      }
    },
    async openConfig() {
      try {
        const config = await store.dispatch('modal/open', { type: 'chatGptConfig', ...this.chatGptConfig });
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
    // Store AI model config in localStorage only.
    const config = localStorage.getItem('chatgpt/config');
    store.dispatch('chatgpt/setCurrConfig', normalizeAiModelConfig(JSON.parse(config || '{}')));
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
