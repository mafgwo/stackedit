<template>
  <modal-inner class="modal__inner-1--templates" aria-label="管理模板">
    <div class="modal__content">
      <div class="form-entry">
        <label class="form-entry__label" for="template">模板</label>
        <div class="form-entry__field">
          <input v-if="isEditing" id="template" type="text" class="textfield" v-focus @blur="submitEdit()" @keydown.enter="submitEdit()" @keydown.esc.stop="submitEdit(true)" v-model="editingName">
          <select v-else id="template" v-model="selectedId" class="textfield">
            <option v-for="(template, id) in templates" :key="id" :value="id">
              {{ template.name }}
            </option>
          </select>
        </div>
        <div class="form-entry__actions flex flex--row flex--end">
          <button class="form-entry__button button" @click="create" v-title="'新建模板'">
            <icon-file-plus></icon-file-plus>
          </button>
          <button class="form-entry__button button" @click="copy" v-title="'复制模板'">
            <icon-file-multiple></icon-file-multiple>
          </button>
          <button v-if="!isReadOnly" class="form-entry__button button" @click="isEditing = true" v-title="'重命名模板'">
            <icon-pen></icon-pen>
          </button>
          <button v-if="!isReadOnly" class="form-entry__button button" @click="remove" v-title="'删除模板'">
            <icon-delete></icon-delete>
          </button>
        </div>
      </div>
      <div class="form-entry">
        <label class="form-entry__label">值</label>
        <div class="form-entry__field">
          <template v-for="(template, id) in templates" :key="id">
            <code-editor v-if="id === selectedId" lang="handlebars" :value="template.value" :disabled="isReadOnly" @changed="template.value = $event"></code-editor>
          </template>
        </div>
      </div>
      <div v-if="!isReadOnly">
        <a href="javascript:void(0)" v-if="!showHelpers" @click="showHelpers = true">添加帮助</a>
        <div class="form-entry" v-else>
          <br>
          <label class="form-entry__label">帮助</label>
          <div class="form-entry__field">
            <template v-for="(template, id) in templates" :key="id">
              <code-editor v-if="id === selectedId" lang="javascript" :value="template.helpers" @changed="template.helpers = $event"></code-editor>
            </template>
          </div>
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
import utils from '../../services/utils';
import badgeSvc from '../../services/badgeSvc';
import ModalInner from './common/ModalInner';
import CodeEditor from '../CodeEditor';
import emptyTemplateValue from '../../data/empties/emptyTemplateValue.html?raw';
import emptyTemplateHelpers from '../../data/empties/emptyTemplateHelpers.js?raw'; // eslint-disable-line
import store from '../../store';

const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

function fillEmptyFields(template) {
  if (template.value === '\n') {
    template.value = emptyTemplateValue;
  }
  if (template.helpers === '\n') {
    template.helpers = emptyTemplateHelpers;
  }
}

export default {
  components: {
    ModalInner,
    CodeEditor,
  },
  data: () => ({
    selectedId: '',
    templates: {},
    showHelpers: false,
    isEditing: false,
    editingName: '',
  }),
  computed: {
    ...mapGetters('modal', [
      'config',
    ]),
    isReadOnly() {
      return this.templates[this.selectedId].isAdditional;
    },
  },
  created() {
    this.$watch(
      () => store.getters['data/allTemplatesById'],
      (allTemplatesById) => {
        const templates = {};
        // Sort templates by name
        Object.entries(allTemplatesById)
          .sort(([, template1], [, template2]) => collator.compare(template1.name, template2.name))
          .forEach(([id, template]) => {
            const templateClone = utils.deepCopy(template);
            fillEmptyFields(templateClone);
            templates[id] = templateClone;
          });
        this.templates = templates;
        this.selectedId = this.config.selectedId;
        if (!templates[this.selectedId]) {
          [this.selectedId] = Object.keys(templates);
        }
        this.isEditing = false;
      },
      { immediate: true },
    );
    this.$watch('selectedId', (selectedId) => {
      const template = this.templates[selectedId];
      this.showHelpers = template.helpers !== emptyTemplateHelpers;
      this.editingName = template.name;
    }, { immediate: true });
  },
  methods: {
    create() {
      const template = {
        name: 'New template',
        value: '\n',
        helpers: '\n',
      };
      fillEmptyFields(template);
      this.selectedId = utils.uid();
      this.templates[this.selectedId] = template;
      this.isEditing = true;
    },
    copy() {
      const template = utils.deepCopy(this.templates[this.selectedId]);
      template.name += ' copy';
      delete template.isAdditional;
      this.selectedId = utils.uid();
      this.templates[this.selectedId] = template;
      this.isEditing = true;
    },
    remove() {
      delete this.templates[this.selectedId];
      [this.selectedId] = Object.keys(this.templates);
    },
    submitEdit(cancel) {
      const template = this.templates[this.selectedId];
      if (!cancel && this.editingName) {
        template.name = utils.sanitizeName(this.editingName);
      } else {
        this.editingName = template.name;
      }
      setTimeout(() => { // For the form-entry to get the blur event
        this.isEditing = false;
      }, 1);
    },
    async resolve() {
      const oldTemplateIds = Object.keys(store.getters['data/templatesById']);
      await store.dispatch('data/setTemplatesById', this.templates);
      const newTemplateIds = Object.keys(store.getters['data/templatesById']);
      const createdCount = newTemplateIds
        .filter(id => !oldTemplateIds.includes(id))
        .length;
      const removedCount = oldTemplateIds
        .filter(id => !newTemplateIds.includes(id))
        .length;
      if (createdCount) {
        badgeSvc.addBadge('addTemplate');
      }
      if (removedCount) {
        badgeSvc.addBadge('removeTemplate');
      }
      this.config.resolve({
        templates: this.templates,
        selectedId: this.selectedId,
      });
    },
  },
};
</script>

<style lang="scss">
.modal__inner-1.modal__inner-1--templates {
  max-width: 600px;
}
</style>
