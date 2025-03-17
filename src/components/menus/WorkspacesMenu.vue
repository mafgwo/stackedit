<template>
  <div class="side-bar__panel side-bar__panel--menu">
    <menu-entry @click.native="manageWorkspaces">
      <template v-slot:icon><icon-database></icon-database></template>
      <div><div class="menu-entry__label menu-entry__label--count">{{workspaceCount}}</div> 管理文档空间</div>
      <span>列出、重命名、删除文档空间</span>
    </menu-entry>
    <hr>
    <div class="workspace" v-for="(workspace, id) in workspacesById" :key="id">
      <menu-entry :href="workspace.url" target="_blank">
        <template v-if="id === 'main' && !workspace.sub" slot="icon" v-slot:icon><icon-provider :provider-id="'stackedit'"></icon-provider></template>
        <template v-else slot="icon" v-slot:icon><icon-provider :provider-id="workspace.providerId"></icon-provider></template>
        <div class="workspace__name"><div class="menu-entry__label" v-if="currentWorkspace === workspace">当前</div>{{workspace.name}}</div>
      </menu-entry>
    </div>
    <hr>
    <menu-entry @click.native="addGithubWorkspace">
      <template v-slot:icon><icon-provider provider-id="githubWorkspace"></icon-provider></template>
      <span>新增 <b>GitHub</b> 文档空间</span>
    </menu-entry>
    <menu-entry @click.native="addGiteeWorkspace">
      <template v-slot:icon><icon-provider provider-id="giteeWorkspace"></icon-provider></template>
      <span>新增 <b>Gitee</b> 文档空间</span>
    </menu-entry>
    <menu-entry @click.native="addGitlabWorkspace">
      <template v-slot:icon><icon-provider provider-id="gitlabWorkspace"></icon-provider></template>
      <span>新增 <b>GitLab</b> 文档空间</span>
    </menu-entry>
    <menu-entry @click.native="addGiteaWorkspace">
      <template v-slot:icon><icon-provider provider-id="giteaWorkspace"></icon-provider></template>
      <span>新增 <b>Gitea</b> 文档空间</span>
    </menu-entry>
    <menu-entry @click.native="addGoogleDriveWorkspace">
      <template v-slot:icon><icon-provider provider-id="googleDriveWorkspace"></icon-provider></template>
      <span>新增 <b>Google Drive</b> 文档空间</span>
    </menu-entry>
    <menu-entry @click.native="addCouchdbWorkspace">
      <template v-slot:icon><icon-provider provider-id="couchdbWorkspace"></icon-provider></template>
      <span>新增 <b>CouchDB</b> 文档空间</span>
    </menu-entry>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import MenuEntry from './common/MenuEntry';
import googleHelper from '../../services/providers/helpers/googleHelper';
import gitlabHelper from '../../services/providers/helpers/gitlabHelper';
import giteaHelper from '../../services/providers/helpers/giteaHelper';
import store from '../../store';

export default {
  components: {
    MenuEntry,
  },
  computed: {
    ...mapGetters('workspace', [
      'workspacesById',
      'currentWorkspace',
    ]),
    workspaceCount() {
      return Object.keys(this.workspacesById).length;
    },
  },
  methods: {
    async addCouchdbWorkspace() {
      try {
        store.dispatch('modal/open', {
          type: 'couchdbWorkspace',
        });
      } catch (e) { /* Cancel */ }
    },
    async addGithubWorkspace() {
      try {
        store.dispatch('modal/open', {
          type: 'githubWorkspace',
        });
      } catch (e) { /* Cancel */ }
    },
    async addGiteeWorkspace() {
      try {
        store.dispatch('modal/open', {
          type: 'giteeWorkspace',
        });
      } catch (e) { /* Cancel */ }
    },
    async addGitlabWorkspace() {
      try {
        const { serverUrl, applicationId, applicationSecret } = await store.dispatch('modal/open', { type: 'gitlabAccount' });
        const token = await gitlabHelper.addAccount(serverUrl, applicationId, applicationSecret);
        store.dispatch('modal/open', {
          type: 'gitlabWorkspace',
          token,
        });
      } catch (e) { /* Cancel */ }
    },
    async addGiteaWorkspace() {
      try {
        const applicationInfo = await store.dispatch('modal/open', { type: 'giteaAccount' });
        const token = await giteaHelper.addAccount(applicationInfo);
        store.dispatch('modal/open', {
          type: 'giteaWorkspace',
          token,
        });
      } catch (e) { /* Cancel */ }
    },
    async addGoogleDriveWorkspace() {
      try {
        const token = await googleHelper.addDriveAccount(true);
        store.dispatch('modal/open', {
          type: 'googleDriveWorkspace',
          token,
        });
      } catch (e) { /* Cancel */ }
    },
    manageWorkspaces() {
      try {
        store.dispatch('modal/open', 'workspaceManagement');
      } catch (e) { /* Cancel */ }
    },
  },
};
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.workspace .menu-entry {
  padding-top: 12px;
  padding-bottom: 12px;
}

.workspace__name {
  font-weight: bold;
  line-height: 1.2;
}
</style>
