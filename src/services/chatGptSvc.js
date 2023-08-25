import store from '../store';

export default {
  chat({ content }, callback) {
    const xhr = new XMLHttpRequest();
    const url = 'https://api.openai-proxy.com/v1/chat/completions';
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${window.my_api_key}`);
    xhr.send(JSON.stringify({
      model: 'gpt-3.5-turbo',
      max_tokens: 3000,
      top_p: 0,
      temperature: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
      messages: [{ role: 'user', content }],
      stream: true,
    }));
    let lastRespLen = 0;
    xhr.onprogress = () => {
      const responseText = xhr.response.substr(lastRespLen);
      lastRespLen = xhr.response.length;
      responseText.split('\n\n')
        .filter(l => l.length > 0)
        .forEach((text) => {
          const item = text.substr(6);
          if (item === '[DONE]') {
            callback({ done: true });
          } else {
            const data = JSON.parse(item);
            callback({ content: data.choices[0].delta.content });
          }
        });
    };
    xhr.onerror = () => {
      store.dispatch('notification/error', 'ChatGPT接口请求异常！');
      callback({ error: 'ChatGPT接口请求异常！' });
    };
    return xhr;
  },
};
