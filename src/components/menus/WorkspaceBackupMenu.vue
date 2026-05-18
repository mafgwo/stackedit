<template>
  <div class="side-bar__panel side-bar__panel--menu">
    <input class="hidden-file" id="import-backup-file-input" type="file" @change="onImportBackup">
    <label class="menu-entry button flex flex--row flex--align-center" for="import-backup-file-input">
      <div class="menu-entry__icon flex flex--column flex--center">
        <icon-content-save></icon-content-save>
      </div>
      <div class="flex flex--column">
        导入文档空间备份
      </div>
    </label>
    <menu-entry @click.native="exportWorkspace">
      <template v-slot:icon><icon-content-save></icon-content-save></template>
      导出文档空间备份
    </menu-entry>
  </div>
</template>

<script>
import FileSaver from 'file-saver';
import MenuEntry from './common/MenuEntry';
import store from '../../store';
import backupSvc from '../../services/backupSvc';
import workspaceBackupSvc from '../../services/workspaceBackupSvc';

export default {
  components: {
    MenuEntry,
  },
  computed: {
    workspaceId: () => store.getters['workspace/currentWorkspace'].id,
  },
  methods: {
    async onImportBackup(evt) {
      const file = evt.target.files[0];
      if (file) {
        try {
          if (file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip') {
            const result = await workspaceBackupSvc.importZip(file);
            await backupSvc.importBackup(result.workspaceJson);
            if (result.missingImageFileCount) {
              store.dispatch('notification/error', `有 ${result.missingImageFileCount} 张图片文件在ZIP中缺失。`);
            } else if (result.importedImageCount) {
              store.dispatch('notification/info', `已导入 ${result.importedImageCount} 张文档空间图片。`);
            }
          } else {
            const text = await file.text();
            if (text.match(/\uFFFD/)) {
              store.dispatch('notification/error', 'File is not readable.');
            } else {
              await backupSvc.importBackup(text);
            }
          }
        } catch (err) {
          store.dispatch('notification/error', err.message || `${err}`);
        } finally {
          evt.target.value = '';
        }
      }
    },
    async exportWorkspace() {
      try {
        const { includeImages } = await store.dispatch('modal/open', 'workspaceBackupExport');
        const result = await workspaceBackupSvc.exportWorkspace({
          workspaceId: this.workspaceId,
          includeImages,
        });
        FileSaver.saveAs(result.blob, result.filename);
        if (result.missingCount) {
          store.dispatch('notification/error', `有 ${result.missingCount} 张图片未能导出，详情见 missing-images.json。`);
        }
      } catch (err) {
        if (err) {
          store.dispatch('notification/error', err.message || `${err}`);
        }
      }
    },
  },
};
</script>
