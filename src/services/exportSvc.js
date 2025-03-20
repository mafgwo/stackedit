import CryptoJS from 'crypto-js';
import FileSaver from 'file-saver';
import localDbSvc from './localDbSvc';
import markdownConversionSvc from './markdownConversionSvc';
import extensionSvc from './extensionSvc';
import utils from './utils';
import store from '../store';
import htmlSanitizer from '../libs/htmlSanitizer';
import TemplateWorker from './templateWorker.js?worker';

function groupHeadings(headings, level = 1) {
  const result = [];
  let currentItem;

  function pushCurrentItem() {
    if (currentItem) {
      if (currentItem.children.length > 0) {
        currentItem.children = groupHeadings(currentItem.children, level + 1);
      }
      result.push(currentItem);
    }
  }
  headings.forEach((heading) => {
    if (heading.level !== level) {
      currentItem = currentItem || {
        children: [],
      };
      currentItem.children.push(heading);
    } else {
      pushCurrentItem();
      currentItem = heading;
    }
  });
  pushCurrentItem();
  return result;
}

const getImgBase64 = async (uri) => {
  if (uri.indexOf('http://') !== 0 && uri.indexOf('https://') !== 0) {
    const currDirNode = store.getters['explorer/selectedNodeFolder'];
    const absoluteImgPath = utils.getAbsoluteFilePath(currDirNode, uri);
    const md5Id = CryptoJS.MD5(absoluteImgPath).toString();
    const imgItem = await localDbSvc.getImgItem(md5Id);
    if (imgItem) {
      const potIdx = uri.lastIndexOf('.');
      const suffix = potIdx > -1 ? uri.substring(potIdx + 1) : 'png';
      const mime = `image/${suffix}`;
      return `data:${mime};base64,${imgItem.content}`;
    }
    return '';
  }
  return uri;
};


const containerElt = document.createElement('div');
containerElt.className = 'hidden-rendering-container';
document.body.appendChild(containerElt);

export default {
  /**
   * Apply the template to the file content
   */
  async applyTemplate(fileId, template = {
    value: '{{{files.0.content.text}}}',
    helpers: '',
  }, pdf = false) {
    const file = store.state.file.itemsById[fileId];
    const content = await localDbSvc.loadItem(`${fileId}/content`);
    const properties = utils.computeProperties(content.properties);
    const options = extensionSvc.getOptions(properties);
    const converter = markdownConversionSvc.createConverter(options, true);
    const parsingCtx = markdownConversionSvc.parseSections(converter, content.text);
    const conversionCtx = markdownConversionSvc.convert(parsingCtx);
    const html = conversionCtx.htmlSectionList.map(htmlSanitizer.sanitizeHtml).join('');
    const colorThemeClass = `app--${store.getters['data/computedSettings'].colorTheme}`;
    const themeClass = `preview-theme--${store.state.theme.currPreviewTheme}`;
    let themeStyleContent = '';
    const themeStyleEle = document.getElementById(`preview-theme-${store.state.theme.currPreviewTheme}`);
    if (themeStyleEle) {
      themeStyleContent = themeStyleEle.innerText;
    }
    containerElt.innerHTML = html;
    await extensionSvc.sectionPreview(containerElt, options);

    // Unwrap tables
    containerElt.querySelectorAll('.table-wrapper').cl_each((wrapperElt) => {
      while (wrapperElt.firstChild) {
        wrapperElt.parentNode.insertBefore(wrapperElt.firstChild, wrapperElt.nextSibling);
      }
      wrapperElt.parentNode.removeChild(wrapperElt);
    });

    // 替换相对路径图片为blob图片
    const imgs = Array.prototype.slice.call(containerElt.getElementsByTagName('img')).map((imgElt) => {
      let uri = imgElt.attributes && imgElt.attributes.src && imgElt.attributes.src.nodeValue;
      if (uri && uri.indexOf('http://') !== 0 && uri.indexOf('https://') !== 0) {
        uri = decodeURIComponent(uri);
        imgElt.removeAttribute('src');
        return { imgElt, uri };
      }
      return { imgElt };
    });
    const loadedPromises = imgs.map(it => new Promise((resolve, reject) => {
      if (!it.imgElt.src && it.uri) {
        getImgBase64(it.uri).then((newUrl) => {
          it.imgElt.src = newUrl;
          resolve();
        }, () => reject(new Error('加载当前空间图片出错')));
        return;
      }
      resolve();
    }));
    await Promise.all(loadedPromises);

    // Make TOC
    const allHeaders = containerElt.querySelectorAll('h1,h2,h3,h4,h5,h6');
    Array.prototype.slice.call(allHeaders).forEach((headingElt) => {
      // 创建一个新的 <span> 元素
      const contentElt = document.createElement('span');
      contentElt.className = 'content';
      // 将原始内容移动到新的 <span> 元素中
      while (headingElt.firstChild) {
        contentElt.appendChild(headingElt.firstChild);
      }
      const prefixElt = document.createElement('span');
      prefixElt.className = 'prefix';
      headingElt.insertBefore(prefixElt, headingElt.firstChild);
      // 将新的 <span> 元素替换原始元素
      headingElt.appendChild(contentElt);
      const suffixElt = document.createElement('span');
      suffixElt.className = 'suffix';
      headingElt.appendChild(suffixElt);
    });
    const headings = allHeaders.cl_map(headingElt => ({
      title: headingElt.textContent,
      anchor: headingElt.id,
      level: parseInt(headingElt.tagName.slice(1), 10),
      children: [],
    }));
    const toc = groupHeadings(headings);
    const view = {
      pdf,
      files: [{
        name: file.name,
        content: {
          text: content.text,
          properties,
          yamlProperties: content.properties,
          html: containerElt.innerHTML,
          toc,
          colorThemeClass,
          themeClass,
          themeStyleContent,
        },
      }],
    };
    containerElt.innerHTML = '';

    // Run template conversion in a Worker to prevent attacks from helpers
    const worker = new TemplateWorker();
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        worker.terminate();
        reject(new Error('Template generation timeout.'));
      }, 10000);
      worker.addEventListener('message', (e) => {
        try {
          clearTimeout(timeoutId);
          worker.terminate();
          // e.data can contain unsafe data if helpers attempts to call postMessage
          const [err, result] = e.data;
          if (err) {
            reject(new Error(`${err}`));
          } else {
            resolve(`${result}`);
          }
        } catch (error) {
          console.log('event-listener...');
          console.log(error);
        }
      });
      worker.postMessage([template.value, view, template.helpers]);
    });
  },

  /**
   * Export a file to disk.
   */
  async exportToDisk(fileId, type, template) {
    const file = store.state.file.itemsById[fileId];
    const html = await this.applyTemplate(fileId, template);
    const blob = new Blob([html], {
      type: 'text/plain;charset=utf-8',
    });
    FileSaver.saveAs(blob, `${file.name}.${type}`);
  },
};
