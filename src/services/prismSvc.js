import Prism from 'prismjs';
import prismComponents from 'prismjs/components.js';
import 'prismjs/plugins/autoloader/prism-autoloader';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-handlebars';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-shell-session';

const configurePrismAutoloader = () => {
  const autoloader = Prism.plugins?.autoloader;
  if (autoloader) {
    autoloader.languages_path = '/prism-components/';
    autoloader.use_minified = true;
  }
};

const escapeHtml = (value = '') => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const prismLanguageEntries = prismComponents.languages;
const prismLanguageIds = Object.keys(prismLanguageEntries).filter(id => id !== 'meta');
const prismLanguageIdSet = new Set(prismLanguageIds);
const skipDomHighlightLanguages = new Set(['mermaid']);
const languageLoadedListeners = [];
const languageLoadPromises = Object.create(null);

if (typeof window !== 'undefined') {
  window.Prism = Prism;
  configurePrismAutoloader();
}

const extraLanguageAliases = {
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

const extractElementLanguage = (element) => {
  const className = Array.from(element.classList || [])
    .find(item => item.startsWith('language-'));
  return className ? className.slice('language-'.length) : '';
};

export const getPrismLanguageNames = () => {
  const names = new Set();
  prismLanguageIds.forEach(id => names.add(id));
  Object.keys(prismLanguageAliases).forEach(alias => names.add(alias));
  return Array.from(names);
};

export const getPrismLanguageVariants = (language) => {
  const resolvedLanguage = resolveLanguage(language);
  if (!resolvedLanguage) {
    return [];
  }
  const names = new Set([resolvedLanguage]);
  Object.entries(prismLanguageAliases).forEach(([alias, id]) => {
    if (id === resolvedLanguage) {
      names.add(alias);
    }
  });
  return Array.from(names);
};

const notifyLanguageLoaded = (language) => {
  languageLoadedListeners.forEach((listener) => {
    try {
      listener(language);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message, error.stack);
    }
  });
};

export const onPrismLanguageLoaded = (listener) => {
  languageLoadedListeners.push(listener);
  return () => {
    const index = languageLoadedListeners.indexOf(listener);
    if (index !== -1) {
      languageLoadedListeners.splice(index, 1);
    }
  };
};

export const loadPrismLanguage = language => new Promise((resolve, reject) => {
  const resolvedLanguage = resolveLanguage(language);
  if (!resolvedLanguage || !prismLanguageIdSet.has(resolvedLanguage)) {
    resolve(false);
    return;
  }
  if (Prism.languages[resolvedLanguage]) {
    resolve(true);
    return;
  }
  const autoloader = Prism.plugins?.autoloader;
  if (!autoloader) {
    resolve(false);
    return;
  }
  if (languageLoadPromises[resolvedLanguage]) {
    languageLoadPromises[resolvedLanguage].then(resolve, reject);
    return;
  }
  languageLoadPromises[resolvedLanguage] = new Promise((resolveLoad, rejectLoad) => {
    autoloader.loadLanguages(resolvedLanguage, () => {
      const loaded = Boolean(Prism.languages[resolvedLanguage]);
      if (loaded) {
        notifyLanguageLoaded(resolvedLanguage);
      }
      resolveLoad(loaded);
    }, () => {
      rejectLoad(new Error(`Unable to load Prism language: ${resolvedLanguage}`));
    });
  });
  languageLoadPromises[resolvedLanguage].then(resolve, reject);
});

export const getPrismGrammar = (language) => {
  const resolvedLanguage = resolveLanguage(language);
  if (!resolvedLanguage) {
    return undefined;
  }
  return Prism.languages[resolvedLanguage];
};

export const safeHighlight = (text = '', grammar, language) => {
  const effectiveGrammar = grammar || getPrismGrammar(language);
  if (!effectiveGrammar) {
    return escapeHtml(text);
  }
  try {
    const grammarLanguage = resolveLanguage(language);
    if (!grammarLanguage) {
      return escapeHtml(text);
    }
    return Prism.highlight(text, effectiveGrammar, grammarLanguage);
  } catch (error) {
    return escapeHtml(text);
  }
};

export const safeHighlightElement = (element) => {
  try {
    const language = extractElementLanguage(element);
    const resolvedLanguage = resolveLanguage(language);
    if (!resolvedLanguage) {
      return;
    }

    if (skipDomHighlightLanguages.has(resolvedLanguage)) {
      return;
    }

    if (resolvedLanguage !== language) {
      element.classList.remove(`language-${language}`);
      element.classList.add(`language-${resolvedLanguage}`);
      const parent = element.parentElement;
      if (parent?.classList.contains(`language-${language}`)) {
        parent.classList.remove(`language-${language}`);
        parent.classList.add(`language-${resolvedLanguage}`);
      }
    }

    if (prismLanguageIdSet.has(resolvedLanguage) && !Prism.languages[resolvedLanguage]) {
      loadPrismLanguage(resolvedLanguage)
        .then((loaded) => {
          if (loaded) {
            Prism.highlightElement(element);
          }
        })
        .catch(() => {});
      return;
    }

    const grammar = Prism.languages[resolvedLanguage];
    if (!grammar) {
      element.textContent = element.textContent || '';
      return;
    }
    element.innerHTML = safeHighlight(element.textContent || '', grammar, resolvedLanguage);
  } catch (error) {
    element.textContent = element.textContent || '';
  }
};

export default Prism;
