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
    loadingModels: false,
    modelFetchError: '',
  }),
  computed: {
    providers: () => aiModelProviders,
    selectedProvider() {
      return chatGptSvc.getProvider(this.providerId);
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
      this.rememberProviderConfig();
      this.config.resolve(normalizeAiModelConfig({
        providerId: this.providerId,
        baseUrl: this.baseUrl,
        apiKey: this.apiKey,
        apiKeys: this.apiKeys,
        model: this.resolvedModel,
        providerModels: this.providerModels,
        availableModels: this.modelOptions,
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

  .config-warning {
    color: #f00;
  }
}
</style>
