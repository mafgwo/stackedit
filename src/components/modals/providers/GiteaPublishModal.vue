<template>
  <modal-inner aria-label="发布到Gitea">
    <div class="modal__content">
      <div class="modal__image">
        <icon-provider provider-id="gitea"></icon-provider>
      </div>
      <p>向您的<b> Gitea </b>项目发布<b> {{CurrentFileName}} </b>。</p>
      <form-entry label="Project URL" error="projectUrl">
        <template v-slot:field><input class="textfield" type="text" v-model.trim="projectUrl" @keydown.enter="resolve()"></template>
        <div class="form-entry__info">
          <b>例如:</b> {{config.token.serverUrl}}/path/to/project
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
      <form-entry label="Template">
        <template v-slot:field>
          <select class="textfield" v-model="selectedTemplate" @keydown.enter="resolve()">
            <option v-for="(template, id) in allTemplatesById" :key="id" :value="id">
              {{ template.name }}
            </option>
          </select>
        </template>
        <div class="form-entry__actions">
          <a href="javascript:void(0)" @click="configureTemplates">配置模板</a>
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
import giteaProvider from '../../../services/providers/giteaProvider';
import modalTemplate from '../common/modalTemplate';
import utils from '../../../services/utils';

export default modalTemplate({
  data: () => ({
    branch: '',
    path: '',
  }),
  computedLocalSettings: {
    projectUrl: 'giteaProjectUrl',
    selectedTemplate: 'giteaPublishTemplate',
  },
  created() {
    this.path = `${this.currentFileName}.md`;
  },
  methods: {
    resolve() {
      const projectPath = utils.parseGiteaProjectPath(this.projectUrl);
      if (!projectPath) {
        this.setError('projectUrl');
      }
      if (!this.path) {
        this.setError('path');
      }
      if (projectPath && this.path) {
        // Return new location
        const location = giteaProvider.makeLocation(
          this.config.token,
          projectPath,
          this.branch || 'master',
          this.path,
        );
        location.templateId = this.selectedTemplate;
        this.config.resolve(location);
      }
    },
  },
});
</script>
