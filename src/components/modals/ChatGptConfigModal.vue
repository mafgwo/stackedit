<template>
  <modal-inner aria-label="ChatGPT配置">
    <div class="modal__content">
      <div class="modal__image">
        <icon-chat-gpt></icon-chat-gpt>
      </div>
      <p> <b>ChatGPT</b> 配置.</p>
      <form-entry label="代理地址" error="proxyHost">
        <input slot="field" class="textfield" type="text" v-model.trim="proxyHost" @keydown.enter="resolve()">
        <div class="form-entry__info">
          <b>非必填，默认是官方接口地址(https://api.openai.com)，例如:</b> https://openai.geekr.cool
        </div>
      </form-entry>
      <form-entry label="apiKey" error="apiKey">
        <input slot="field" class="textfield" type="text" v-model.trim="apiKey" @keydown.enter="resolve()">
        <div class="form-entry__info">
          <b>apiKey</b> 请到<a href="https://platform.openai.com/account/api-keys" target="_blank">https://platform.openai.com/account/api-keys</a> 获取<br>
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
  data: () => ({
    apiKey: this.config.apiKey,
    proxyHost: this.config.proxyHost,
  }),
  computedLocalSettings: {
    apiKey: 'chatgptApiKey',
    proxyHost: 'chatgptProxyHost',
  },
  methods: {
    resolve() {
      if (!this.apiKey) {
        this.setError('apiKey');
      }
      if (this.proxyHost && this.proxyHost.endsWith('/')) {
        this.proxyHost = this.proxyHost.substring(0, this.proxyHost.length - 1);
      }
      this.config.resolve({ apiKey: this.apiKey, proxyHost: this.proxyHost });
    },
  },
});
</script>
