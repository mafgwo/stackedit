import CryptoJS from 'crypto-js';
import store from '../store';
import utils from './utils';
import localDbSvc from './localDbSvc';
import smmsHelper from '../services/providers/helpers/smmsHelper';
import giteaHelper from '../services/providers/helpers/giteaHelper';
import githubHelper from '../services/providers/helpers/githubHelper';
import customHelper from '../services/providers/helpers/customHelper';

const getImagePath = (confPath, imgType) => {
  const time = new Date();
  const date = time.getDate();
  const month = time.getMonth() + 1;
  const year = time.getFullYear();
  const path = confPath.replace('{YYYY}', year).replace('{MM}', `0${month}`.slice(-2))
    .replace('{DD}', `0${date}`.slice(-2)).replace('{MDNAME}', store.getters['file/current'].name);
  return `${path}${path.endsWith('/') ? '' : '/'}${utils.uid()}.${imgType.split('/')[1]}`;
};

export default {
  // 上传图片 返回图片链接
  // { url: 'http://xxxx', error: 'xxxxxx'}
  async updateImg(imgFile) {
    // 操作图片上传
    const currStorage = store.getters['img/getCheckedStorage'];
    if (!currStorage) {
      return { error: '暂无已选择的图床！' };
    }
    // 判断是否文档空间路径
    if (currStorage.type === 'workspace') {
      // 如果不是git仓库 则提示不支持
      if (!store.getters['workspace/currentWorkspaceIsGit']) {
        return { error: '暂无已选择的图床！' };
      }
      const path = getImagePath(currStorage.sub, imgFile.type);
      // 保存到indexeddb
      const base64 = await utils.encodeFiletoBase64(imgFile);
      const currDirNode = store.getters['explorer/selectedNodeFolder'];
      const absolutePath = utils.getAbsoluteFilePath(currDirNode, path);
      await localDbSvc.saveImg({
        id: CryptoJS.MD5(absolutePath).toString(),
        path: absolutePath,
        content: base64,
      });
      return { url: path.replaceAll(' ', '%20') };
    }
    if (!currStorage.provider) {
      return { error: '暂无已选择的图床！' };
    }
    const token = store.getters[`data/${currStorage.provider}TokensBySub`][currStorage.sub];
    if (!token) {
      return { error: '暂无已选择的图床！' };
    }
    let url = '';
    // token图床类型
    if (currStorage.type === 'token') {
      const helper = currStorage.provider === 'smms' ? smmsHelper : customHelper;
      url = await helper.uploadFile({
        token,
        file: imgFile,
      });
    } else if (currStorage.type === 'tokenRepo') { // git repo图床类型
      const checkStorages = token.imgStorages.filter(it => it.sid === currStorage.sid);
      if (!checkStorages || checkStorages.length === 0) {
        return { error: '暂无已选择的图床！' };
      }
      const checkStorage = checkStorages[0];
      const path = getImagePath(checkStorage.path, imgFile.type);
      if (currStorage.provider === 'gitea') {
        const result = await giteaHelper.uploadFile({
          token,
          projectId: checkStorage.repoUri,
          branch: checkStorage.branch,
          path,
          content: imgFile,
          isImg: true,
        });
        url = result.content.download_url;
      } else if (currStorage.provider === 'github') {
        const result = await githubHelper.uploadFile({
          token,
          owner: checkStorage.owner,
          repo: checkStorage.repo,
          branch: checkStorage.branch,
          path,
          content: imgFile,
          isImg: true,
        });
        url = result.content.download_url;
      }
    }
    return { url };
  },
};
