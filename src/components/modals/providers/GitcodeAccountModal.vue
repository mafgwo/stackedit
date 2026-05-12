<template>
  <modal-inner aria-label="链接GitCode账号">
    <div class="modal__content">
      <div class="modal__image">
        <icon-provider provider-id="gitcode"></icon-provider>
      </div>
      <p>将您的<b>GitCode</b>账号链接到<b>StackEdit中文版</b>。</p>
      <p>确认后将跳转到 GitCode 授权页面，使用 OAuth2 完成账号绑定。</p>
    </div>
    <div class="modal__button-bar">
      <button class="button" @click="config.reject()">取消</button>
      <button class="button button--resolve" @click="config.resolve()">确认</button>
    </div>
  </modal-inner>
</template>

<script>
import modalTemplate from '../common/modalTemplate';

export default modalTemplate({});
</script>
