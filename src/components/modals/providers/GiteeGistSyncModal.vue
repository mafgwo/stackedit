<template>
  <modal-inner aria-label="与 GiteeGist 同步">
    <div class="modal__content">
      <div class="modal__image">
        <icon-provider provider-id="giteegist"></icon-provider>
      </div>
      <p>将<b> {{currentFileName}} </b>保存到<b>GiteeGist</b>并保持同步。</p>
      <form-entry label="文件名" error="filename">
        <template v-slot:field><input class="textfield" type="text" v-model.trim="filename" @keydown.enter="resolve()"></template>
      </form-entry>
      <div class="form-entry">
        <div class="form-entry__checkbox">
          <label>
            <input type="checkbox" v-model="isPublic"> 公开的
          </label>
        </div>
      </div>
      <form-entry label="存在Gist ID" info="可选的">
        <template v-slot:field><input class="textfield" type="text" v-model.trim="gistId" @keydown.enter="resolve()"></template>
        <div class="form-entry__info">
          如果文件存在于GiteeGist中，则将被覆盖。
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
import giteeGistProvider from '../../../services/providers/giteeGistProvider';
import modalTemplate from '../common/modalTemplate';

export default modalTemplate({
  data: () => ({
    filename: '',
    gistId: '',
  }),
  computedLocalSettings: {
    isPublic: 'gistIsPublic',
  },
  created() {
    this.filename = `${this.currentFileName}.md`;
  },
  methods: {
    resolve() {
      if (!this.filename) {
        this.setError('filename');
      } else {
        // Return new location
        const location = giteeGistProvider.makeLocation(
          this.config.token,
          this.filename,
          this.isPublic,
          this.gistId,
        );
        this.config.resolve(location);
      }
    },
  },
});
</script>
