import Prism from 'prismjs';
import prismComponents from 'prismjs/components.js';
import getLoader from 'prismjs/dependencies.js';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-handlebars';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-shell-session';
import 'prismjs/components/prism-typescript';

const escapeHtml = (value = '') => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const prismComponentBase = '/prism-components';
const listeners = new Set();
const loadingMap = new Map();
const fencedCodeLinePattern = /^(```+|~~~+)([^\n]*)$/gm;
const prismLanguageEntries = prismComponents.languages;
const prismLanguageIds = Object.keys(prismLanguageEntries).filter(id => id !== 'meta');
const prismLanguageIdSet = new Set(prismLanguageIds);

if (typeof window !== 'undefined') {
  window.Prism = Prism;
}

const extraLanguageAliases = {
  'c#': 'csharp',
  'c++': 'cpp',
  conf: 'ini',
  config: 'ini',
  console: 'shell-session',
  env: 'ini',
  'f#': 'fsharp',
  golang: 'go',
  gql: 'graphql',
  htm: 'markup',
  json: 'json',
  'objective-c': 'objectivec',
  'objective-cpp': 'objectivec',
  'objective-c++': 'objectivec',
  'plain-text': 'plain',
  plaintext: 'plain',
  ps: 'powershell',
  ps1: 'powershell',
  psm1: 'powershell',
  rs: 'rust',
  'shell-session': 'shell-session',
  shellscript: 'bash',
  text: 'plain',
  zsh: 'bash',
};

const prismLanguageAliases = (() => {
  const aliasMap = Object.create(null);
  prismLanguageIds.forEach((id) => {
    const entry = prismLanguageEntries[id];
    const aliases = Array.isArray(entry.alias)
      ? entry.alias
      : entry.alias
        ? [entry.alias]
        : [];
    aliases.forEach((alias) => {
      aliasMap[alias.toLowerCase()] = id;
    });
  });
  Object.entries(extraLanguageAliases).forEach(([alias, id]) => {
    aliasMap[alias] = id;
  });
  return aliasMap;
})();

const normalizeLanguage = (language = '') => language
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '-');

const resolveLanguage = (language = '') => {
  const normalizedLanguage = normalizeLanguage(language);
  if (!normalizedLanguage) {
    return '';
  }
  if (prismLanguageIdSet.has(normalizedLanguage)) {
    return normalizedLanguage;
  }
  return prismLanguageAliases[normalizedLanguage] || normalizedLanguage;
};

const parseFenceLanguage = (infoString = '') => {
  const trimmedInfoString = infoString.trim();
  if (!trimmedInfoString) {
    return '';
  }
  if (trimmedInfoString[0] !== '{') {
    return trimmedInfoString
      .split(/\s+/, 1)[0]
      .replace(/^language-/, '')
      .replace(/^[.]/, '');
  }
  const classMatch = trimmedInfoString.match(/(?:^|\s)\.([^\s}.]+)/);
  return classMatch ? classMatch[1] : '';
};

const loadScript = (language) => {
  if (typeof document === 'undefined') {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `${prismComponentBase}/prism-${language}.min.js`;
    script.onload = () => resolve(true);
    script.onerror = () => {
      script.remove();
      resolve(false);
    };
    document.head.appendChild(script);
  });
};

const emitLoaded = (language) => {
  listeners.forEach((listener) => {
    try {
      listener(language);
    } catch (error) {
      // Ignore listener errors so language loading does not break highlighting.
    }
  });
};

const extractElementLanguage = (element) => {
  const className = Array.from(element.classList || [])
    .find(item => item.startsWith('language-'));
  return className ? className.slice('language-'.length) : '';
};

export const onPrismLanguageLoaded = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const ensurePrismLanguage = async (language) => {
  const resolvedLanguage = resolveLanguage(language);
  if (!resolvedLanguage || Prism.languages[resolvedLanguage]) {
    return !!resolvedLanguage;
  }
  if (loadingMap.has(resolvedLanguage)) {
    return loadingMap.get(resolvedLanguage);
  }
  const task = (async () => {
    if (!prismLanguageIdSet.has(resolvedLanguage)) {
      return false;
    }
    const loadOrder = [];
    getLoader(
      prismComponents,
      [resolvedLanguage],
      Object.keys(Prism.languages),
    ).load(id => loadOrder.push(id));
    for (const languageId of loadOrder) {
      if (Prism.languages[languageId]) {
        continue;
      }
      const loaded = await loadScript(languageId);
      if (loaded && Prism.languages[languageId]) {
        emitLoaded(languageId);
        continue;
      }
      return false;
    }
    return !!Prism.languages[resolvedLanguage];
  })();
  loadingMap.set(resolvedLanguage, task);
  try {
    return await task;
  } finally {
    loadingMap.delete(resolvedLanguage);
  }
};

export const ensurePrismLanguagesInMarkdown = (text = '') => {
  const languages = new Set();
  text.replace(fencedCodeLinePattern, (match, fence, infoString) => {
    const language = parseFenceLanguage(infoString);
    if (language) {
      languages.add(language);
    }
    return match;
  });
  languages.forEach(language => ensurePrismLanguage(language));
};

export const getPrismGrammar = language => Prism.languages[resolveLanguage(language)];

export const safeHighlight = (text = '', grammar, language) => {
  if (!grammar) {
    ensurePrismLanguage(language);
    return escapeHtml(text);
  }
  try {
    return Prism.highlight(text, grammar, resolveLanguage(language));
  } catch (error) {
    return escapeHtml(text);
  }
};

export const safeHighlightElement = (element) => {
  try {
    const language = extractElementLanguage(element);
    const resolvedLanguage = resolveLanguage(language);
    const grammar = getPrismGrammar(language);
    if (!grammar) {
      ensurePrismLanguage(language).then((loaded) => {
        if (loaded && element.isConnected) {
          safeHighlightElement(element);
        }
      });
      return;
    }
    if (resolvedLanguage && resolvedLanguage !== language) {
      element.classList.remove(`language-${language}`);
      element.classList.add(`language-${resolvedLanguage}`);
      const parent = element.parentElement;
      if (parent?.classList.contains(`language-${language}`)) {
        parent.classList.remove(`language-${language}`);
        parent.classList.add(`language-${resolvedLanguage}`);
      }
    }
    Prism.highlightElement(element);
  } catch (error) {
    element.textContent = element.textContent || '';
  }
};

export default Prism;
