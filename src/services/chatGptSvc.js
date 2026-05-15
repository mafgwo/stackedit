import store from '../store';
import {
  aiModelProviders,
  getAiModelProvider,
  normalizeAvailableModels,
  normalizeAiModelConfig,
  normalizeBaseUrl,
} from './aiModelConfig';

const parseErrorMessage = (xhr, providerName) => {
  const fallbackMessage = `${providerName}接口请求异常！`;
  try {
    const data = JSON.parse(xhr.responseText);
    return (data.error && (data.error.message || data.error.code)) || data.message || fallbackMessage;
  } catch (e) {
    return fallbackMessage;
  }
};

const parseStreamChunk = (text, callback) => text.split('\n\n')
  .reduce((buffer, chunk, index, chunks) => {
    if (index === chunks.length - 1 && !text.endsWith('\n\n')) {
      return chunk;
    }
    if (chunk) {
      const lines = chunk
        .split('\n')
        .filter(line => line.startsWith('data:'));
      lines.forEach((line) => {
        const item = line.substr(5).trim();
        if (item === '[DONE]') {
          callback({ done: true });
          return;
        }
        try {
          const data = JSON.parse(item);
          const choice = data.choices && data.choices[0];
          const content = choice && choice.delta && choice.delta.content;
          if (content) {
            callback({ content });
          }
        } catch (e) {
          // Ignore malformed events and keep parsing later stream events.
        }
      });
    }
    return buffer;
  }, '');

export default {
  providers: aiModelProviders,
  getProvider: getAiModelProvider,
  normalizeConfig: normalizeAiModelConfig,
  fetchModels(config) {
    const normalizedConfig = normalizeAiModelConfig(config);
    const provider = getAiModelProvider(normalizedConfig.providerId);
    const url = `${normalizeBaseUrl(normalizedConfig.baseUrl)}/models`;

    return fetch(url, {
      headers: {
        Authorization: `Bearer ${normalizedConfig.apiKey}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`${provider.name}模型列表获取失败。`);
        }
        const data = await response.json();
        return normalizeAvailableModels(data.data);
      })
      .then(models => (models.length ? models : provider.fallbackModels));
  },
  chat(config, callback) {
    const normalizedConfig = normalizeAiModelConfig(config);
    const provider = getAiModelProvider(normalizedConfig.providerId);
    const xhr = new XMLHttpRequest();
    const url = `${normalizeBaseUrl(normalizedConfig.baseUrl)}/chat/completions`;
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${normalizedConfig.apiKey}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
      model: normalizedConfig.model,
      messages: config.messages || [{ role: 'user', content: config.content }],
      temperature: 1,
      stream: true,
    }));
    let lastRespLen = 0;
    let chunkBuffer = '';
    xhr.onprogress = () => {
      const responseText = xhr.response.substr(lastRespLen);
      lastRespLen = xhr.response.length;
      chunkBuffer = parseStreamChunk(chunkBuffer + responseText, callback);
    };
    xhr.onload = () => {
      if (xhr.status >= 400) {
        const error = parseErrorMessage(xhr, provider.name);
        store.dispatch('notification/error', error);
        callback({ error });
      }
    };
    xhr.onerror = () => {
      const error = `${provider.name}接口请求异常！`;
      store.dispatch('notification/error', error);
      callback({ error });
    };
    return xhr;
  },
};
