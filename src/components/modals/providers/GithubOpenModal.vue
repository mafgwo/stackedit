<template>
  <modal-inner aria-label="与 GitHub 同步">
    <div class="modal__content">
      <div class="modal__image">
        <icon-provider provider-id="github"></icon-provider>
      </div>
      <p>从您的<b>GitHub</b> repository and keep it synced.</p>
      <form-entry label="仓库URL" error="repoUrl">
        <template v-slot:field><input class="textfield" type="text" v-model.trim="repoUrl" @keydown.enter="resolve()"></template>
        <div class="form-entry__info">
          <b>例如:</b> https://github.com/owner/my-repo
        </div>
      </form-entry>
      <form-entry label="File path" error="path">
        <template v-slot:field><input class="textfield" type="text" v-model.trim="path" @keydown.enter="resolve()"></template>
        <div class="form-entry__info">
          <b>例如:</b> path/to/README.md
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
import githubProvider from '../../../services/providers/githubProvider';
import modalTemplate from '../common/modalTemplate';
import utils from '../../../services/utils';

export default modalTemplate({
  data: () => ({
    branch: '',
    path: '',
  }),
  computedLocalSettings: {
    repoUrl: 'githubRepoUrl',
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
        // Return new location
        const location = githubProvider.makeLocation(
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
