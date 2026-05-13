<template>
  <pre ref="codeEditorRoot" class="code-editor textfield prism" :disabled="disabled"></pre>
</template>

<script>
import Prism from 'prismjs';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-handlebars';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import cledit from '../services/editor/cledit';

const escapeHtml = (value = '') => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export default {
  props: ['value', 'lang', 'disabled', 'scrollClass'],
  data: () => ({
    clEditor: null,
  }),
  mounted() {
    const preElt = this.$refs.codeEditorRoot;
    let scrollElt = preElt;
    const scrollCls = this.scrollClass || 'modal';
    while (scrollElt && !scrollElt.classList.contains(scrollCls)) {
      scrollElt = scrollElt.parentNode;
    }
    if (!scrollElt) {
      preElt.textContent = this.value || '';
      return;
    }
    const clEditor = cledit(preElt, scrollElt);
    clEditor.on('contentChanged', value => this.$emit('changed', value));
    clEditor.init({
      content: this.value,
      sectionHighlighter: (section) => {
        const grammar = Prism.languages[this.lang];
        if (!grammar) {
          return escapeHtml(section.text);
        }
        return Prism.highlight(section.text, grammar, this.lang);
      },
    });
    clEditor.toggleEditable(!this.disabled);
    this.clEditor = clEditor;
  },
  watch: {
    value(value) {
      if (!this.clEditor) {
        this.$refs.codeEditorRoot.textContent = value || '';
        return;
      }
      const nextValue = value || '';
      const currentValue = this.clEditor.getContent();
      if (currentValue !== nextValue) {
        this.clEditor.setContent(nextValue, true);
      }
    },
    disabled(value) {
      if (this.clEditor) {
        this.clEditor.toggleEditable(!value);
      }
    },
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

.code-editor {
  margin: 0;
  font-family: $font-family-monospace;
  font-size: $font-size-monospace;
  font-variant-ligatures: no-common-ligatures;
  word-break: break-word;
  word-wrap: normal;
  height: auto;
  caret-color: #000;
  min-height: 160px;
  overflow: auto;
  padding: 0.2em 0.4em;

  .app--dark & {
    caret-color: $editor-color-dark-low;
  }

  * {
    line-height: $line-height-base;
    font-size: inherit !important;
  }
}
</style>
