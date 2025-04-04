<template>
  <div class="side-bar__panel side-bar__panel--menu">
    <input class="hidden-file" id="import-markdown-file-input" type="file" @change="onImportMarkdown">
    <label class="menu-entry button flex flex--row flex--align-center" for="import-markdown-file-input">
      <div class="menu-entry__icon flex flex--column flex--center">
        <icon-upload></icon-upload>
      </div>
      <div class="flex flex--column">
        <div>导入 Markdown</div>
        <span>导入纯文本文件。</span>
      </div>
    </label>
    <input class="hidden-file" id="import-html-file-input" type="file" @change="onImportHtml">
    <label class="menu-entry button flex flex--row flex--align-center" for="import-html-file-input">
      <div class="menu-entry__icon flex flex--column flex--center">
        <icon-upload></icon-upload>
      </div>
      <div class="flex flex--column">
        <div>导入 HTML</div>
        <span>将HTML文件转换为Markdown。</span>
      </div>
    </label>
    <hr>
    <menu-entry @click.native="exportMarkdown">
      <template v-slot:icon><icon-download></icon-download></template>
      <div>导出为 Markdown</div>
      <span>保存纯文本文件。</span>
    </menu-entry>
    <menu-entry @click.native="exportHtml">
      <template v-slot:icon><icon-download></icon-download></template>
      <div>导出为 HTML</div>
      <span>从模板生成HTML页面。</span>
    </menu-entry>
    <menu-entry @click.native="exportPdf">
      <template v-slot:icon><icon-download></icon-download></template>
      <div>导出为 HTML PDF</div>
      <span>从HTML模板生成PDF。</span>
    </menu-entry>
    <!-- <menu-entry @click.native="exportPandoc">
      <template v-slot:icon><icon-download></icon-download></template>
      <div>导出为 HTML Pandoc</div>
      <span>转换为PDF、Word、EPUB...</span>
    </menu-entry> -->
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import TurndownService from 'turndown/lib/turndown.browser.umd';
import htmlSanitizer from '../../libs/htmlSanitizer';
import MenuEntry from './common/MenuEntry';
import Provider from '../../services/providers/common/Provider';
import store from '../../store';
import workspaceSvc from '../../services/workspaceSvc';
import exportSvc from '../../services/exportSvc';
import badgeSvc from '../../services/badgeSvc';

const turndownService = new TurndownService(store.getters['data/computedSettings'].turndown);

const readFile = file => new Promise((resolve) => {
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      if (content.match(/\uFFFD/)) {
        store.dispatch('notification/error', 'File is not readable.');
      } else {
        resolve(content);
      }
    };
    reader.readAsText(file);
  }
});

export default {
  components: {
    MenuEntry,
  },
  computed: mapGetters(['isSponsor']),
  methods: {
    async onImportMarkdown(evt) {
      const file = evt.target.files[0];
      const content = await readFile(file);
      const item = await workspaceSvc.createFile({
        ...Provider.parseContent(content),
        name: file.name,
      });
      store.commit('file/setCurrentId', item.id);
      badgeSvc.addBadge('importMarkdown');
    },
    async onImportHtml(evt) {
      const file = evt.target.files[0];
      const content = await readFile(file);
      const sanitizedContent = htmlSanitizer.sanitizeHtml(content)
        .replace(/&#160;/g, ' '); // Replace non-breaking spaces with classic spaces
      const item = await workspaceSvc.createFile({
        ...Provider.parseContent(turndownService.turndown(sanitizedContent)),
        name: file.name,
      });
      store.commit('file/setCurrentId', item.id);
      badgeSvc.addBadge('importHtml');
    },
    async exportMarkdown() {
      const currentFile = store.getters['file/current'];
      try {
        await exportSvc.exportToDisk(currentFile.id, 'md');
        badgeSvc.addBadge('exportMarkdown');
      } catch (e) { /* Cancel */ }
    },
    async exportHtml() {
      try {
        await store.dispatch('modal/open', 'htmlExport');
      } catch (e) { /* Cancel */ }
    },
    async exportPdf() {
      try {
        await store.dispatch('modal/open', 'pdfExport');
      } catch (e) { /* Cancel */ }
    },
    async exportPandoc() {
      try {
        await store.dispatch('modal/open', 'pandocExport');
      } catch (e) { /* Cancel */ }
    },
  },
};
</script>
