<template>
  <modal-inner aria-label="提交信息">
    <p>自定义 <b>{{ config.name }}</b> 提交信息。</p>
    <div class="modal__content">
      <div class="form-entry">
        <label class="form-entry__label">提交信息</label>
        <div class="form-entry__field">
          <input class="textfield" placeholder="提交信息非必填" type="text" v-model.trim="commitMessage" @keydown.enter="resolve()">
        </div>
      </div>
    </div>
    <div class="modal__button-bar">
      <button class="button" @click="config.reject()">取消</button>
      <button class="button button--resolve" @click="resolve()">确认</button>
    </div>
  </modal-inner>
</template>

<script>
import { mapGetters } from 'vuex';
import ModalInner from './common/ModalInner';

export default {
  components: {
    ModalInner,
  },
  data: () => ({
    commitMessage: '',
  }),
  computed: {
    ...mapGetters('modal', [
      'config',
    ]),
  },
  methods: {
    resolve() {
      this.config.resolve({
        commitMessage: this.commitMessage,
      });
    },
  },
};
</script>
