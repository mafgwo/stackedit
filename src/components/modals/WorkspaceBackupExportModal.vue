<template>
  <modal-inner aria-label="导出文档空间备份">
    <div class="modal__content">
      <p>请选择文档空间备份内容。</p>
      <div class="form-entry__checkbox">
        <label>
          <input type="checkbox" v-model="includeImages">
          导出文档空间图片
        </label>
      </div>
      <p class="modal__info">
        勾选后会生成 ZIP 包。图片优先从本地缓存读取，本地没有时会尝试从当前远端文档空间下载。
      </p>
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
    includeImages: true,
  }),
  methods: {
    resolve() {
      this.config.resolve({
        includeImages: this.includeImages,
      });
    },
  },
});
</script>
