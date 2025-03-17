<template>
  <div class="side-bar__panel side-bar__panel--menu">
    <div class="side-bar__info">
      <div class="menu-entry menu-entry--info flex flex--row flex--align-center" v-if="loginToken">
        <div class="menu-entry__icon menu-entry__icon--image">
          <user-image :user-id="userId"></user-image>
        </div>
        <span>登录名为<b>{{loginToken.name}}</b>。</span>
      </div>
      <div class="menu-entry menu-entry--info flex flex--row flex--align-center" v-if="syncToken">
        <div class="menu-entry__icon menu-entry__icon--image">
          <icon-provider :provider-id="currentWorkspace.providerId"></icon-provider>
        </div>
        <span v-if="currentWorkspace.providerId === 'giteeAppData'">
          <b>{{currentWorkspace.name}}</b> 与您的 Gitee 默认文档空间仓库同步。
        </span>
        <span v-else-if="currentWorkspace.providerId === 'githubAppData'">
          <b>{{currentWorkspace.name}}</b> 与您的 GitHub 默认文档空间仓库同步。
        </span>
        <span v-else-if="currentWorkspace.providerId === 'googleDriveWorkspace'">
          <b>{{currentWorkspace.name}}</b> 与 <a :href="workspaceLocationUrl" target="_blank">Google Drive 文件夹</a>同步。
        </span>
        <span v-else-if="currentWorkspace.providerId === 'couchdbWorkspace'">
          <b>{{currentWorkspace.name}}</b> 与 <a :href="workspaceLocationUrl" target="_blank">CouchDB 数据库</a>同步。
        </span>
        <span v-else-if="currentWorkspace.providerId === 'githubWorkspace'">
          <b>{{currentWorkspace.name}}</b> 与 <a :href="workspaceLocationUrl" target="_blank">GitHub 仓库</a> 同步。
        </span>
        <span v-else-if="currentWorkspace.providerId === 'giteeWorkspace'">
          <b>{{currentWorkspace.name}}</b> 与 <a :href="workspaceLocationUrl" target="_blank">Gitee 仓库</a> 同步。
        </span>
        <span v-else-if="currentWorkspace.providerId === 'gitlabWorkspace'">
          <b>{{currentWorkspace.name}}</b> 与 <a :href="workspaceLocationUrl" target="_blank">GitLab 项目</a>同步。
        </span>
        <span v-else-if="currentWorkspace.providerId === 'giteaWorkspace'">
          <b>{{currentWorkspace.name}}</b> 与 <a :href="workspaceLocationUrl" target="_blank">Gitea 项目</a>同步。
        </span>
      </div>
      <div class="menu-entry menu-entry--info flex flex--row flex--align-center" v-else>
        <div class="menu-entry__icon menu-entry__icon--disabled">
          <icon-sync-off></icon-sync-off>
        </div>
        <span><b>{{currentWorkspace.name}}</b> 未同步。</span>
      </div>
    </div>
    <menu-entry v-if="!loginToken" @click.native="signin">
      <template v-slot:icon><icon-login></icon-login></template>
      <div>使用 Gitee 登录</div>
      <span>同步您的主文档空间并解锁功能。</span>
    </menu-entry>
    <menu-entry v-if="!loginToken" @click.native="signinWithGithub">
      <template v-slot:icon><icon-login></icon-login></template>
      <div>使用 GitHub 登录</div>
      <span>同步您的主文档空间并解锁功能。</span>
    </menu-entry>
    <menu-entry @click.native="setPanel('workspaces')">
      <template v-slot:icon><icon-database></icon-database></template>
      <div><div class="menu-entry__label menu-entry__label--count" v-if="workspaceCount">{{workspaceCount}}</div> 文档空间</div>
      <span>切换到另一个文档空间。</span>
    </menu-entry>
    <hr>
    <menu-entry @click.native="setPanel('sync')">
      <template v-slot:icon><icon-sync></icon-sync></template>
      <div><div class="menu-entry__label menu-entry__label--count" v-if="syncLocationCount">{{syncLocationCount}}</div> 同步</div>
      <span>在云端同步您的文件。</span>
    </menu-entry>
    <menu-entry @click.native="setPanel('publish')">
      <template v-slot:icon><icon-upload></icon-upload></template>
      <div><div class="menu-entry__label menu-entry__label--count" v-if="publishLocationCount">{{publishLocationCount}}</div>发布</div>
      <span>将您的文件导出到 Web。</span>
    </menu-entry>
    <menu-entry @click.native="setPanel('history')">
      <template v-slot:icon><icon-history></icon-history></template>
      <div>历史</div>
      <span>跟踪和恢复文件修订。</span>
    </menu-entry>
    <menu-entry @click.native="fileProperties">
      <template v-slot:icon><icon-view-list></icon-view-list></template>
      <div>文件属性</div>
      <span>添加元数据并配置扩展。</span>
    </menu-entry>
    <hr>
    <menu-entry @click.native="setPanel('toc')">
      <template v-slot:icon><icon-toc></icon-toc></template>
      目录
    </menu-entry>
    <menu-entry @click.native="setPanel('help')">
      <template v-slot:icon><icon-help-circle></icon-help-circle></template>
      Markdown 帮助
    </menu-entry>
    <hr>
    <menu-entry @click.native="setPanel('importExport')">
      <template v-slot:icon><icon-content-save></icon-content-save></template>
      导入/导出
    </menu-entry>
    <menu-entry @click.native="print">
      <template v-slot:icon><icon-printer></icon-printer></template>
      打印
    </menu-entry>
    <hr>
    <menu-entry @click.native="badges">
      <template v-slot:icon><icon-seal></icon-seal></template>
      <div><div class="menu-entry__label menu-entry__label--count">{{badgeCount}}/{{featureCount}}</div> 徽章</div>
      <span>列出应用程序功能和获得的徽章。</span>
    </menu-entry>
    <menu-entry @click.native="accounts">
      <template v-slot:icon><icon-key></icon-key></template>
      <div><div class="menu-entry__label menu-entry__label--count">{{accountCount}}</div> 账号</div>
      <span>管理对您的外部账号的访问。</span>
    </menu-entry>
    <menu-entry @click.native="templates">
      <template v-slot:icon><icon-code-braces></icon-code-braces></template>
      <div><div class="menu-entry__label menu-entry__label--count">{{templateCount}}</div> 模板</div>
      <span>为您的导出配置 Handlebars 模板。</span>
    </menu-entry>
    <menu-entry @click.native="setPanel('editTheme')">
      <template v-slot:icon><icon-select-theme></icon-select-theme></template>
      编辑区主题
      <span>编辑区主题样式(自定义主题可编辑)。</span>
    </menu-entry>
    <menu-entry @click.native="setPanel('previewTheme')">
      <template v-slot:icon><icon-select-theme></icon-select-theme></template>
      预览区主题
      <span>预览区主题样式(自定义主题可编辑)。</span>
    </menu-entry>
    <menu-entry @click.native="settings">
      <template v-slot:icon><icon-settings></icon-settings></template>
      <div>配置</div>
      <span>调整应用程序和键盘快捷键。</span>
    </menu-entry>
    <hr>
    <menu-entry @click.native="setPanel('workspaceBackups')">
      <template v-slot:icon><icon-content-save></icon-content-save></template>
      文档空间备份
    </menu-entry>
    <menu-entry @click.native="reset">
      <template v-slot:icon><icon-logout></icon-logout></template>
      重置应用程序
    </menu-entry>
    <menu-entry @click.native="about">
      <template v-slot:icon><icon-help-circle></icon-help-circle></template>
      关于 StackEdit
    </menu-entry>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import MenuEntry from './common/MenuEntry';
import providerRegistry from '../../services/providers/common/providerRegistry';
import UserImage from '../UserImage';
import giteeHelper from '../../services/providers/helpers/giteeHelper';
import githubHelper from '../../services/providers/helpers/githubHelper';
import syncSvc from '../../services/syncSvc';
import userSvc from '../../services/userSvc';
import store from '../../store';

export default {
  components: {
    MenuEntry,
    UserImage,
  },
  computed: {
    ...mapGetters('workspace', [
      'currentWorkspace',
      'syncToken',
      'loginToken',
    ]),
    userId() {
      return userSvc.getCurrentUserId();
    },
    workspaceLocationUrl() {
      const provider = providerRegistry.providersById[this.currentWorkspace.providerId];
      return provider.getWorkspaceLocationUrl(this.currentWorkspace);
    },
    workspaceCount() {
      return Object.keys(store.getters['workspace/workspacesById']).length;
    },
    syncLocationCount() {
      return Object.keys(store.getters['syncLocation/currentWithWorkspaceSyncLocation']).length;
    },
    publishLocationCount() {
      return Object.keys(store.getters['publishLocation/current']).length;
    },
    templateCount() {
      return Object.keys(store.getters['data/allTemplatesById']).length;
    },
    accountCount() {
      return Object.values(store.getters['data/tokensByType'])
        .reduce((count, tokensBySub) => count + Object.values(tokensBySub).length, 0);
    },
    badgeCount() {
      return store.getters['data/allBadges'].filter(badge => badge.isEarned).length;
    },
    featureCount() {
      return store.getters['data/allBadges'].length;
    },
  },
  methods: {
    ...mapActions('data', {
      setPanel: 'setSideBarPanel',
    }),
    async signin() {
      try {
        await giteeHelper.signin();
        await syncSvc.afterSignIn();
        syncSvc.requestSync();
      } catch (e) {
        // Cancel
      }
    },
    async signinWithGithub() {
      try {
        await githubHelper.signin();
        await syncSvc.afterSignIn();
        syncSvc.requestSync();
      } catch (e) {
        // Cancel
      }
    },
    async fileProperties() {
      try {
        await store.dispatch('modal/open', 'fileProperties');
      } catch (e) {
        // Cancel
      }
    },
    print() {
      window.print();
    },
    async settings() {
      try {
        await store.dispatch('modal/open', 'settings');
      } catch (e) { /* Cancel */ }
    },
    async templates() {
      try {
        await store.dispatch('modal/open', 'templates');
      } catch (e) { /* Cancel */ }
    },
    async accounts() {
      try {
        await store.dispatch('modal/open', 'accountManagement');
      } catch (e) { /* Cancel */ }
    },
    async badges() {
      try {
        await store.dispatch('modal/open', 'badgeManagement');
      } catch (e) { /* Cancel */ }
    },
    async reset() {
      try {
        await store.dispatch('modal/open', 'reset');
        localStorage.setItem('resetStackEdit', '1');
        window.location.reload();
      } catch (e) { /* Cancel */ }
    },
    about() {
      store.dispatch('modal/open', 'about');
    },
  },
};
</script>
