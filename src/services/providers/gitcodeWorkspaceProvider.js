import store from '../../store';
import gitcodeHelper from './helpers/gitcodeHelper';
import Provider from './common/Provider';
import utils from '../utils';
import userSvc from '../userSvc';
import gitWorkspaceSvc from '../gitWorkspaceSvc';
import badgeSvc from '../badgeSvc';

const getAbsolutePath = ({ id }) =>
  `${store.getters['workspace/currentWorkspace'].path || ''}${id}`;

export default new Provider({
  id: 'gitcodeWorkspace',
  name: 'GitCode',
  getToken() {
    return store.getters['workspace/syncToken'];
  },
  getWorkspaceParams({
    owner,
    repo,
    branch,
    path,
  }) {
    return {
      providerId: this.id,
      owner,
      repo,
      branch,
      path,
    };
  },
  getWorkspaceLocationUrl({
    owner,
    repo,
    branch,
    path,
  }) {
    return `${gitcodeHelper.webBaseUrl}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tree/${encodeURIComponent(branch)}/${utils.encodeUrlPath(path)}`;
  },
  getSyncDataUrl({ id }) {
    const { owner, repo, branch } = store.getters['workspace/currentWorkspace'];
    return `${gitcodeHelper.webBaseUrl}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tree/${encodeURIComponent(branch)}/${utils.encodeUrlPath(getAbsolutePath({ id }))}`;
  },
  getSyncDataDescription({ id }) {
    return getAbsolutePath({ id });
  },
  async initWorkspace() {
    const { owner, repo, branch } = utils.queryParams;
    const workspaceParams = this.getWorkspaceParams({ owner, repo, branch });
    if (!branch) {
      workspaceParams.branch = 'master';
    }

    const path = (utils.queryParams.path || '')
      .trim()
      .replace(/^\/*/, '')
      .replace(/\/*$/, '/');
    if (path !== '/') {
      workspaceParams.path = path;
    }

    const workspaceId = utils.makeWorkspaceId(workspaceParams);
    const workspace = store.getters['workspace/workspacesById'][workspaceId];
    let token;
    if (workspace) {
      token = store.getters['data/gitcodeTokensBySub'][workspace.sub];
    }
    if (!token) {
      await store.dispatch('modal/open', { type: 'gitcodeAccount' });
      token = await gitcodeHelper.addAccount();
    }

    if (!workspace) {
      const pathEntries = (path || '').split('/');
      const name = pathEntries[pathEntries.length - 2] || repo;
      store.dispatch('workspace/patchWorkspacesById', {
        [workspaceId]: {
          ...workspaceParams,
          id: workspaceId,
          sub: token.sub,
          name,
        },
      });
    }

    badgeSvc.addBadge('addGitCodeWorkspace');
    return store.getters['workspace/workspacesById'][workspaceId];
  },
  getChanges() {
    return gitcodeHelper.getTree({
      ...store.getters['workspace/currentWorkspace'],
      token: this.getToken(),
    });
  },
  prepareChanges(tree) {
    return gitWorkspaceSvc.makeChanges(tree);
  },
  async saveWorkspaceItem({ item }) {
    const syncData = {
      id: store.getters.gitPathsByItemId[item.id],
      type: item.type,
      hash: item.hash,
    };

    if (item.type === 'file' || item.type === 'folder') {
      return { syncData };
    }

    const syncToken = store.getters['workspace/syncToken'];
    await gitcodeHelper.uploadFile({
      ...store.getters['workspace/currentWorkspace'],
      token: syncToken,
      path: getAbsolutePath(syncData),
      content: '',
      sha: gitWorkspaceSvc.shaByPath[syncData.id],
      commitMessage: item.commitMessage,
    });

    return { syncData };
  },
  async removeWorkspaceItem({ syncData }) {
    if (gitWorkspaceSvc.shaByPath[syncData.id]) {
      const syncToken = store.getters['workspace/syncToken'];
      await gitcodeHelper.removeFile({
        ...store.getters['workspace/currentWorkspace'],
        token: syncToken,
        path: getAbsolutePath(syncData),
        sha: gitWorkspaceSvc.shaByPath[syncData.id],
      });
    }
  },
  async downloadWorkspaceContent({
    token,
    contentId,
    contentSyncData,
    fileSyncData,
  }) {
    const { sha, data } = await gitcodeHelper.downloadFile({
      ...store.getters['workspace/currentWorkspace'],
      token,
      path: getAbsolutePath(fileSyncData),
    });
    gitWorkspaceSvc.shaByPath[fileSyncData.id] = sha;
    const content = Provider.parseContent(data, contentId);
    return {
      content,
      contentSyncData: {
        ...contentSyncData,
        hash: content.hash,
        sha,
      },
    };
  },
  async downloadFile({ token, path }) {
    const { sha, data } = await gitcodeHelper.downloadFile({
      ...store.getters['workspace/currentWorkspace'],
      token,
      path,
      isImg: true,
    });
    return {
      content: data,
      sha,
    };
  },
  async downloadWorkspaceData({ token, syncData }) {
    if (!syncData) {
      return {};
    }

    const { sha, data } = await gitcodeHelper.downloadFile({
      ...store.getters['workspace/currentWorkspace'],
      token,
      path: getAbsolutePath(syncData),
    });
    gitWorkspaceSvc.shaByPath[syncData.id] = sha;
    const item = JSON.parse(data);
    return {
      item,
      syncData: {
        ...syncData,
        hash: item.hash,
        sha,
      },
    };
  },
  async uploadWorkspaceContent({
    token,
    content,
    file,
    commitMessage,
  }) {
    const isImg = file.type === 'img';
    const path = store.getters.gitPathsByItemId[file.id] || '';
    const absolutePath = !isImg ? `${store.getters['workspace/currentWorkspace'].path || ''}${path}` : file.path;
    const res = await gitcodeHelper.uploadFile({
      ...store.getters['workspace/currentWorkspace'],
      token,
      path: absolutePath,
      content: !isImg ? Provider.serializeContent(content) : file.content,
      sha: gitWorkspaceSvc.shaByPath[!isImg ? path : file.path],
      isImg,
      commitMessage,
    });

    if (isImg) {
      return {
        sha: res.content.sha,
      };
    }
    return {
      contentSyncData: {
        id: store.getters.gitPathsByItemId[content.id],
        type: content.type,
        hash: content.hash,
        sha: res.content.sha,
      },
      fileSyncData: {
        id: path,
        type: 'file',
        hash: file.hash,
      },
    };
  },
  async uploadWorkspaceData({ token, item }) {
    const path = store.getters.gitPathsByItemId[item.id];
    const syncData = {
      id: path,
      type: item.type,
      hash: item.hash,
    };
    const res = await gitcodeHelper.uploadFile({
      ...store.getters['workspace/currentWorkspace'],
      token,
      path: getAbsolutePath(syncData),
      content: JSON.stringify(item),
      sha: gitWorkspaceSvc.shaByPath[path],
    });

    return {
      syncData: {
        ...syncData,
        sha: res.content.sha,
      },
    };
  },
  async listFileRevisions({ token, fileSyncDataId }) {
    const { owner, repo, branch } = store.getters['workspace/currentWorkspace'];
    const entries = await gitcodeHelper.getCommits({
      token,
      owner,
      repo,
      sha: branch,
      path: getAbsolutePath({ id: fileSyncDataId }),
    });

    return entries.map(({ author, committer, commit, sha }) => {
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
    fileSyncDataId,
    revisionId,
  }) {
    const { data } = await gitcodeHelper.downloadFile({
      ...store.getters['workspace/currentWorkspace'],
      token,
      path: getAbsolutePath({ id: fileSyncDataId }),
      branch: revisionId,
    });
    return Provider.parseContent(data, contentId);
  },
});
