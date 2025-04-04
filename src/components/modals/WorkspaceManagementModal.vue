<template>
  <modal-inner class="modal__inner-1--workspace-management" aria-label="管理文档空间">
    <div class="modal__content">
      <div class="modal__image">
        <icon-database></icon-database>
      </div>
      <p><br>可以访问以下文档空间：</p>
      <div class="workspace-entry flex flex--column" v-for="(workspace, id) in workspacesById" :key="id">
        <div class="flex flex--column">
          <div class="workspace-entry__header flex flex--row flex--align-center">
            <div class="workspace-entry__icon">
              <icon-provider v-if="id === 'main' && !workspace.sub" :provider-id="'stackedit'"></icon-provider>
              <icon-provider v-else :provider-id="workspace.providerId"></icon-provider>
            </div>
            <input class="text-input" type="text" v-if="editedId === id" v-focus @blur="submitEdit()" @keydown.enter="submitEdit()" @keydown.esc.stop="submitEdit(true)" v-model="editingName">
            <div class="workspace-entry__name" v-else>{{workspace.name}}</div>
            <div class="workspace-entry__buttons flex flex--row">
              <button class="workspace-entry__button button" @click="edit(id)" v-title="'编辑名称'">
                <icon-pen></icon-pen>
              </button>
              <template v-if="workspace.providerId === 'giteeAppData' || workspace.providerId === 'githubAppData' || workspace.providerId === 'githubWorkspace'
                || workspace.providerId === 'giteeWorkspace' || workspace.providerId === 'gitlabWorkspace' || workspace.providerId === 'giteaWorkspace'">
                <button class="workspace-entry__button button" @click="stopAutoSync(id)" v-if="workspace.autoSync == undefined || workspace.autoSync" v-title="'关闭自动同步'">
                  <icon-sync-auto></icon-sync-auto>
                </button>
                <button class="workspace-entry__button button" @click="startAutoSync(id)" v-if="workspace.autoSync != undefined && !workspace.autoSync" v-title="'启动自动同步'">
                  <icon-sync-stop></icon-sync-stop>
                </button>
              </template>
              <button class="workspace-entry__button button" @click="remove(id)" v-title="'删除'">
                <icon-delete></icon-delete>
              </button>
            </div>
          </div>
          <div class="workspace-entry__row flex flex--row flex--align-center">
            <div class="workspace-entry__url">
              {{workspace.url}}
            </div>
            <div class="workspace-entry__buttons flex flex--row">
              <button class="workspace-entry__button button" v-clipboard="workspace.url" @click="info('文档空间URL已复制到剪贴板!')" v-title="'复制URL'">
                <icon-content-copy></icon-content-copy>
              </button>
              <a class="workspace-entry__button button" :href="workspace.url" target="_blank" v-title="'打开文档空间'">
                <icon-open-in-new></icon-open-in-new>
              </a>
            </div>
          </div>
          <div class="workspace-entry__row flex flex--row flex--align-center" v-if="workspace.locationUrl">
            <div class="workspace-entry__url">
              {{workspace.locationUrl}}
            </div>
            <div class="workspace-entry__buttons flex flex--row">
              <button class="workspace-entry__button button" v-clipboard="workspace.locationUrl" @click="info('文档空间URL已复制到剪贴板!')" v-title="'复制URL'">
                <icon-content-copy></icon-content-copy>
              </button>
              <a class="workspace-entry__button button" :href="workspace.locationUrl" target="_blank" v-title="'打开文档空间位置'">
                <icon-open-in-new></icon-open-in-new>
              </a>
            </div>
          </div>
          <div>
            <span class="workspace-entry__offline" v-if="availableOffline[id]">
              离线可用
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="modal__button-bar">
      <button class="button button--resolve" @click="config.resolve()">关闭</button>
    </div>
  </modal-inner>
</template>

<script>
import { reactive } from 'vue';
import { mapGetters, mapActions } from 'vuex';
import ModalInner from './common/ModalInner';
import workspaceSvc from '../../services/workspaceSvc';
import store from '../../store';
import badgeSvc from '../../services/badgeSvc';
import localDbSvc from '../../services/localDbSvc';

export default {
  components: {
    ModalInner,
  },
  data: () => ({
    editedId: null,
    editingName: '',
    availableOffline: reactive({}),
  }),
  computed: {
    ...mapGetters('modal', [
      'config',
    ]),
    ...mapGetters('workspace', [
      'workspacesById',
      'mainWorkspace',
      'currentWorkspace',
    ]),
  },
  methods: {
    ...mapActions('notification', [
      'info',
    ]),
    edit(id) {
      this.editedId = id;
      this.editingName = this.workspacesById[id].name;
    },
    submitEdit(cancel) {
      const workspace = this.workspacesById[this.editedId];
      if (workspace) {
        if (!cancel && this.editingName && this.editingName !== workspace.name) {
          store.dispatch('workspace/patchWorkspacesById', {
            [this.editedId]: {
              ...workspace,
              name: this.editingName,
            },
          });
          badgeSvc.addBadge('renameWorkspace');
        } else {
          this.editingName = workspace.name;
        }
      }
      this.editedId = null;
    },
    async remove(id) {
      if (id === this.mainWorkspace.id) {
        this.info('您的主文档空间无法删除。');
      } else if (id === this.currentWorkspace.id) {
        this.info('请先关闭文档空间，然后再将其删除。');
      } else {
        try {
          const workspace = this.workspacesById[id];
          if (!workspace) {
            return;
          }
          await store.dispatch('modal/open', {
            type: 'removeWorkspace',
            name: workspace.name,
          });
          workspaceSvc.removeWorkspace(id);
          badgeSvc.addBadge('removeWorkspace');
        } catch (e) { /* Cancel */ }
      }
    },
    async stopAutoSync(id) {
      const workspace = this.workspacesById[id];
      if (!workspace) {
        return;
      }
      await store.dispatch('modal/open', {
        type: 'stopAutoSyncWorkspace',
        name: workspace.name,
      });
      store.dispatch('workspace/patchWorkspacesById', {
        [id]: {
          ...workspace,
          autoSync: false,
        },
      });
      badgeSvc.addBadge('stopAutoSyncWorkspace');
    },
    async startAutoSync(id) {
      const workspace = this.workspacesById[id];
      if (!workspace) {
        return;
      }
      await store.dispatch('modal/open', {
        type: 'autoSyncWorkspace',
        name: workspace.name,
      });
      store.dispatch('workspace/patchWorkspacesById', {
        [id]: {
          ...workspace,
          autoSync: true,
        },
      });
      badgeSvc.addBadge('autoSyncWorkspace');
    },
  },
  created() {
    Object.keys(this.workspacesById).forEach(async (workspaceId) => {
      const cancel = localDbSvc.getWorkspaceItems(workspaceId, () => {
        this.availableOffline[workspaceId] = true;
        cancel();
      });
    });
  },
};
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.workspace-entry {
  margin: 1.75em 0;
  height: auto;
  font-size: 17px;
  line-height: 1.5;
}

$button-size: 30px;
$small-button-size: 22px;

.workspace-entry__header {
  line-height: $button-size;

  .text-input {
    border: 1px solid $link-color;
    padding: 0 5px;
    line-height: $button-size;
    height: $button-size;
  }
}

.workspace-entry__row {
  border-top: 1px solid $hr-color;
  line-height: $small-button-size;
}

.workspace-entry__icon {
  height: 22px;
  width: 22px;
  margin-right: 0.75rem;
  flex: none;
}

.workspace-entry__name {
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-weight: bold;
}

.workspace-entry__url {
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  opacity: 0.5;
  font-size: 0.67em;
}

.workspace-entry__buttons {
  margin-left: 0.75rem;

  .workspace-entry__row & {
    margin-left: 0.5rem;
  }
}

.workspace-entry__button {
  width: $button-size;
  height: $button-size;
  padding: 4px;
  background-color: transparent;
  opacity: 0.75;

  .workspace-entry__row & {
    width: $small-button-size;
    height: $small-button-size;
    padding: 4px;
  }

  &:active,
  &:focus,
  &:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.1);
  }
}

.workspace-entry__offline {
  font-size: 0.8rem;
  line-height: 1;
  padding: 0.15em 0.35em;
  border-radius: 3px;
  color: #fff;
  background-color: darken($error-color, 10);
}
</style>
