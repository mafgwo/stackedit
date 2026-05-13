import Prism from 'prismjs';
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

if (typeof window !== 'undefined') {
  window.Prism = Prism;
}

const prismLanguageAliases = {
  'c#': 'csharp',
  'c++': 'cpp',
  conf: 'ini',
  config: 'ini',
  console: 'shell-session',
  dockerfile: 'docker',
  env: 'ini',
  'f#': 'fsharp',
  golang: 'go',
  gql: 'graphql',
  hbs: 'handlebars',
  htm: 'markup',
  html: 'markup',
  js: 'javascript',
  json: 'json',
  kt: 'kotlin',
  kts: 'kotlin',
  md: 'markdown',
  mustache: 'handlebars',
  objc: 'objectivec',
  'objective-c': 'objectivec',
  'objective-cpp': 'objectivec',
  'objective-c++': 'objectivec',
  'plain-text': 'plain',
  plaintext: 'plain',
  ps: 'powershell',
  ps1: 'powershell',
  psm1: 'powershell',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  shell: 'bash',
  'shell-session': 'shell-session',
  shellscript: 'bash',
  shellsession: 'shell-session',
  sh: 'bash',
  'sh-session': 'shell-session',
  svg: 'markup',
  text: 'plain',
  ts: 'typescript',
  xml: 'markup',
  yml: 'yaml',
  zsh: 'bash',
};

const prismLanguageDeps = {
  c: [],
  cpp: ['c'],
  csharp: [],
  dart: [],
  diff: [],
  docker: [],
  fsharp: [],
  git: [],
  go: [],
  graphql: [],
  ini: [],
  java: [],
  jsx: ['javascript'],
  kotlin: [],
  less: ['css'],
  lua: [],
  markdown: ['markup', 'yaml'],
  nginx: [],
  objectivec: ['c'],
  perl: [],
  php: ['markup-templating'],
  powershell: [],
  python: [],
  r: [],
  ruby: [],
  rust: [],
  scala: ['java'],
  scss: ['css'],
  'shell-session': ['bash'],
  sql: [],
  swift: [],
  toml: [],
  typescript: ['javascript'],
  tsx: ['jsx', 'typescript'],
  zig: [],
};

const normalizeLanguage = (language = '') => language
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '-');

const resolveLanguage = (language = '') => {
  const normalizedLanguage = normalizeLanguage(language);
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
    const dependencies = prismLanguageDeps[resolvedLanguage];
    if (dependencies === undefined) {
      return false;
    }
    for (const dependency of dependencies) {
      await ensurePrismLanguage(dependency);
    }
    const loaded = await loadScript(resolvedLanguage);
    if (loaded && Prism.languages[resolvedLanguage]) {
      emitLoaded(resolvedLanguage);
      return true;
    }
    return false;
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
    const grammar = getPrismGrammar(language);
    if (!grammar) {
      ensurePrismLanguage(language).then((loaded) => {
        if (loaded && element.isConnected) {
          safeHighlightElement(element);
        }
      });
      return;
    }
    Prism.highlightElement(element);
  } catch (error) {
    element.textContent = element.textContent || '';
  }
};

export default Prism;
