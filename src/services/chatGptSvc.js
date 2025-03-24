import store from '../store';

export default {
  chat({apiKey, content}, callback) {
    const xhr = new XMLHttpRequest();
    const url = `https://api.moonshot.cn/v1/chat/completions`;
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
      model: 'moonshot-v1-auto',
      messages: [{ role: 'user', content }],
      temperature: 1,
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
      store.dispatch('notification/error', 'Kimi接口请求异常！');
      callback({ error: 'Kimi接口请求异常！' });
    };
    return xhr;
  },
};