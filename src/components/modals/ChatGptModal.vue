<template>
  <modal-inner class="modal__inner-1--chatgpt" aria-label="AI内容生成">
    <div class="modal__content">
      <div class="modal__image">
        <icon-chat-gpt></icon-chat-gpt>
      </div>
      <p><b>AI辅助写作</b><br>使用{{ selectedProvider.name }} - {{ chatGptConfig.model }}<span v-if="chatGptConfig.search.enabled">，联网搜索已启用</span></p>
      <div v-if="hasSelection" class="ai-context">
        <div class="ai-context__label">已选中文本</div>
        <pre>{{ editorContext.selection }}</pre>
      </div>
      <form-entry label="写作任务" error="task">
        <select slot="field" class="textfield" v-model="taskId" :disabled="generating">
          <option v-for="task in taskOptions" :key="task.id" :value="task.id">{{ task.name }}</option>
        </select>
        <div class="form-entry__info">{{ selectedTask.description }}</div>
      </form-entry>
      <form-entry label="补充要求" error="content">
        <template v-slot:field>
          <textarea
            class="text-input"
            type="text"
            placeholder="例如：更正式、保留技术细节、控制在 500 字内、输出为 Markdown 表格"
            v-model.trim="content"
            :disabled="generating || !isConfigured"
          ></textarea>
        </template>
        <div class="form-entry__info">
          <span v-if="!isConfigured" class="config-warning">
            未配置模型服务，请点击 <a href="javascript:void(0)" @click="openConfig">配置</a> 模型服务。
          </span>
          <span v-else>
            <a href="javascript:void(0)" @click="openConfig">修改模型配置</a>
          </span>
        </div>
      </form-entry>
      <form-entry label="插入方式" error="insertMode">
        <select slot="field" class="textfield" v-model="insertMode" :disabled="generating">
          <option v-for="mode in insertModeOptions" :key="mode.id" :value="mode.id">{{ mode.name }}</option>
        </select>
      </form-entry>
      <div class="modal__result">
        <div class="ai-result-tabs" v-if="result && hasSelection">
          <button class="button ai-result-tabs__button" :class="{'ai-result-tabs__button--active': resultView === 'result'}" @click="resultView = 'result'">结果</button>
          <button class="button ai-result-tabs__button" :class="{'ai-result-tabs__button--active': resultView === 'compare'}" @click="resultView = 'compare'">对比</button>
        </div>
        <pre class="result_pre" v-if="generating && !result">(等待生成中...)</pre>
        <div class="ai-compare" v-else-if="result && resultView === 'compare' && hasSelection">
          <div>
            <div class="ai-compare__title">原文</div>
            <pre class="result_pre result_pre--compare" v-text="editorContext.selection"></pre>
          </div>
          <div>
            <div class="ai-compare__title">结果</div>
            <div class="form-entry__field ai-result-editor ai-result-editor--compare" :class="{'ai-result-editor--generating': generating}">
              <code-editor
                lang="markdown"
                :value="result"
                :disabled="generating"
                @changed="setResult"
              ></code-editor>
            </div>
          </div>
        </div>
        <div class="form-entry__field ai-result-editor" :class="{'ai-result-editor--generating': generating}" v-else-if="result">
          <code-editor
            lang="markdown"
            :value="result"
            :disabled="generating"
            @changed="setResult"
          ></code-editor>
        </div>
      </div>
    </div>
    <div class="modal__button-bar">
      <button class="button" @click="reject()">{{ generating ? '停止' : '关闭' }}</button>
      <button class="button button--resolve" @click="generate" v-if="!generating && canGenerate">{{ !!result ? '重新生成' : '开始生成' }}</button>
      <button class="button button--resolve" @click="resolve" v-if="!generating && !!result">{{ resolveText }}</button>
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
import CodeEditor from '../CodeEditor';
import store from '../../store';

const contextLimit = 3000;

const taskOptions = [{
  id: 'continue',
  name: '续写',
  description: '根据当前位置前后的内容继续写，适合从光标处扩展正文。',
  prompt: '请根据上下文自然续写，保持原文语气、结构和 Markdown 格式。',
}, {
  id: 'polish',
  name: '润色',
  description: '优化表达、语序和流畅度，尽量不改变原意。',
  prompt: '请润色选中文本，保持原意和事实不变，让表达更清晰、自然、有条理。',
  needsSelection: true,
}, {
  id: 'expand',
  name: '扩写',
  description: '在保留原意的基础上补充论述、例子和细节。',
  prompt: '请扩写选中文本，补充必要背景、论证和细节，保持 Markdown 结构。',
  needsSelection: true,
}, {
  id: 'shorten',
  name: '缩写',
  description: '压缩篇幅，保留关键信息。',
  prompt: '请压缩选中文本，删除冗余表达，保留核心观点、关键事实和 Markdown 结构。',
  needsSelection: true,
}, {
  id: 'translate',
  name: '翻译',
  description: '中英互译，或按补充要求指定目标语言。',
  prompt: '请翻译选中文本。未指定目标语言时，中文翻译为英文，其他语言翻译为中文。保留 Markdown 标记、链接和代码块。',
  needsSelection: true,
}, {
  id: 'proofread',
  name: '纠错',
  description: '修正错别字、病句、标点和 Markdown 小问题。',
  prompt: '请校对选中文本，修正错别字、语病、标点、术语不一致和轻微 Markdown 格式问题。',
  needsSelection: true,
}, {
  id: 'title',
  name: '生成标题',
  description: '根据选区或全文上下文生成标题候选。',
  prompt: '请生成 5 个简洁、有区分度的标题候选，每个标题单独一行。',
}, {
  id: 'summary',
  name: '生成摘要',
  description: '根据选区或上下文生成摘要和要点。',
  prompt: '请生成一段摘要，并列出 3 到 5 条关键要点。',
}, {
  id: 'blog',
  name: '博客文章',
  description: '生成结构完整的 Markdown 博客文章。',
  prompt: '请生成一篇结构完整的 Markdown 博客文章，包含标题、导语、分节标题、正文和结尾总结。',
}, {
  id: 'techDoc',
  name: '技术文档',
  description: '生成偏工程化的说明、教程或方案文档。',
  prompt: '请生成清晰、可执行的技术文档，优先使用标题、列表、代码块和注意事项组织内容。',
}, {
  id: 'weekly',
  name: '周报',
  description: '生成工作周报或项目进展总结。',
  prompt: '请生成 Markdown 周报，包含本周完成、问题风险、下周计划和需要协同的事项。',
}, {
  id: 'product',
  name: '产品说明',
  description: '生成产品介绍、功能说明或发布文案。',
  prompt: '请生成产品说明文档，突出用户场景、核心功能、使用流程和注意事项。',
}, {
  id: 'social',
  name: '公众号/社媒',
  description: '生成更适合传播的短内容。',
  prompt: '请生成适合公众号或社媒发布的内容，开头要抓住重点，段落短，表达自然。',
}, {
  id: 'custom',
  name: '自定义',
  description: '完全按补充要求生成内容。',
  prompt: '请严格按照用户的补充要求完成写作任务。',
}];

const defaultTaskId = hasSelection => (hasSelection ? 'polish' : 'continue');

const trimContext = (text = '', fromEnd = false) => {
  if (text.length <= contextLimit) {
    return text;
  }
  return fromEnd ? text.slice(-contextLimit) : text.slice(0, contextLimit);
};

export default modalTemplate({
  components: {
    CodeEditor,
  },
  data: () => ({
    generating: false,
    content: '',
    result: '',
    xhr: null,
    taskId: 'continue',
    insertMode: 'cursor',
    resultView: 'result',
    sourcesAppended: false,
  }),
  computed: {
    ...mapGetters('chatgpt', [
      'chatGptConfig',
    ]),
    taskOptions: () => taskOptions,
    editorContext() {
      return this.config.editorContext || {};
    },
    hasSelection() {
      return !!(this.editorContext.selection && this.editorContext.selection.trim());
    },
    selectedTask() {
      return taskOptions.find(task => task.id === this.taskId) || taskOptions[0];
    },
    canGenerate() {
      return this.isConfigured && (!!this.content || !!this.hasSelection || this.taskId !== 'custom');
    },
    insertModeOptions() {
      const options = [];
      if (this.hasSelection) {
        options.push({ id: 'replace', name: '替换选中文本' });
        options.push({ id: 'afterSelection', name: '插入到选中文本后' });
      }
      options.push({ id: 'cursor', name: '插入到光标处' });
      options.push({ id: 'append', name: '追加到文末' });
      return options;
    },
    resolveText() {
      if (this.insertMode === 'replace') {
        return '确认替换';
      }
      return '确认插入';
    },
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
      if (evt) {
        evt.preventDefault();
      }
      const { callback } = this.config;
      this.config.resolve();
      callback({
        content: this.getInsertContent(),
        insertMode: this.insertMode,
      });
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
    setResult(value) {
      if (!this.generating) {
        this.result = value;
      }
    },
    buildMessages(searchResult) {
      const before = trimContext(this.editorContext.before || '', true);
      const after = trimContext(this.editorContext.after || '');
      const selectedText = this.editorContext.selection || '';
      const userMessage = [
        `写作任务：${this.selectedTask.name}`,
        `任务说明：${this.selectedTask.prompt}`,
        this.content ? `补充要求：${this.content}` : '',
        selectedText ? `选中文本：\n${selectedText}` : '',
        before ? `前文上下文：\n${before}` : '',
        after ? `后文上下文：\n${after}` : '',
        searchResult && searchResult.context ? [
          `搜索查询：${searchResult.query}`,
          '搜索结果：',
          searchResult.context,
        ].join('\n') : '',
      ].filter(Boolean).join('\n\n');
      const system = [
        '你是 Markdown 写作助手。',
        this.chatGptConfig.systemPrompt,
        '请直接输出可插入编辑器的 Markdown 内容，不要解释你的工作过程。',
        '必须保留用户原有事实、专有名词、链接、表格、列表、代码块和数学公式；除非用户明确要求，不要编造事实。',
        '如果任务是改写选中文本，只输出改写后的文本，不要包裹引号或额外说明。',
        searchResult && searchResult.context
          ? '用户启用了联网搜索。请优先基于搜索结果生成内容；如果搜索结果不足，请明确说明。涉及事实、数据、新闻、政策、版本、价格时，请在正文或末尾标注来源序号。'
          : '',
      ].filter(Boolean).join('\n');
      return [{
        role: 'system',
        content: system,
      }, {
        role: 'user',
        content: userMessage,
      }];
    },
    appendSources(searchResult) {
      if (this.sourcesAppended || !searchResult || !searchResult.results.length) {
        return;
      }
      const sources = searchResult.results
        .filter(result => result.url)
        .map((result, index) => `[${index + 1}] ${result.title} ${result.url}`)
        .join('\n');
      if (sources) {
        this.result = `${this.result}\n\n参考来源：\n${sources}`;
        this.sourcesAppended = true;
      }
    },
    async generate() {
      if (!this.canGenerate) {
        this.setError('content');
        return;
      }
      this.generating = true;
      this.result = '';
      this.resultView = 'result';
      this.sourcesAppended = false;
      try {
        let searchResult = null;
        if (this.chatGptConfig.search.enabled) {
          this.result = '(联网搜索中...)';
          searchResult = await aiSearchSvc.search(this.chatGptConfig.search, this.getSearchContent());
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
    getSearchContent() {
      return [
        this.selectedTask.name,
        this.content,
        this.editorContext.selection,
      ].filter(Boolean).join('\n');
    },
    getInsertContent() {
      if (this.insertMode === 'afterSelection') {
        return `\n\n${this.result}`;
      }
      return this.result;
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
    this.taskId = defaultTaskId(this.hasSelection);
    this.insertMode = this.hasSelection ? 'replace' : 'cursor';
  },
});
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.modal__inner-1.modal__inner-1--chatgpt {
  max-width: 760px;

  .ai-context {
    margin: 1em 0;
  }

  .ai-context__label,
  .ai-compare__title {
    color: #808080;
    font-size: 0.8em;
    margin-bottom: 0.25em;
  }

  .ai-context pre {
    max-height: 120px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    border: 1px solid rgb(176, 176, 176);
    border-radius: $border-radius-base;
    padding: 8px;
    margin: 0;
  }

  .ai-result-tabs {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.35em;
  }

  .ai-result-tabs__button {
    font-size: 0.85em;
    padding: 4px 10px;
    text-transform: none;
  }

  .ai-result-tabs__button--active {
    background-color: rgba(52, 155, 232, 0.16);
  }

  .ai-compare {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 12px;
  }

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

  .result_pre--compare {
    height: 260px;
    margin: 0;
  }

  .ai-result-editor {
    height: 300px;
    overflow: auto;
    cursor: default;

    .code-editor {
      min-height: 100%;
      height: auto;
      padding: 10px;
      white-space: pre-wrap;
      word-break: break-word;
      cursor: default;

      &[disabled] {
        cursor: wait;
      }
    }
  }

  .ai-result-editor--generating {
    cursor: wait;

    .code-editor {
      cursor: wait;
    }
  }

  .ai-result-editor--compare {
    height: 260px;
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

@media (max-width: 720px) {
  .modal__inner-1.modal__inner-1--chatgpt {
    .ai-compare {
      grid-template-columns: 1fr;
    }
  }
}
</style>
