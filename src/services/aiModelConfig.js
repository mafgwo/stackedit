import { normalizeAiSearchConfig } from './aiSearchConfig.js';

export const aiModelProviders = [{
  id: 'kimi',
  name: 'Kimi（月之暗面）',
  baseUrl: 'https://api.moonshot.cn/v1',
  apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
  defaultModel: 'moonshot-v1-auto',
  fallbackModels: [
    'moonshot-v1-auto',
    'moonshot-v1-8k',
    'moonshot-v1-32k',
    'moonshot-v1-128k',
  ],
}, {
  id: 'deepseek',
  name: 'DeepSeek',
  baseUrl: 'https://api.deepseek.com/v1',
  apiKeyUrl: 'https://platform.deepseek.com/api_keys',
  defaultModel: 'deepseek-chat',
  fallbackModels: [
    'deepseek-chat',
    'deepseek-reasoner',
  ],
}, {
  id: 'qwen',
  name: '通义千问（阿里云百炼）',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKeyUrl: 'https://bailian.console.aliyun.com/?tab=model#/api-key',
  defaultModel: 'qwen-plus',
  fallbackModels: [
    'qwen-plus',
    'qwen-turbo',
    'qwen-max',
    'qwen-long',
  ],
}, {
  id: 'zhipu',
  name: '智谱 GLM',
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  apiKeyUrl: 'https://bigmodel.cn/usercenter/proj-mgmt/apikeys',
  defaultModel: 'glm-4',
  fallbackModels: [
    'glm-4',
    'glm-4-plus',
    'glm-4-air',
    'glm-4-flash',
  ],
}, {
  id: 'qianfan',
  name: '百度千帆',
  baseUrl: 'https://qianfan.baidubce.com/v2',
  apiKeyUrl: 'https://console.bce.baidu.com/qianfan/ais/console/apiKey',
  defaultModel: 'ernie-4.5-turbo-128k',
  fallbackModels: [
    'ernie-4.5-turbo-128k',
    'ernie-4.5-turbo-32k',
    'ernie-4.5-turbo-vl-32k',
    'ernie-x1-turbo-32k',
  ],
}, {
  id: 'custom',
  name: '自定义 OpenAI 兼容接口',
  baseUrl: '',
  apiKeyUrl: '',
  defaultModel: '',
  fallbackModels: [],
}];

const providerById = aiModelProviders.reduce((result, provider) => ({
  ...result,
  [provider.id]: provider,
}), {});

export const normalizeBaseUrl = baseUrl => (baseUrl || '').replace(/\/+$/, '');

export const getAiModelProvider = providerId => providerById[providerId] || providerById.kimi;

export const normalizeAvailableModels = models => [...new Set((models || [])
  .map(model => (typeof model === 'string' ? model : model && model.id))
  .filter(Boolean))]
  .sort();

export const normalizeAiModelConfig = (config = {}) => {
  const providerId = config.providerId || 'kimi';
  const provider = getAiModelProvider(providerId);
  const baseUrl = provider.id === 'custom'
    ? normalizeBaseUrl(config.baseUrl)
    : provider.baseUrl;
  const apiKeys = {
    ...(config.apiKeys || {}),
  };
  if (config.apiKey && (!config.apiKeys || config.apiKeys[provider.id] === config.apiKey)) {
    apiKeys[provider.id] = config.apiKey;
  }
  const providerModels = {
    ...(config.providerModels || {}),
  };
  const availableModels = normalizeAvailableModels(config.availableModels);
  const fallbackModels = availableModels.length
    ? availableModels
    : normalizeAvailableModels(provider.fallbackModels);
  const configModel = !config.providerModels || config.providerModels[provider.id] === config.model
    ? config.model
    : '';
  const model = configModel || providerModels[provider.id] || provider.defaultModel || fallbackModels[0] || '';
  if (model) {
    providerModels[provider.id] = model;
  }
  const normalizedModels = normalizeAvailableModels(model
    ? [model, ...fallbackModels]
    : fallbackModels);
  return {
    providerId: provider.id,
    baseUrl,
    apiKey: apiKeys[provider.id] || '',
    apiKeys,
    model,
    providerModels,
    availableModels: normalizedModels,
    temperature: Number(config.temperature) >= 0 && Number(config.temperature) <= 2
      ? Number(config.temperature)
      : 0.7,
    maxTokens: Number(config.maxTokens) > 0 ? Number(config.maxTokens) : 0,
    systemPrompt: config.systemPrompt || '',
    search: normalizeAiSearchConfig(config.search),
  };
};
