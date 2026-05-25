const imageMimeByExt = {
  apng: 'image/apng',
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  webp: 'image/webp',
};

const imageExtByMime = {
  'image/apng': 'apng',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/tiff': 'tiff',
  'image/webp': 'webp',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
};

const getImageExtFromPath = (path) => {
  const cleanPath = (path || '').split('?')[0].split('#')[0];
  const fileName = cleanPath.split('/').pop() || '';
  const dotIdx = fileName.lastIndexOf('.');
  return dotIdx > -1 ? fileName.slice(dotIdx + 1).toLowerCase() : '';
};

const getImageExtFromMime = type => imageExtByMime[(type || '').toLowerCase()] || '';

export const getImageExt = (fileOrPath, fallbackExt = 'png') => {
  if (typeof fileOrPath === 'string') {
    return getImageExtFromMime(fileOrPath) || getImageExtFromPath(fileOrPath) || fallbackExt;
  }
  return getImageExtFromMime(fileOrPath && fileOrPath.type)
    || getImageExtFromPath(fileOrPath && fileOrPath.name)
    || fallbackExt;
};

export const getImageMime = (fileOrPath, fallbackMime = 'image/png') => {
  if (fileOrPath && typeof fileOrPath !== 'string' && fileOrPath.type) {
    return fileOrPath.type;
  }
  const ext = getImageExt(fileOrPath, '');
  return imageMimeByExt[ext] || fallbackMime;
};
