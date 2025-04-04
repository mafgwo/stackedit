<template>
  <modal-inner aria-label="使用Pandoc导出">
    <div class="modal__content">
      <p>请为您的<b> pandoc导出</b>选择格式。</p>
      <form-entry label="Template">
        <template v-slot:field>
          <select class="textfield" v-model="selectedFormat" @keydown.enter="resolve()">
            <option value="asciidoc">AsciiDoc</option>
            <option value="context">ConTeXt</option>
            <option value="epub">EPUB</option>
            <option value="epub3">EPUB v3</option>
            <option value="latex">LaTeX</option>
            <option value="odt">OpenOffice</option>
            <option value="pdf">PDF</option>
            <option value="rst">reStructuredText</option>
            <option value="rtf">Rich Text Format</option>
            <option value="textile">Textile</option>
            <option value="docx">Word</option>
          </select>
        </template>
      </form-entry>
    </div>
    <div class="modal__button-bar">
      <button class="button" @click="config.reject()">取消</button>
      <button class="button button--resolve" @click="resolve()">确认</button>
    </div>
  </modal-inner>
</template>

<script>
import FileSaver from 'file-saver';
import networkSvc from '../../services/networkSvc';
import editorSvc from '../../services/editorSvc';
import modalTemplate from './common/modalTemplate';
import store from '../../store';
import badgeSvc from '../../services/badgeSvc';

export default modalTemplate({
  computedLocalSettings: {
    selectedFormat: 'pandocExportFormat',
  },
  methods: {
    async resolve() {
      this.config.resolve();
      const currentFile = store.getters['file/current'];
      const currentContent = store.getters['content/current'];
      const { selectedFormat } = this;
      store.dispatch('queue/enqueue', async () => {
        try {
          const { body } = await networkSvc.request({
            method: 'POST',
            url: 'pandocExport',
            params: {
              format: selectedFormat,
              options: JSON.stringify(store.getters['data/computedSettings'].pandoc),
              metadata: JSON.stringify(currentContent.properties),
            },
            body: JSON.stringify(editorSvc.getPandocAst()),
            blob: true,
            timeout: 60000,
          });
          FileSaver.saveAs(body, `${currentFile.name}.${selectedFormat}`);
          badgeSvc.addBadge('exportPandoc');
        } catch (err) {
          console.error(err); // eslint-disable-line no-console
          store.dispatch('notification/error', err);
        }
      });
    },
  },
});
</script>
