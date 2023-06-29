import store from '../store';

export default {
  chat({ content }, callback) {
    const xhr = new XMLHttpRequest();
    const url = 'https://fd.52ai.pw/v1/chat/completions';
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer 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');
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
