import utils from '../../utils';
import networkSvc from '../../networkSvc';
import store from '../../../store';
import userSvc from '../../userSvc';
import badgeSvc from '../../badgeSvc';

const tokenExpirationMargin = 5 * 60 * 1000;

const apiBaseUrl = 'https://api.gitcode.com/api/v5';
const webBaseUrl = 'https://gitcode.com';
const appDataRepo = 'stackedit-app-data';
const subPrefix = 'gc';
const scopes = [
  'all_user',
  'all_repository',
];

const request = (token, options) => networkSvc.request({
  ...options,
  headers: {
    ...options.headers || {},
    Authorization: `Bearer ${token.accessToken}`,
  },
  params: {
    ...options.params || {},
    t: Date.now(),
  },
});

const repoRequest = (token, owner, repo, options) => request(token, {
  ...options,
  url: `${apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${options.url}`,
}).then(res => res.body);

const getCommitMessage = (name, path) => {
  const message = store.getters['data/computedSettings'].git[name];
  return message.replace(/{{path}}/g, path);
};

const getUserLogin = user => user.login || user.username || user.name || `${user.id}`;

userSvc.setInfoResolver('gitcode', subPrefix, async (sub) => {
  try {
    const user = (await networkSvc.request({
      url: `${apiBaseUrl}/users/${encodeURIComponent(sub)}`,
      params: {
        t: Date.now(),
      },
    })).body;

    return {
      id: `${subPrefix}:${getUserLogin(user)}`,
      name: getUserLogin(user),
      imageUrl: user.avatar_url || '',
    };
  } catch (err) {
    if (err.status !== 404) {
      throw new Error('RETRY');
    }
    throw err;
  }
});

export default {
  subPrefix,
  appDataRepo,
  webBaseUrl,

  async startOauth2(sub = null, silent = false, refreshToken = null, isMain = false) {
    await networkSvc.getServerConf();
    const clientId = store.getters['data/serverConf'].gitcodeClientId;
    if (!clientId) {
      throw new Error('GitCode OAuth2 未配置。');
    }

    let tokenBody;
    if (!silent) {
      const { code } = await networkSvc.startOauth2(
        `${webBaseUrl}/oauth/authorize`,
        {
          client_id: clientId,
          response_type: 'code',
          scope: scopes.join(' '),
        },
        false,
      );
      tokenBody = (await networkSvc.request({
        method: 'GET',
        url: 'oauth2/gitcodeToken',
        params: {
          code,
          grant_type: 'authorization_code',
        },
      })).body;
    } else {
      tokenBody = (await networkSvc.request({
        method: 'GET',
        url: 'oauth2/gitcodeToken',
        params: {
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        },
      })).body;
    }

    const accessToken = tokenBody.access_token;
    const user = (await networkSvc.request({
      method: 'GET',
      url: `${apiBaseUrl}/user`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        t: Date.now(),
      },
    })).body;
    const uniqueSub = getUserLogin(user);
    if (sub && uniqueSub !== sub) {
      throw new Error('GitCode account ID not expected.');
    }
    const existingToken = store.getters['data/gitcodeTokensBySub'][uniqueSub];
    const token = {
      accessToken,
      isLogin: !!isMain || (existingToken && !!existingToken.isLogin),
      refreshToken: tokenBody.refresh_token,
      expiresOn: Date.now() + ((tokenBody.expires_in || 1296000) * 1000),
      scopes: tokenBody.scope ? tokenBody.scope.split(' ') : scopes,
      name: getUserLogin(user),
      sub: uniqueSub,
    };
    userSvc.addUserInfo({
      id: `${subPrefix}:${uniqueSub}`,
      name: token.name,
      imageUrl: user.avatar_url || '',
    });
    if (isMain) {
      await this.checkAndCreateRepo(token);
    }
    store.dispatch('data/addGitcodeToken', token);
    return token;
  },

  async refreshToken(token) {
    const { sub } = token;
    const lastToken = store.getters['data/gitcodeTokensBySub'][sub];
    if (!lastToken || !lastToken.expiresOn || !lastToken.refreshToken) {
      await store.dispatch('modal/open', {
        type: 'providerRedirection',
        name: 'GitCode',
      });
      return this.startOauth2(sub, false, null, !!lastToken.isLogin);
    }
    if (lastToken.expiresOn > Date.now() + tokenExpirationMargin) {
      return lastToken;
    }
    try {
      return await this.startOauth2(sub, true, lastToken.refreshToken, !!lastToken.isLogin);
    } catch (err) {
      if (store.state.offline) {
        throw err;
      }
      await store.dispatch('modal/open', {
        type: 'providerRedirection',
        name: 'GitCode',
      });
      return this.startOauth2(sub, false, null, !!lastToken.isLogin);
    }
  },

  signin() {
    return this.startOauth2(null, false, null, true);
  },

  async addAccount() {
    const token = await this.startOauth2();
    badgeSvc.addBadge('addGitCodeAccount');
    return token;
  },

  async getTree({
    token,
    owner,
    repo,
    branch,
  }) {
    const refreshedToken = await this.refreshToken(token);
    const { tree, truncated } = await repoRequest(refreshedToken, owner, repo, {
      url: `git/trees/${encodeURIComponent(branch)}?recursive=1`,
    });
    if (truncated) {
      throw new Error('Git tree too big. Please remove some files in the repository.');
    }
    return tree;
  },

  async checkAndCreateRepo(token) {
    try {
      await request(token, {
        url: `${apiBaseUrl}/repos/${encodeURIComponent(token.name)}/${encodeURIComponent(appDataRepo)}`,
      });
    } catch (err) {
      if (err.status === 404) {
        await request(token, {
          method: 'POST',
          url: `${apiBaseUrl}/user/repos`,
          body: {
            name: appDataRepo,
            private: true,
            auto_init: true,
            default_branch: 'master',
          },
        });
      } else {
        throw err;
      }
    }
  },

  async getCommits({
    token,
    owner,
    repo,
    sha,
    path,
  }) {
    const refreshedToken = await this.refreshToken(token);
    return repoRequest(refreshedToken, owner, repo, {
      url: 'commits',
      params: { sha, path },
    });
  },

  async uploadFile({
    token,
    owner,
    repo,
    branch,
    path,
    content,
    sha,
    isImg,
    commitMessage,
  }) {
    const refreshedToken = await this.refreshToken(token);
    if (!path || path.endsWith('undefined')) {
      return { content: { sha: null } };
    }
    let uploadContent = content;
    if (isImg && typeof content !== 'string') {
      uploadContent = await utils.encodeFiletoBase64(content);
    }
    const res = await repoRequest(refreshedToken, owner, repo, {
      method: sha ? 'PUT' : 'POST',
      url: `contents/${encodeURIComponent(path)}`,
      body: {
        message: commitMessage || getCommitMessage(sha ? 'updateFileMessage' : 'createFileMessage', path),
        content: isImg ? uploadContent : utils.encodeBase64(content || ' '),
        sha,
        branch,
      },
    });
    const body = res || {};
    const contentSha = (
      (body.content && body.content.sha)
      || (body.file && body.file.sha)
      || body.sha
    );
    return {
      ...body,
      content: {
        ...(body.content || {}),
        sha: contentSha,
      },
    };
  },

  async removeFile({
    token,
    owner,
    repo,
    branch,
    path,
    sha,
  }) {
    const refreshedToken = await this.refreshToken(token);
    return repoRequest(refreshedToken, owner, repo, {
      method: 'DELETE',
      url: `contents/${encodeURIComponent(path)}`,
      body: {
        message: getCommitMessage('deleteFileMessage', path),
        sha,
        branch,
      },
    });
  },

  async downloadFile({
    token,
    owner,
    repo,
    branch,
    path,
    isImg,
  }) {
    const refreshedToken = await this.refreshToken(token);
    try {
      const { sha, content, encoding } = await repoRequest(refreshedToken, owner, repo, {
        url: `contents/${encodeURIComponent(path)}`,
        params: { ref: branch },
      });
      if (!sha) {
        return {};
      }
      let data = content;
      if (isImg && encoding === 'none') {
        const blobInfo = await repoRequest(refreshedToken, owner, repo, {
          url: `git/blobs/${sha}`,
        });
        data = blobInfo.content;
      }
      data = !isImg ? utils.decodeBase64(data) : data;
      return {
        sha,
        data: data === ' ' ? '' : data,
      };
    } catch (err) {
      if (err.status === 404 && path.indexOf('.stackedit-data') >= 0) {
        return {};
      }
      throw err;
    }
  },
};
