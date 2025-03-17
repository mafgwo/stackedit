<template>
  <div class="side-bar__panel side-bar__panel--menu">
    <div class="side-bar__info" v-if="isCurrentTemp">
      <p>{{currentFileName}} 无法发布，因为它是一个临时文件。</p>
    </div>
    <div v-else>
      <div class="side-bar__info" v-if="publishLocations.length">
        <p>{{currentFileName}} 已经发布。</p>
        <menu-entry @click.native="requestPublish">
          <template v-slot:icon><icon-upload></icon-upload></template>
          <div>立即发布</div>
          <span>发布 {{currentFileName}} 的更新。</span>
        </menu-entry>
        <menu-entry @click.native="managePublish">
          <template v-slot:icon><icon-view-list></icon-view-list></template>
          <div><div class="menu-entry__label menu-entry__label--count">{{locationCount}}</div> 文件发布</div>
          <span>管理 {{currentFileName}} 的发布位置。</span>
        </menu-entry>
      </div>
      <div class="side-bar__info" v-else-if="noToken">
        <p>您必须链接一个账号才能开始发布文件。</p>
      </div>
      <hr>
      <div v-for="token in bloggerTokens" :key="'blogger-' + token.sub">
        <menu-entry @click.native="publishBlogger(token)">
          <template v-slot:icon><icon-provider provider-id="blogger"></icon-provider></template>
          <div>发布到 Blogger</div>
          <span>{{token.name}}</span>
        </menu-entry>
        <menu-entry @click.native="publishBloggerPage(token)">
          <template v-slot:icon><icon-provider provider-id="bloggerPage"></icon-provider></template>
          <div>发布到 Blogger Page</div>
          <span>{{token.name}}</span>
        </menu-entry>
      </div>
      <div v-for="token in dropboxTokens" :key="token.sub">
        <menu-entry @click.native="publishDropbox(token)">
          <template v-slot:icon><icon-provider provider-id="dropbox"></icon-provider></template>
          <div>发布到 Dropbox</div>
          <span>{{token.name}}</span>
        </menu-entry>
      </div>
      <div v-for="token in githubTokens" :key="token.sub">
        <menu-entry @click.native="publishGist(token)">
          <template v-slot:icon><icon-provider provider-id="gist"></icon-provider></template>
          <div>发布到 GitHubGist</div>
          <span>{{token.name}}</span>
        </menu-entry>
        <menu-entry @click.native="publishGithub(token)">
          <template v-slot:icon><icon-provider provider-id="github"></icon-provider></template>
          <div>发布到 GitHub</div>
          <span>{{token.name}}</span>
        </menu-entry>
      </div>
      <div v-for="token in giteeTokens" :key="token.sub">
        <menu-entry @click.native="publishGiteeGist(token)">
          <template v-slot:icon><icon-provider provider-id="giteegist"></icon-provider></template>
          <div>发布到 GiteeGist</div>
          <span>{{token.name}}</span>
        </menu-entry>
        <menu-entry @click.native="publishGitee(token)">
          <template v-slot:icon><icon-provider provider-id="gitee"></icon-provider></template>
          <div>发布到 Gitee</div>
          <span>{{token.name}}</span>
        </menu-entry>
      </div>
      <div v-for="token in gitlabTokens" :key="token.sub">
        <menu-entry @click.native="publishGitlab(token)">
          <template v-slot:icon><icon-provider provider-id="gitlab"></icon-provider></template>
          <div>发布到 GitLab</div>
          <span>{{token.name}}</span>
        </menu-entry>
      </div>
      <div v-for="token in giteaTokens" :key="token.sub">
        <menu-entry @click.native="publishGitea(token)">
          <template v-slot:icon><icon-provider provider-id="gitea"></icon-provider></template>
          <div>发布到 Gitea</div>
          <span>{{token.name}}</span>
        </menu-entry>
      </div>
      <div v-for="token in googleDriveTokens" :key="token.sub">
        <menu-entry @click.native="publishGoogleDrive(token)">
          <template v-slot:icon><icon-provider provider-id="googleDrive"></icon-provider></template>
          <div>发布到 Google Drive</div>
          <span>{{token.name}}</span>
        </menu-entry>
      </div>
      <div v-for="token in wordpressTokens" :key="token.sub">
        <menu-entry @click.native="publishWordpress(token)">
          <template v-slot:icon><icon-provider provider-id="wordpress"></icon-provider></template>
          <div>发布到 WordPress</div>
          <span>{{token.name}}</span>
        </menu-entry>
      </div>
      <div v-for="token in zendeskTokens" :key="token.sub">
        <menu-entry @click.native="publishZendesk(token)">
          <template v-slot:icon><icon-provider provider-id="zendesk"></icon-provider></template>
          <div>发布到 Zendesk Help Center</div>
          <span>{{token.name}} — {{token.subdomain}}</span>
        </menu-entry>
      </div>
      <hr>
      <menu-entry @click.native="addBloggerAccount">
        <template v-slot:icon><icon-provider provider-id="blogger"></icon-provider></template>
        <span>添加 Blogger 账号</span>
      </menu-entry>
      <menu-entry @click.native="addDropboxAccount">
        <template v-slot:icon><icon-provider provider-id="dropbox"></icon-provider></template>
        <span>添加 Dropbox 账号</span>
      </menu-entry>
      <menu-entry @click.native="addGithubAccount">
        <template v-slot:icon><icon-provider provider-id="github"></icon-provider></template>
        <span>添加 GitHub 账号</span>
      </menu-entry>
      <menu-entry @click.native="addGiteeAccount">
        <template v-slot:icon><icon-provider provider-id="gitee"></icon-provider></template>
        <span>添加 Gitee 账号</span>
      </menu-entry>
      <menu-entry @click.native="addGitlabAccount">
        <template v-slot:icon><icon-provider provider-id="gitlab"></icon-provider></template>
        <span>添加 GitLab 账号</span>
      </menu-entry>
      <menu-entry @click.native="addGiteaAccount">
        <template v-slot:icon><icon-provider provider-id="gitea"></icon-provider></template>
        <span>添加 Gitea 账号</span>
      </menu-entry>
      <menu-entry @click.native="addGoogleDriveAccount">
        <template v-slot:icon><icon-provider provider-id="googleDrive"></icon-provider></template>
        <span>添加 Google Drive 账号</span>
      </menu-entry>
      <menu-entry @click.native="addWordpressAccount">
        <template v-slot:icon><icon-provider provider-id="wordpress"></icon-provider></template>
        <span>添加 WordPress 账号</span>
      </menu-entry>
      <menu-entry @click.native="addZendeskAccount">
        <template v-slot:icon><icon-provider provider-id="zendesk"></icon-provider></template>
        <span>添加 Zendesk 账号</span>
      </menu-entry>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import MenuEntry from './common/MenuEntry';
import googleHelper from '../../services/providers/helpers/googleHelper';
import dropboxHelper from '../../services/providers/helpers/dropboxHelper';
import githubHelper from '../../services/providers/helpers/githubHelper';
import giteeHelper from '../../services/providers/helpers/giteeHelper';
import gitlabHelper from '../../services/providers/helpers/gitlabHelper';
import giteaHelper from '../../services/providers/helpers/giteaHelper';
import wordpressHelper from '../../services/providers/helpers/wordpressHelper';
import zendeskHelper from '../../services/providers/helpers/zendeskHelper';
import publishSvc from '../../services/publishSvc';
import store from '../../store';

const tokensToArray = (tokens, filter = () => true) => Object.values(tokens)
  .filter(token => filter(token))
  .sort((token1, token2) => token1.name.localeCompare(token2.name));

const publishModalOpener = (type, featureId) => async (token) => {
  try {
    const publishLocation = await store.dispatch('modal/open', {
      type,
      token,
    });
    publishSvc.createPublishLocation(publishLocation, featureId);
  } catch (e) { /* cancel */ }
};

export default {
  components: {
    MenuEntry,
  },
  computed: {
    ...mapState('queue', [
      'isPublishRequested',
    ]),
    ...mapGetters('file', [
      'isCurrentTemp',
    ]),
    ...mapGetters('publishLocation', {
      publishLocations: 'current',
    }),
    locationCount() {
      return Object.keys(this.publishLocations).length;
    },
    currentFileName() {
      return `"${store.getters['file/current'].name}"`;
    },
    bloggerTokens() {
      return tokensToArray(store.getters['data/googleTokensBySub'], token => token.isBlogger);
    },
    dropboxTokens() {
      return tokensToArray(store.getters['data/dropboxTokensBySub']);
    },
    githubTokens() {
      return tokensToArray(store.getters['data/githubTokensBySub']);
    },
    giteeTokens() {
      return tokensToArray(store.getters['data/giteeTokensBySub']);
    },
    gitlabTokens() {
      return tokensToArray(store.getters['data/gitlabTokensBySub']);
    },
    giteaTokens() {
      return tokensToArray(store.getters['data/giteaTokensBySub']);
    },
    googleDriveTokens() {
      return tokensToArray(store.getters['data/googleTokensBySub'], token => token.isDrive);
    },
    wordpressTokens() {
      return tokensToArray(store.getters['data/wordpressTokensBySub']);
    },
    zendeskTokens() {
      return tokensToArray(store.getters['data/zendeskTokensBySub']);
    },
    noToken() {
      return !this.bloggerTokens.length
        && !this.dropboxTokens.length
        && !this.githubTokens.length
        && !this.giteeTokens.length
        && !this.gitlabTokens.length
        && !this.giteaTokens.length
        && !this.googleDriveTokens.length
        && !this.wordpressTokens.length
        && !this.zendeskTokens.length;
    },
  },
  methods: {
    requestPublish() {
      if (!this.isPublishRequested) {
        publishSvc.requestPublish();
      }
    },
    async managePublish() {
      try {
        await store.dispatch('modal/open', 'publishManagement');
      } catch (e) { /* cancel */ }
    },
    async addBloggerAccount() {
      try {
        await googleHelper.addBloggerAccount();
      } catch (e) { /* cancel */ }
    },
    async addDropboxAccount() {
      try {
        await store.dispatch('modal/open', { type: 'dropboxAccount' });
        await dropboxHelper.addAccount(!store.getters['data/localSettings'].dropboxRestrictedAccess);
      } catch (e) { /* cancel */ }
    },
    async addGithubAccount() {
      try {
        await store.dispatch('modal/open', { type: 'githubAccount' });
        await githubHelper.addAccount(store.getters['data/localSettings'].githubRepoFullAccess);
      } catch (e) { /* cancel */ }
    },
    async addGiteeAccount() {
      try {
        await store.dispatch('modal/open', { type: 'giteeAccount' });
        await giteeHelper.addAccount();
      } catch (e) { /* cancel */ }
    },
    async addGitlabAccount() {
      try {
        const { serverUrl, applicationId, applicationSecret } = await store.dispatch('modal/open', { type: 'gitlabAccount' });
        await gitlabHelper.addAccount(serverUrl, applicationId, applicationSecret);
      } catch (e) { /* cancel */ }
    },
    async addGiteaAccount() {
      try {
        const applicationInfo = await store.dispatch('modal/open', { type: 'giteaAccount' });
        await giteaHelper.addAccount(applicationInfo);
      } catch (e) { /* cancel */ }
    },
    async addGoogleDriveAccount() {
      try {
        await store.dispatch('modal/open', { type: 'googleDriveAccount' });
        await googleHelper.addDriveAccount(!store.getters['data/localSettings'].googleDriveRestrictedAccess);
      } catch (e) { /* cancel */ }
    },
    async addWordpressAccount() {
      try {
        await wordpressHelper.addAccount();
      } catch (e) { /* cancel */ }
    },
    async addZendeskAccount() {
      try {
        const { subdomain, clientId } = await store.dispatch('modal/open', { type: 'zendeskAccount' });
        await zendeskHelper.addAccount(subdomain, clientId);
      } catch (e) { /* cancel */ }
    },
    publishBlogger: publishModalOpener('bloggerPublish', 'publishToBlogger'),
    publishBloggerPage: publishModalOpener('bloggerPagePublish', 'publishToBloggerPage'),
    publishDropbox: publishModalOpener('dropboxPublish', 'publishToDropbox'),
    publishGithub: publishModalOpener('githubPublish', 'publishToGithub'),
    publishGist: publishModalOpener('gistPublish', 'publishToGist'),
    publishGitee: publishModalOpener('giteePublish', 'publishToGitee'),
    publishGiteeGist: publishModalOpener('giteeGistPublish', 'publishGiteeGist'),
    publishGitlab: publishModalOpener('gitlabPublish', 'publishToGitlab'),
    publishGitea: publishModalOpener('giteaPublish', 'publishToGitea'),
    publishGoogleDrive: publishModalOpener('googleDrivePublish', 'publishToGoogleDrive'),
    publishWordpress: publishModalOpener('wordpressPublish', 'publishToWordPress'),
    publishZendesk: publishModalOpener('zendeskPublish', 'publishToZendesk'),
  },
};
</script>
