import store from '../../store';
import giteeHelper from './helpers/giteeHelper';
import Provider from './common/Provider';
import utils from '../utils';
import userSvc from '../userSvc';

export default new Provider({
  id: 'giteegist',
  name: 'GiteeGist',
  getToken({ sub }) {
    return store.getters['data/giteeTokensBySub'][sub];
  },
  getLocationUrl({ gistId }) {
    return `https://gitee.com/mafgwo/codes/${gistId}`;
  },
  getLocationDescription({ filename }) {
    return filename;
  },
  async downloadContent(token, syncLocation) {
    const content = await giteeHelper.downloadGist({
      ...syncLocation,
      token,
    });
    return Provider.parseContent(content, `${syncLocation.fileId}/content`);
  },
  async uploadContent(token, content, syncLocation) {
    const file = store.state.file.itemsById[syncLocation.fileId];
    const description = utils.sanitizeName(file && file.name);
    const gist = await giteeHelper.uploadGist({
      ...syncLocation,
      token,
      description,
      content: Provider.serializeContent(content),
    });
    return {
      ...syncLocation,
      gistId: gist.id,
    };
  },
  async publish(token, html, metadata, publishLocation) {
    const gist = await giteeHelper.uploadGist({
      ...publishLocation,
      token,
      description: metadata.title,
      content: html,
    });
    return {
      ...publishLocation,
      gistId: gist.id,
    };
  },
  makeLocation(token, filename, isPublic, gistId) {
    return {
      providerId: this.id,
      sub: token.sub,
      filename,
      isPublic,
      gistId,
    };
  },
  async listFileRevisions({ token, syncLocation }) {
    const entries = await giteeHelper.getGistCommits({
      ...syncLocation,
      token,
    });

    return entries.map((entry) => {
      const sub = `${giteeHelper.subPrefix}:${entry.user.id}`;
      userSvc.addUserInfo({ id: sub, name: entry.user.login, imageUrl: entry.user.avatar_url });
      return {
        sub,
        id: entry.version,
        message: entry.commit && entry.commit.message,
        created: new Date(entry.committed_at).getTime(),
      };
    });
  },
  async loadFileRevision() {
    // Revision are already loaded
    return false;
  },
  // async getFileRevisionContent({
  //   token,
  //   contentId,
  //   syncLocation,
  //   revisionId,
  // }) {
  //   const data = await giteeHelper.downloadGistRevision({
  //     ...syncLocation,
  //     token,
  //     sha: revisionId,
  //   });
  //   return Provider.parseContent(data, contentId);
  // },
});
