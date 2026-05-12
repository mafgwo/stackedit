import store from '../../store';
import gitcodeHelper from './helpers/gitcodeHelper';
import Provider from './common/Provider';
import utils from '../utils';
import workspaceSvc from '../workspaceSvc';
import userSvc from '../userSvc';

const savedSha = {};

export default new Provider({
  id: 'gitcode',
  name: 'GitCode',
  getToken({ sub }) {
    return store.getters['data/gitcodeTokensBySub'][sub];
  },
  getLocationUrl({
    owner,
    repo,
    branch,
    path,
  }) {
    return `${gitcodeHelper.webBaseUrl}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tree/${encodeURIComponent(branch)}/${utils.encodeUrlPath(path)}`;
  },
  getLocationDescription({ path }) {
    return path;
  },
  async downloadContent(token, syncLocation) {
    const { sha, data } = await gitcodeHelper.downloadFile({
      ...syncLocation,
      token,
    });
    savedSha[syncLocation.id] = sha;
    return Provider.parseContent(data, `${syncLocation.fileId}/content`);
  },
  async uploadContent(token, content, syncLocation) {
    if (!savedSha[syncLocation.id]) {
      try {
        await this.downloadContent(token, syncLocation);
      } catch (e) {
        // Ignore error
      }
    }
    const sha = savedSha[syncLocation.id];
    delete savedSha[syncLocation.id];
    await gitcodeHelper.uploadFile({
      ...syncLocation,
      token,
      content: Provider.serializeContent(content),
      sha,
    });
    return syncLocation;
  },
  async publish(token, html, metadata, publishLocation, commitMessage) {
    try {
      await this.downloadContent(token, publishLocation);
    } catch (e) {
      // Ignore error
    }
    const sha = savedSha[publishLocation.id];
    delete savedSha[publishLocation.id];
    await gitcodeHelper.uploadFile({
      ...publishLocation,
      token,
      content: html,
      sha,
      commitMessage,
    });
    return publishLocation;
  },
  async openFile(token, syncLocation) {
    if (!Provider.openFileWithLocation(syncLocation)) {
      let content;
      try {
        content = await this.downloadContent(token, syncLocation);
      } catch (e) {
        store.dispatch('notification/error', `Could not open file ${syncLocation.path}.`);
        return;
      }

      let name = syncLocation.path;
      const slashPos = name.lastIndexOf('/');
      if (slashPos > -1 && slashPos < name.length - 1) {
        name = name.slice(slashPos + 1);
      }
      const dotPos = name.lastIndexOf('.');
      if (dotPos > 0 && slashPos < name.length) {
        name = name.slice(0, dotPos);
      }
      const item = await workspaceSvc.createFile({
        name,
        parentId: store.getters['file/current'].parentId,
        text: content.text,
        properties: content.properties,
        discussions: content.discussions,
        comments: content.comments,
      }, true);
      store.commit('file/setCurrentId', item.id);
      workspaceSvc.addSyncLocation({
        ...syncLocation,
        fileId: item.id,
      });
      store.dispatch('notification/info', `${store.getters['file/current'].name}已从GitCode导入。`);
    }
  },
  makeLocation(token, owner, repo, branch, path) {
    return {
      providerId: this.id,
      sub: token.sub,
      owner,
      repo,
      branch,
      path,
    };
  },
  async listFileRevisions({ token, syncLocation }) {
    const entries = await gitcodeHelper.getCommits({
      ...syncLocation,
      token,
    });

    return entries.map(({
      author,
      committer,
      commit,
      sha,
    }) => {
      const user = (author && (author.login || author.name) && author)
        || (committer && (committer.login || committer.name) && committer)
        || (commit && commit.author)
        || {};
      const userId = user.id || user.login || user.name || token.sub;
      const sub = `${gitcodeHelper.subPrefix}:${userId}`;
      userSvc.addUserInfo({
        id: sub,
        name: user.login || user.name || token.name,
        imageUrl: user.avatar_url || '',
      });
      const date = (commit && commit.author && commit.author.date)
        || (commit && commit.committer && commit.committer.date);
      return {
        id: sha,
        sub,
        message: commit && commit.message,
        created: date ? new Date(date).getTime() : 1,
      };
    });
  },
  async loadFileRevision() {
    return false;
  },
  async getFileRevisionContent({
    token,
    contentId,
    syncLocation,
    revisionId,
  }) {
    const { data } = await gitcodeHelper.downloadFile({
      ...syncLocation,
      token,
      branch: revisionId,
    });
    return Provider.parseContent(data, contentId);
  },
});
