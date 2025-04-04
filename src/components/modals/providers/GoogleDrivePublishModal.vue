<template>
  <modal-inner aria-label="发布到Google Drive">
    <div class="modal__content">
      <div class="modal__image">
        <icon-provider provider-id="googleDrive"></icon-provider>
      </div>
      <p>发布 <b>{{currentFileName}}</b> 到您的 <b>Google Drive</b> 账号.</p>
      <form-entry label="Folder ID" info="可选的">
        <template v-slot:field><input class="textfield" type="text" v-model.trim="folderId" @keydown.enter="resolve()"></template>
        <div class="form-entry__info">
          If not supplied, the file will be created in your Drive root folder.
        </div>
        <div class="form-entry__actions">
          <a href="javascript:void(0)" @click="openFolder">Choose folder</a>
        </div>
      </form-entry>
      <form-entry label="Existing file ID" info="可选的">
        <template v-slot:field><input class="textfield" type="text" v-model.trim="fileId" @keydown.enter="resolve()"></template>
        <div class="form-entry__info">
          This will overwrite the file on the server.
        </div>
      </form-entry>
      <div class="form-entry">
        <div class="form-entry__radio">
          <label>
            <input type="radio" v-model="format" value="markdown"> Export Markdown
          </label>
        </div>
        <div class="form-entry__radio">
          <label>
            <input type="radio" v-model="format" value="html"> Export HTML
          </label>
        </div>
      </div>
      <form-entry label="Template" v-if="format === 'html'">
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
      <div class="modal__info">
        <b>ProTip:</b> You can provide a value for <code>title</code> in the <a href="javascript:void(0)" @click="openFileProperties">file properties</a>.
      </div>
    </div>
    <div class="modal__button-bar">
      <button class="button" @click="config.reject()">取消</button>
      <button class="button button--resolve" @click="resolve()">确认</button>
    </div>
  </modal-inner>
</template>

<script>
import googleHelper from '../../../services/providers/helpers/googleHelper';
import googleDriveProvider from '../../../services/providers/googleDriveProvider';
import modalTemplate from '../common/modalTemplate';
import store from '../../../store';

export default modalTemplate({
  data: () => ({
    fileId: '',
  }),
  computedLocalSettings: {
    folderId: 'googleDriveFolderId',
    selectedTemplate: 'googleDrivePublishTemplate',
    format: 'googleDrivePublishFormat',
  },
  methods: {
    openFolder() {
      return store.dispatch(
        'modal/hideUntil',
        googleHelper.openPicker(this.config.token, 'folder')
          .then((folders) => {
            if (folders[0]) {
              store.dispatch('data/patchLocalSettings', {
                googleDriveFolderId: folders[0].id,
              });
            }
          }),
      );
    },
    resolve() {
      // Return new location
      const location = googleDriveProvider.makeLocation(this.config.token, this.fileId);
      if (this.format === 'html') {
        location.templateId = this.selectedTemplate;
      }
      this.config.resolve(location);
    },
  },
});
</script>
