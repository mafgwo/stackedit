<template>
  <modal-inner aria-label="链接Zendesk账号">
    <div class="modal__content">
      <div class="modal__image">
        <icon-provider provider-id="zendesk"></icon-provider>
      </div>
      <p>将您的<b>Zendesk</b>链接到<b>StackEdit中文版</b>。</p>
      <form-entry label="Site URL" error="siteUrl">
        <template v-slot:field><input class="textfield" type="text" v-model.trim="siteUrl" @keydown.enter="resolve()"></template>
        <div class="form-entry__info">
          <b>例如:</b> https://example.zendesk.com/
        </div>
      </form-entry>
      <form-entry label="Client Unique Identifier" error="clientId">
        <template v-slot:field><input class="textfield" type="text" v-model.trim="clientId" @keydown.enter="resolve()"></template>
        <div class="form-entry__info">
          您必须使用重定向url <b>{{redirectUrl}}</b>配置OAuth客户端
        </div>
        <div class="form-entry__actions">
          <a href="https://support.zendesk.com/hc/en-us/articles/203663836" target="_blank">更多信息</a>
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
import modalTemplate from '../common/modalTemplate';
import constants from '../../../data/constants';

export default modalTemplate({
  data: () => ({
    redirectUrl: constants.oauth2RedirectUri,
  }),
  computedLocalSettings: {
    siteUrl: 'zendeskSiteUrl',
    clientId: 'zendeskClientId',
  },
  methods: {
    resolve() {
      if (!this.siteUrl) {
        this.setError('siteUrl');
      }
      if (!this.clientId) {
        this.setError('clientId');
      }
      if (this.siteUrl && this.clientId) {
        const parsedUrl = this.siteUrl.match(/^https:\/\/([^.]+)\.zendesk\.com/);
        if (!parsedUrl) {
          this.setError('siteUrl');
        } else {
          this.config.resolve({
            subdomain: parsedUrl[1],
            clientId: this.clientId,
          });
        }
      }
    },
  },
});
</script>
