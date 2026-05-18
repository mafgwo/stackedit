import MD5 from 'crypto-js/md5';
import localDbSvc from './localDbSvc';
import utils from './utils';
import store from '../store';

const isRemoteUri = uri => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(uri);

const getMimeFromPath = (path) => {
  const cleanPath = (path || '').split('?')[0].split('#')[0];
  const dotIdx = cleanPath.lastIndexOf('.');
  const suffix = dotIdx > -1 ? cleanPath.slice(dotIdx + 1).toLowerCase() : 'png';
  const normalizedSuffix = suffix === 'jpg' ? 'jpeg' : suffix;
  return `image/${normalizedSuffix || 'png'}`;
};

export default {
  isWorkspaceLocalUri(uri) {
    return !!uri && !isRemoteUri(uri);
  },
  getAbsolutePath(uri) {
    return utils.getAbsoluteFilePath(store.getters['explorer/selectedNodeFolder'], uri);
  },
  async getDataUrl(uriOrPath, isAbsolutePath = false) {
    if (!uriOrPath) {
      return '';
    }
    const path = isAbsolutePath ? uriOrPath : this.getAbsolutePath(uriOrPath);
    const imgItem = await localDbSvc.getImgItem(MD5(path).toString());
    if (!imgItem || !imgItem.content) {
      return '';
    }
    return `data:${getMimeFromPath(path)};base64,${imgItem.content}`;
  },
};
