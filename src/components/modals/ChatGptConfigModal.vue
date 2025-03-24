<template>
  <modal-inner aria-label="ChatGPT配置">
    <div class="modal__content">
      <div class="modal__image">
        <icon-chat-gpt></icon-chat-gpt>
      </div>
      <p> <b>Kimi</b> API Key 配置.</p>
      <form-entry label="apiKey" error="apiKey">
        <input slot="field" class="textfield" type="text" v-model.trim="apiKey" @keydown.enter="resolve()">
        <div class="form-entry__info">
          <b>apiKey</b> 请到 <a href="https://platform.moonshot.cn/console/api-keys" target="_blank">Kimi的API Key管理</a> 中获取，此处配置仅保存在前端！<br>
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

export default modalTemplate({
  computedLocalSettings: {
    apiKey: 'chatgptApiKey',
  },
  methods: {
    resolve() {
      if (!this.apiKey) {
        this.setError('apiKey');
      }
      this.config.resolve({ apiKey: this.apiKey });
    },
  },
});
</script>