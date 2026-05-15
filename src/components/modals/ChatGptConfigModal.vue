<template>
  <modal-inner class="modal__inner-1--ai-config" aria-label="AI模型配置">
    <div class="modal__content">
      <div class="modal__image">
        <icon-chat-gpt></icon-chat-gpt>
      </div>
      <p><b>AI模型配置</b><br/><span>配置保存在浏览器缓存中</span></p>
      <form-entry label="模型提供商" error="provider">
        <select slot="field" class="textfield" v-model="providerId" @change="handleProviderChange">
          <option v-for="provider in providers" :key="provider.id" :value="provider.id">{{ provider.name }}</option>
        </select>
      </form-entry>
      <form-entry label="接口地址" error="baseUrl" v-if="providerId === 'custom'">
        <input slot="field" class="textfield" type="text" placeholder="https://example.com/v1" v-model.trim="baseUrl" @keydown.enter="resolve()">
        <div class="form-entry__info">
          请输入 OpenAI 兼容接口的基础地址，需包含版本路径，如 <b>/v1</b>。
        </div>
      </form-entry>
      <form-entry label="apiKey" error="apiKey">
        <input slot="field" class="textfield" type="text" v-model.trim="apiKey" @input="handleApiKeyInput" @keydown.enter="resolve()">
        <div class="form-entry__info">
          <b>apiKey</b> 请到 <a v-if="selectedProvider.apiKeyUrl" :href="selectedProvider.apiKeyUrl" target="_blank">{{ selectedProvider.name }} API Key 管理</a><span v-else>对应服务商后台</span> 中获取，此处配置仅保存在前端。
        </div>
      </form-entry>
      <form-entry label="模型" error="model">
        <select slot="field" class="textfield" v-model="model" @change="handleModelChange">
          <option v-for="modelName in modelOptions" :key="modelName" :value="modelName">{{ modelName }}</option>
          <option value="__custom__">手动填写模型名...</option>
        </select>
        <input v-if="isCustomModel" slot="field" class="textfield model-custom-input" type="text" v-model.trim="customModel" @input="handleCustomModelInput" @keydown.enter="resolve()">
        <div class="form-entry__info">
          <button class="button model-refresh-button" type="button" @click="refreshModels" :disabled="loadingModels || !canFetchModels">
            {{ loadingModels ? '获取中...' : '从接口获取可用模型' }}
          </button>
          <span v-if="modelFetchError" class="config-warning">{{ modelFetchError }}</span>
        </div>
      </form-entry>
      <form-entry label="联网搜索" error="search">
        <label slot="field" class="ai-config-checkbox">
          <input type="checkbox" v-model="searchEnabled">
          <span>启用联网搜索</span>
        </label>
        <div class="form-entry__info">
          启用后生成前会先分词并调用搜索 API，再把搜索结果作为参考资料传给模型。
        </div>
      </form-entry>
      <template v-if="searchEnabled">
        <form-entry label="搜索提供商" error="searchProvider">
          <select slot="field" class="textfield" v-model="searchProviderId" @change="handleSearchProviderChange">
            <option v-for="provider in searchProviders" :key="provider.id" :value="provider.id">{{ provider.name }}</option>
          </select>
        </form-entry>
        <form-entry label="搜索接口地址" error="searchBaseUrl" v-if="searchProviderId === 'custom'">
          <input slot="field" class="textfield" type="text" placeholder="https://example.com/search" v-model.trim="searchBaseUrl" @keydown.enter="resolve()">
          <div class="form-entry__info">
            自定义接口需支持 POST JSON：<b>{ query, maxResults }</b>，返回 <b>results</b>、<b>data</b>、<b>items</b> 或数组。
          </div>
        </form-entry>
        <form-entry label="搜索apiKey" error="searchApiKey">
          <input slot="field" class="textfield" type="text" v-model.trim="searchApiKey" @keydown.enter="resolve()">
          <div class="form-entry__info">
            <b>apiKey</b> 请到 <a v-if="selectedSearchProvider.apiKeyUrl" :href="selectedSearchProvider.apiKeyUrl" target="_blank">{{ selectedSearchProvider.name }} API Key 管理</a><span v-else>对应搜索服务后台</span> 中获取。
          </div>
        </form-entry>
        <form-entry label="搜索结果数" error="searchMaxResults">
          <input slot="field" class="textfield" type="number" min="1" max="10" v-model.number="searchMaxResults" @keydown.enter="resolve()">
        </form-entry>
      </template>
    </div>
    <div class="modal__button-bar">
      <button class="button" @click="config.reject()">取消</button>
      <button class="button button--resolve" @click="resolve()">确认</button>
    </div>
  </modal-inner>
</template>

<script>
import modalTemplate from './common/modalTemplate';
import chatGptSvc from '../../services/chatGptSvc';
import { aiModelProviders, normalizeAiModelConfig } from '../../services/aiModelConfig';
import {
  aiSearchProviders,
  getAiSearchProvider,
  normalizeAiSearchConfig,
} from '../../services/aiSearchConfig';

export default modalTemplate({
  data: () => ({
    providerId: 'kimi',
    previousProviderId: 'kimi',
    baseUrl: '',
    apiKey: '',
    apiKeys: {},
    model: '',
    providerModels: {},
    customModel: '',
    modelOptions: [],
    searchEnabled: false,
    searchProviderId: 'tavily',
    searchBaseUrl: '',
    searchApiKey: '',
    searchMaxResults: 5,
    loadingModels: false,
    modelFetchError: '',
  }),
  computed: {
    providers: () => aiModelProviders,
    searchProviders: () => aiSearchProviders,
    selectedProvider() {
      return chatGptSvc.getProvider(this.providerId);
    },
    selectedSearchProvider() {
      return getAiSearchProvider(this.searchProviderId);
    },
    canFetchModels() {
      return !!this.apiKey && !!this.baseUrl;
    },
    isCustomModel() {
      return this.model === '__custom__';
    },
    resolvedModel() {
      return this.isCustomModel ? this.customModel : this.model;
    },
  },
  methods: {
    handleProviderChange() {
      this.rememberProviderConfig(this.previousProviderId);
      const config = normalizeAiModelConfig({
        providerId: this.providerId,
        apiKeys: this.apiKeys,
        providerModels: this.providerModels,
      });
      this.baseUrl = config.baseUrl;
      this.apiKey = config.apiKey;
      this.apiKeys = config.apiKeys;
      this.model = config.model;
      this.providerModels = config.providerModels;
      this.customModel = '';
      this.modelOptions = config.availableModels;
      this.modelFetchError = '';
      this.previousProviderId = this.providerId;
    },
    handleApiKeyInput() {
      this.rememberProviderConfig();
    },
    rememberProviderConfig(providerId = this.providerId) {
      this.apiKeys = {
        ...this.apiKeys,
        [providerId]: this.apiKey,
      };
      if (this.resolvedModel) {
        this.providerModels = {
          ...this.providerModels,
          [providerId]: this.resolvedModel,
        };
      }
    },
    handleModelChange() {
      if (this.isCustomModel) {
        this.customModel = '';
      }
      this.rememberProviderConfig();
    },
    handleCustomModelInput() {
      this.$nextTick(() => this.rememberProviderConfig());
    },
    handleSearchProviderChange() {
      const config = normalizeAiSearchConfig({ providerId: this.searchProviderId });
      this.searchBaseUrl = config.baseUrl;
    },
    getSearchConfig() {
      return normalizeAiSearchConfig({
        enabled: this.searchEnabled,
        providerId: this.searchProviderId,
        baseUrl: this.searchBaseUrl,
        apiKey: this.searchApiKey,
        maxResults: this.searchMaxResults,
      });
    },
    async refreshModels() {
      this.loadingModels = true;
      this.modelFetchError = '';
      try {
        const models = await chatGptSvc.fetchModels({
          providerId: this.providerId,
          baseUrl: this.baseUrl,
          apiKey: this.apiKey,
          model: this.model,
        });
        this.modelOptions = models;
        if (!this.model || !models.includes(this.model)) {
          [this.model] = models;
          this.customModel = '';
        }
        this.rememberProviderConfig();
      } catch (err) {
        this.modelOptions = this.selectedProvider.fallbackModels || [];
        this.modelFetchError = '模型列表获取失败，可手动填写模型名。';
      } finally {
        this.loadingModels = false;
      }
    },
    resolve() {
      if (!this.apiKey) {
        this.setError('apiKey');
        return;
      }
      if (!this.baseUrl) {
        this.setError('baseUrl');
        return;
      }
      if (!this.resolvedModel) {
        this.setError('model');
        return;
      }
      const searchConfig = this.getSearchConfig();
      if (searchConfig.enabled && !searchConfig.baseUrl) {
        this.setError('searchBaseUrl');
        return;
      }
      if (searchConfig.enabled && !searchConfig.apiKey) {
        this.setError('searchApiKey');
        return;
      }
      this.rememberProviderConfig();
      this.config.resolve(normalizeAiModelConfig({
        providerId: this.providerId,
        baseUrl: this.baseUrl,
        apiKey: this.apiKey,
        apiKeys: this.apiKeys,
        model: this.resolvedModel,
        providerModels: this.providerModels,
        availableModels: this.modelOptions,
        search: searchConfig,
      }));
    },
  },
  async created() {
    const config = normalizeAiModelConfig(this.config);
    this.providerId = config.providerId;
    this.previousProviderId = config.providerId;
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.apiKeys = config.apiKeys;
    this.model = config.model;
    this.providerModels = config.providerModels;
    this.customModel = '';
    this.modelOptions = config.availableModels;
    this.searchEnabled = config.search.enabled;
    this.searchProviderId = config.search.providerId;
    this.searchBaseUrl = config.search.baseUrl;
    this.searchApiKey = config.search.apiKey;
    this.searchMaxResults = config.search.maxResults;
  },
});
</script>

<style lang="scss">
.modal__inner-1--ai-config {
  .model-refresh-button {
    margin-right: 8px;
  }

  .model-custom-input {
    margin-top: 8px;
  }

  .ai-config-checkbox {
    display: flex;
    align-items: center;

    input {
      margin-right: 8px;
    }
  }

  .config-warning {
    color: #f00;
  }
}
</style>
