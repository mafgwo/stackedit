import Mousetrap from 'mousetrap';
import store from '../../store';
import editorSvc from '../../services/editorSvc';
import syncSvc from '../../services/syncSvc';

// Skip shortcuts if modal is open
Mousetrap.prototype.stopCallback = () => store.getters['modal/config'];

const pagedownHandler = name => () => {
  editorSvc.pagedownEditor.uiManager.doClick(name);
  return true;
};

const findReplaceOpener = type => () => {
  store.dispatch('findReplace/open', {
    type,
    findText: editorSvc.clEditor.selectionMgr.hasFocus() &&
      editorSvc.clEditor.selectionMgr.getSelectedText(),
  });
  return true;
};

const toggleEditor = () => () => {
  store.dispatch('data/toggleEditor', !store.getters['data/layoutSettings'].showEditor);
  return true;
};

// 非编辑模式下支持的快捷键
const noEditableShortcutMethods = ['toggleeditor'];

const methods = {
  bold: pagedownHandler('bold'),
  italic: pagedownHandler('italic'),
  strikethrough: pagedownHandler('strikethrough'),
  link: pagedownHandler('link'),
  quote: pagedownHandler('quote'),
  code: pagedownHandler('code'),
  image: pagedownHandler('image'),
  chatgpt: pagedownHandler('chatgpt'),
  olist: pagedownHandler('olist'),
  ulist: pagedownHandler('ulist'),
  clist: pagedownHandler('clist'),
  heading: pagedownHandler('heading'),
  inline: pagedownHandler('heading'),
  hr: pagedownHandler('hr'),
  inlineformula: pagedownHandler('inlineformula'),
  toggleeditor: toggleEditor(),
  sync() {
    if (syncSvc.isSyncPossible()) {
      syncSvc.requestSync();
    }
    return true;
  },
  find: findReplaceOpener('find'),
  replace: findReplaceOpener('replace'),
  expand(param1, param2) {
    const text = `${param1 || ''}`;
    const replacement = `${param2 || ''}`;
    if (text && replacement) {
      setTimeout(() => {
        const { selectionMgr } = editorSvc.clEditor;
        let offset = selectionMgr.selectionStart;
        if (offset === selectionMgr.selectionEnd) {
          const range = selectionMgr.createRange(offset - text.length, offset);
          if (`${range}` === text) {
            range.deleteContents();
            range.insertNode(document.createTextNode(replacement));
            offset = (offset - text.length) + replacement.length;
            selectionMgr.setSelectionStartEnd(offset, offset);
            selectionMgr.updateCursorCoordinates(true);
          }
        }
      }, 1);
    }
  },
};

store.watch(
  () => ({
    computedSettings: store.getters['data/computedSettings'],
    isCurrentEditable: store.getters['content/isCurrentEditable'],
  }),
  ({ computedSettings, isCurrentEditable }) => {
    Mousetrap.reset();

    Object.entries(computedSettings.shortcuts).forEach(([key, shortcut]) => {
      if (shortcut) {
        const method = `${shortcut.method || shortcut}`;
        let params = shortcut.params || [];
        if (!Array.isArray(params)) {
          params = [params];
        }
        if (Object.prototype.hasOwnProperty.call(methods, method)) {
          try {
            // editor is editable or 一些非编辑模式下支持的快捷键
            if (isCurrentEditable || noEditableShortcutMethods.indexOf(method) !== -1) {
              Mousetrap.bind(`${key}`, () => !methods[method].apply(null, params));
            }
          } catch (e) {
            // Ignore
          }
        }
      }
    });
  },
  {
    immediate: true,
  },
);
