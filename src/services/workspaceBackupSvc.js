import MD5 from 'crypto-js/md5';
import localDbSvc from './localDbSvc';
import providerRegistry from './providers/common/providerRegistry';
import store from '../store';
import utils from './utils';
import zipSvc from './zipSvc';

const imgWaitUploadIdsKey = 'waitUploadImgIds';
const localUriMatcher = /!\[[^\]]*]\(([^)]*?)(?:\s+["'][^"']*["'])?\)|<img\b[^>]*\ssrc=(["'])(.*?)\2/ig;
const referenceDefinitionMatcher = /^\s*\[([^\]]+)]:\s*(\S+)/gm;
const referenceImageMatcher = /!\[[^\]]*]\[([^\]]*)]/g;

const isRemoteUri = uri => /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(uri);

const getImageExtension = (path) => {
  const cleanPath = (path || '').split('?')[0].split('#')[0];
  const dotIdx = cleanPath.lastIndexOf('.');
  const ext = dotIdx > -1 ? cleanPath.slice(dotIdx + 1).toLowerCase() : 'png';
  return ext.replace(/[^a-z0-9]/g, '') || 'png';
};

const getItemPath = (itemsById, itemId) => {
  const item = itemsById[itemId];
  if (!item || itemId === 'trash') {
    return itemId === 'trash' ? '.stackedit-trash/' : '';
  }
  const parentPath = item.parentId ? getItemPath(itemsById, item.parentId) : '';
  if (item.type === 'folder') {
    return `${parentPath}${item.name}/`;
  }
  return `${parentPath}${item.name}`;
};

const getFileDirPath = (itemsById, fileId) => {
  const file = itemsById[fileId];
  if (!file || !file.parentId) {
    return '/';
  }
  const parentPath = getItemPath(itemsById, file.parentId);
  return `/${parentPath}`.replace(/\/+/g, '/');
};

const getAbsoluteImagePath = (dirPath, uri) => {
  const decodedUri = decodeURIComponent(uri).replaceAll('\\', '/');
  if (decodedUri.startsWith('/')) {
    return decodedUri;
  }
  const parts = `${dirPath.replace(/\/?$/, '/')}${decodedUri}`.split('/');
  const normalizedParts = [];
  parts.forEach((part) => {
    if (!part || part === '.') {
      return;
    }
    if (part === '..') {
      normalizedParts.pop();
      return;
    }
    normalizedParts.push(part);
  });
  return `/${normalizedParts.join('/')}`;
};

const normalizeAbsolutePath = path => decodeURIComponent(path).replaceAll(' ', '%20');

const getWorkspaceRemotePath = absolutePath =>
  absolutePath.replace(/^\//, '').replaceAll('%20', ' ');

const collectImageUris = (text) => {
  const refs = Object.create(null);
  const uris = [];
  let match;

  while ((match = referenceDefinitionMatcher.exec(text))) {
    refs[match[1].toLowerCase()] = match[2];
  }
  while ((match = localUriMatcher.exec(text))) {
    uris.push(match[1] || match[3]);
  }
  while ((match = referenceImageMatcher.exec(text))) {
    const ref = match[1].toLowerCase();
    if (refs[ref]) {
      uris.push(refs[ref]);
    }
  }

  return uris
    .map(uri => uri && uri.trim().replace(/^<|>$/g, ''))
    .filter(uri => uri && !isRemoteUri(uri));
};

const base64ToBytes = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const bytesToBase64 = (bytes) => {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
};

const getWorkspaceItems = workspaceId => new Promise((resolve) => {
  const itemsById = {};
  localDbSvc.getWorkspaceItems(workspaceId, (item) => {
    itemsById[item.id] = item;
  }, () => resolve(itemsById));
});

const getImgItem = async (absolutePath) => {
  const id = MD5(absolutePath).toString();
  const item = await localDbSvc.getImgItem(id);
  return item && item.content ? item : null;
};

const downloadImgItem = async (absolutePath) => {
  const provider = providerRegistry.providersById[store.getters['workspace/currentWorkspace'].providerId];
  const token = provider && provider.getToken && provider.getToken();
  if (!provider || !provider.downloadFile || !token) {
    return null;
  }
  const { content, sha } = await provider.downloadFile({
    token,
    path: getWorkspaceRemotePath(absolutePath),
  });
  if (!content) {
    return null;
  }
  const item = {
    id: MD5(absolutePath).toString(),
    path: absolutePath,
    content,
    uploaded: 1,
    sha,
  };
  await localDbSvc.saveImg(item);
  return item;
};

const collectReferencedImages = async (itemsById) => {
  const imagesByPath = {};
  await utils.awaitSequence(
    Object.values(itemsById).filter(item => item && item.type === 'content' && item.text),
    async (contentItem) => {
      const [fileId] = contentItem.id.split('/');
      const dirPath = getFileDirPath(itemsById, fileId);
      collectImageUris(contentItem.text).forEach((uri) => {
        const path = normalizeAbsolutePath(getAbsoluteImagePath(dirPath, uri));
        imagesByPath[path] = {
          path,
          uri,
          fileId,
          fileName: itemsById[fileId] && itemsById[fileId].name,
        };
      });
    },
  );
  return Object.values(imagesByPath);
};

const buildWorkspaceJsonBlob = itemsById => new Blob([JSON.stringify(itemsById)], {
  type: 'text/plain;charset=utf-8',
});

const textFromZipFile = (files, name) => {
  const content = files[name];
  return content && new TextDecoder().decode(content);
};

const buildZipBlob = async (itemsById) => {
  const files = [{
    name: 'workspace.json',
    content: JSON.stringify(itemsById, null, 2),
  }];
  const images = [];
  const missingImages = [];
  const referencedImages = await collectReferencedImages(itemsById);

  await utils.awaitSequence(referencedImages, async (image) => {
    let item = await getImgItem(image.path);
    let source = 'indexeddb';
    if (!item) {
      try {
        item = await downloadImgItem(image.path);
        source = 'remote';
      } catch (err) {
        item = null;
      }
    }
    if (!item) {
      missingImages.push(image);
      return;
    }

    const extension = getImageExtension(image.path);
    const filename = `images/${item.id}.${extension}`;
    files.push({
      name: filename,
      content: base64ToBytes(item.content),
    });
    images.push({
      id: item.id,
      path: image.path,
      file: filename,
      source,
      uploaded: item.uploaded,
      sha: item.sha,
    });
  });

  files.push({
    name: 'images.json',
    content: JSON.stringify(images, null, 2),
  });
  if (missingImages.length) {
    files.push({
      name: 'missing-images.json',
      content: JSON.stringify(missingImages, null, 2),
    });
  }

  return {
    blob: zipSvc.create(files),
    imageCount: images.length,
    missingCount: missingImages.length,
  };
};

export default {
  async exportWorkspace({ workspaceId, includeImages }) {
    const itemsById = await getWorkspaceItems(workspaceId);
    Object.keys(itemsById).forEach((id) => {
      if (id === imgWaitUploadIdsKey) {
        delete itemsById[id];
      }
    });
    if (!includeImages) {
      return {
        blob: buildWorkspaceJsonBlob(itemsById),
        filename: 'StackEdit workspace.json',
        missingCount: 0,
      };
    }

    const result = await buildZipBlob(itemsById);
    return {
      ...result,
      filename: 'StackEdit workspace.zip',
    };
  },
  async importZip(file) {
    const files = await zipSvc.read(file);
    const workspaceJson = textFromZipFile(files, 'workspace.json');
    if (!workspaceJson) {
      throw new Error('ZIP备份中缺少 workspace.json。');
    }

    const images = JSON.parse(textFromZipFile(files, 'images.json') || '[]');
    let importedImageCount = 0;
    const missingImageFiles = [];

    await utils.awaitSequence(images, async (image) => {
      const imageFile = image.file && files[image.file];
      if (!imageFile) {
        missingImageFiles.push(image);
        return;
      }
      const path = normalizeAbsolutePath(image.path);
      await localDbSvc.saveImg({
        id: image.id || MD5(path).toString(),
        path,
        content: bytesToBase64(imageFile),
        uploaded: image.uploaded,
        sha: image.sha,
      });
      importedImageCount += 1;
    });

    return {
      workspaceJson,
      importedImageCount,
      missingImageFileCount: missingImageFiles.length,
    };
  },
};
