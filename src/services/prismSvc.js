import Prism from 'prismjs';
import prismComponents from 'prismjs/components.js';
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

const getMarkupGrammar = () => Prism.languages.markup
  || Prism.languages.html
  || Prism.languages.xml;

const extractElementLanguage = (element) => {
  const className = Array.from(element.classList || [])
    .find(item => item.startsWith('language-'));
  return className ? className.slice('language-'.length) : '';
};

export const getPrismGrammar = (language) => {
  const resolvedLanguage = resolveLanguage(language);
  const grammar = Prism.languages[resolvedLanguage];
  if (grammar) {
    return grammar;
  }
  if (resolvedLanguage && prismLanguageIdSet.has(resolvedLanguage)) {
    return getMarkupGrammar();
  }
  return undefined;
};

export const safeHighlight = (text = '', grammar, language) => {
  const effectiveGrammar = grammar || getPrismGrammar(language);
  if (!effectiveGrammar) {
    return escapeHtml(text);
  }
  try {
    const grammarLanguage = effectiveGrammar === getMarkupGrammar()
      ? 'markup'
      : resolveLanguage(language) || 'markup';
    return Prism.highlight(text, effectiveGrammar, grammarLanguage);
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
      return;
    }
    const highlightLanguage = grammar === getMarkupGrammar()
      ? 'markup'
      : resolvedLanguage;
    if (highlightLanguage && highlightLanguage !== language) {
      element.classList.remove(`language-${language}`);
      element.classList.add(`language-${highlightLanguage}`);
      const parent = element.parentElement;
      if (parent?.classList.contains(`language-${language}`)) {
        parent.classList.remove(`language-${language}`);
        parent.classList.add(`language-${highlightLanguage}`);
      }
    }
    element.innerHTML = safeHighlight(element.textContent || '', grammar, highlightLanguage);
  } catch (error) {
    element.textContent = element.textContent || '';
  }
};

export default Prism;
