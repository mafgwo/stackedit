export const aiSearchProviders = [{
  id: 'tavily',
  name: 'Tavily',
  baseUrl: 'https://api.tavily.com/search',
  apiKeyUrl: 'https://app.tavily.com',
}, {
  id: 'custom',
  name: '自定义搜索接口',
  baseUrl: '',
  apiKeyUrl: '',
}];

const providerById = aiSearchProviders.reduce((result, provider) => ({
  ...result,
  [provider.id]: provider,
}), {});

export const getAiSearchProvider = providerId => providerById[providerId] || providerById.tavily;

export const normalizeAiSearchConfig = (config = {}) => {
  const provider = getAiSearchProvider(config.providerId || 'tavily');
  const baseUrl = provider.id === 'custom'
    ? (config.baseUrl || '').replace(/\/+$/, '')
    : provider.baseUrl;
  const enabled = !!config.enabled;
  return {
    enabled,
    providerId: provider.id,
    baseUrl,
    apiKey: config.apiKey || '',
    maxResults: Number(config.maxResults) > 0 ? Math.min(Number(config.maxResults), 10) : 5,
  };
};

export const isAiSearchConfigured = (config = {}) => {
  const normalizedConfig = normalizeAiSearchConfig(config);
  return !normalizedConfig.enabled || !!(normalizedConfig.baseUrl && normalizedConfig.apiKey);
};
