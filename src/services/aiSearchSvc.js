import {
  getAiSearchProvider,
  normalizeAiSearchConfig,
} from './aiSearchConfig.js';

const wordSegmenter = typeof Intl !== 'undefined' && Intl.Segmenter
  ? new Intl.Segmenter('zh-CN', { granularity: 'word' })
  : null;

const stopWords = new Set([
  '请',
  '帮',
  '我',
  '一下',
  '生成',
  '写',
  '文章',
  '内容',
  '详细',
  '描述',
  '关于',
  '以及',
  '和',
  '或',
  '的',
  '了',
  '在',
  '是',
  '要',
  '需要',
]);

const segmentSearchQuery = (text) => {
  const source = (text || '').trim();
  if (!source) {
    return '';
  }
  if (!wordSegmenter) {
    return source.replace(/\s+/g, ' ').slice(0, 120);
  }
  const words = [...wordSegmenter.segment(source)]
    .filter(item => item.isWordLike)
    .map(item => item.segment.trim())
    .filter(word => word && !stopWords.has(word));
  const query = [...new Set(words)].join(' ');
  return (query || source).slice(0, 120);
};

const buildSearchQueries = (text) => {
  const source = (text || '').trim();
  const segmented = segmentSearchQuery(source);
  return [...new Set([
    source.replace(/\s+/g, ' ').slice(0, 120),
    segmented,
  ].filter(Boolean))].slice(0, 2);
};

const truncateContent = (content = '') => content
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 1200);

const normalizeResults = results => (results || [])
  .map((result, index) => ({
    title: result.title || result.name || `搜索结果 ${index + 1}`,
    url: result.url || result.link || '',
    content: truncateContent(result.content || result.snippet || result.summary || result.raw_content || ''),
  }))
  .filter(result => result.title || result.url || result.content);

const dedupeResults = results => [...results.reduce((map, result) => {
  const key = result.url || `${result.title}:${result.content.slice(0, 80)}`;
  if (!map.has(key)) {
    map.set(key, result);
  }
  return map;
}, new Map()).values()];

const parseSearchResponse = (data) => {
  if (Array.isArray(data)) {
    return normalizeResults(data);
  }
  return normalizeResults(data.results || data.data || data.items);
};

const searchTavily = (config, query) => fetch(config.baseUrl, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query,
    max_results: config.maxResults,
    search_depth: config.searchDepth,
    include_answer: false,
    include_raw_content: config.includeRawContent,
  }),
}).then(async (response) => {
  if (!response.ok) {
    throw new Error('联网搜索失败。');
  }
  return parseSearchResponse(await response.json());
});

const searchCustom = (config, query) => fetch(config.baseUrl, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query,
    maxResults: config.maxResults,
  }),
}).then(async (response) => {
  if (!response.ok) {
    throw new Error('联网搜索失败。');
  }
  return parseSearchResponse(await response.json());
});

const formatSearchContext = results => results
  .map((result, index) => [
    `[${index + 1}] ${result.title}`,
    result.url ? `URL: ${result.url}` : '',
    result.content ? `摘要: ${result.content}` : '',
  ].filter(Boolean).join('\n'))
  .join('\n\n');

export default {
  providers: () => [],
  getProvider: getAiSearchProvider,
  segmentSearchQuery,
  search(config, content) {
    const normalizedConfig = normalizeAiSearchConfig(config);
    const queries = buildSearchQueries(content);
    const [query = ''] = queries;
    if (!normalizedConfig.enabled) {
      return Promise.resolve({ query, results: [], context: '' });
    }
    if (!normalizedConfig.baseUrl || !normalizedConfig.apiKey) {
      throw new Error('启用联网功能必须配置搜索 API。');
    }
    const search = normalizedConfig.providerId === 'custom' ? searchCustom : searchTavily;
    return Promise.all(queries.map(item => search(normalizedConfig, item)))
      .then(resultGroups => dedupeResults([].concat(...resultGroups)).slice(0, normalizedConfig.maxResults))
      .then(results => ({
        query: queries.join(' / '),
        results,
        context: formatSearchContext(results),
      }));
  },
};
