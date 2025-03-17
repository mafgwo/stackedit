<template>
  <modal-inner aria-label="与 Gitee 同步">
    <div class="modal__content">
      <div class="modal__image">
        <icon-provider provider-id="gitee"></icon-provider>
      </div>
      <p>保存 <b>{{currentFileName}}</b> 并与您的 <b>Gitee</b> 仓库保持同步.</p>
      <form-entry label="仓库URL" error="repoUrl">
        <template v-slot:field><input class="textfield" type="text" v-model.trim="repoUrl" @keydown.enter="resolve()"></template>
        <div class="form-entry__info">
          <b>例如:</b> https://gitee.com/owner/my-repo
        </div>
      </form-entry>
      <form-entry label="File path" error="path">
        <template v-slot:field><input class="textfield" type="text" v-model.trim="path" @keydown.enter="resolve()"></template>
        <div class="form-entry__info">
          <b>例如:</b> path/to/README.md<br>
          如果文件存在，将被覆盖。
        </div>
      </form-entry>
      <form-entry label="分支" info="可选的">
        <template v-slot:field><input class="textfield" type="text" v-model.trim="branch" @keydown.enter="resolve()"></template>
        <div class="form-entry__info">
          如果未提供，将使用<code> master </code>分支。
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
import giteeProvider from '../../../services/providers/giteeProvider';
import modalTemplate from '../common/modalTemplate';
import utils from '../../../services/utils';

export default modalTemplate({
  data: () => ({
    branch: '',
    path: '',
  }),
  computedLocalSettings: {
    repoUrl: 'giteeRepoUrl',
  },
  created() {
    this.path = `${this.currentFileName}.md`;
  },
  methods: {
    resolve() {
      const parsedRepo = utils.parseGithubRepoUrl(this.repoUrl);
      if (!parsedRepo) {
        this.setError('repoUrl');
      }
      if (!this.path) {
        this.setError('path');
      }
      if (parsedRepo && this.path) {
        const location = giteeProvider.makeLocation(
          this.config.token,
          parsedRepo.owner,
          parsedRepo.repo,
          this.branch || 'master',
          this.path,
        );
        this.config.resolve(location);
      }
    },
  },
});
</script>
