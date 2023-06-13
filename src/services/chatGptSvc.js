import store from '../store';

export default {
  chat({
    content,
  }, callback) {
    const xhr = new XMLHttpRequest();
    const url = 'https://streaming.tenant-forefront-default.knative.chi.coreweave.com/free-chat';
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', 'Bearer null');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
      model: 'gpt-3.5-turbo',
      action: 'noauth',
      text: content,
      messagePersona: '607e41fe-95be-497e-8e97-010a59b2e2c0',
      messages: [],
      internetMode: 'auto',
      hidden: false,
      id: '',
      parentId: '',
      workspaceId: '',
    }));
    let lastRespLen = 0;
    xhr.onprogress = () => {
      const responseText = xhr.response.substr(lastRespLen);
      lastRespLen = xhr.response.length;
      responseText.split('\n\n')
        .filter(l => l.length > 0)
        .forEach((text) => {
          if (text === 'event: end') {
            callback({ done: true });
          } else if (text.startsWith('event: message')) {
            const item = text.split('\n')[1].substr(6);
            const data = JSON.parse(item);
            if (data.error) {
              store.dispatch('notification/error', `ChatGPT接口报错,错误信息:${data.error.message}`);
              callback({ error: 'ChatGPT接口请求异常！' });
            } else {
              callback({ content: data.delta });
            }
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
