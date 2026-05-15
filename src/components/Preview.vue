<template>
  <div class="preview">
    <div class="preview__inner-1" @click="onClick" @scroll="onScroll">
      <div class="preview__inner-2" :class="previewTheme" :style="{padding: styles.previewPadding}">
      </div>
      <div class="gutter" :style="{left: styles.previewGutterLeft + 'px'}">
        <comment-list v-if="styles.previewGutterWidth"></comment-list>
        <preview-new-discussion-button v-if="!isCurrentTemp"></preview-new-discussion-button>
      </div>
    </div>
    <div v-if="!styles.showEditor" class="preview__corner">
      <button class="preview__button button" @click="toggleEditor(true)" v-title="'编辑文件'">
        <icon-pen></icon-pen>
      </button>
    </div>
    <image-lightbox :image="zoomedImage" @close="closeZoomedImage"></image-lightbox>
  </div>
</template>


<script>
import { mapGetters, mapActions } from 'vuex';
import CommentList from './gutters/CommentList';
import PreviewNewDiscussionButton from './gutters/PreviewNewDiscussionButton';
import ImageLightbox from './ImageLightbox';
import store from '../store';
import editorSvc from '../services/editorSvc';
import { rerenderMermaidDiagrams } from '../extensions/mermaidExtension';

const appUri = `${window.location.protocol}//${window.location.host}`;
const codeCopyButtonClass = 'preview-code-copy-button';
const codeBlockClass = 'preview-code-block';

const copyText = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

export default {
  components: {
    CommentList,
    PreviewNewDiscussionButton,
    ImageLightbox,
  },
  data: () => ({
    previewTop: true,
    zoomedImage: null,
    offPreviewCtx: null,
  }),
  computed: {
    ...mapGetters('file', [
      'isCurrentTemp',
    ]),
    ...mapGetters('theme', [
      'currPreviewTheme',
    ]),
    ...mapGetters('data', [
      'computedSettings',
    ]),
    ...mapGetters('layout', [
      'styles',
    ]),
    previewTheme() {
      return `preview-theme--${this.currPreviewTheme || 'default'}`;
    },
  },
  methods: {
    ...mapActions('data', [
      'toggleEditor',
    ]),
    closeZoomedImage() {
      this.zoomedImage = null;
    },
    enhanceCodeBlocks(rootElt) {
      rootElt.querySelectorAll('pre').forEach((preElt) => {
        if (
          preElt.classList.contains(codeBlockClass)
          || preElt.classList.contains('mermaid-diagram')
          || preElt.classList.contains('mermaid-error')
          || preElt.closest('.abcjs-container')
        ) {
          return;
        }
        preElt.classList.add(codeBlockClass);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `${codeCopyButtonClass} button`;
        button.title = '复制代码';
        button.setAttribute('aria-label', '复制代码');
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24"><path d="M 19,21L 8,21L 8,7L 19,7M 19,5L 8,5C 6.9,5 6,5.9 6,7L 6,21C 6,22.1 6.9,23 8,23L 19,23C 20.1,23 21,22.1 21,21L 21,7C 21,5.9 20.1,5 19,5 Z M 16,1L 4,1C 2.9,1 2,1.9 2,3L 2,17L 4,17L 4,3L 16,3L 16,1 Z " /></svg>';
        preElt.appendChild(button);
      });
    },
    async copyCodeBlock(button) {
      const preElt = button.closest('pre');
      const codeElt = preElt && preElt.querySelector('code');
      const text = codeElt ? codeElt.textContent : preElt && Array.from(preElt.childNodes)
        .filter(node => !(node.classList && node.classList.contains(codeCopyButtonClass)))
        .map(node => node.textContent)
        .join('');
      if (!text) {
        return;
      }
      try {
        await copyText(text);
        store.dispatch('notification/info', '代码已复制到剪贴板！');
      } catch (err) {
        store.dispatch('notification/error', '代码复制失败。');
      }
    },
    openZoomedImage(imgElt) {
      const src = imgElt.currentSrc || imgElt.src;
      if (!src) {
        return;
      }
      this.zoomedImage = {
        src,
        alt: imgElt.alt || '',
      };
    },
    onClick(evt) {
      let elt = evt.target;
      while (elt !== this.$el) {
        if (elt.classList && elt.classList.contains(codeCopyButtonClass)) {
          evt.preventDefault();
          evt.stopPropagation();
          this.copyCodeBlock(elt);
          return;
        }
        if (elt.tagName === 'IMG' && this.$el.querySelector('.preview__inner-2')?.contains(elt)) {
          evt.preventDefault();
          this.openZoomedImage(elt);
          return;
        }
        if (elt.href && elt.href.match(/^https?:\/\//)
          && (!elt.hash || elt.href.slice(0, appUri.length) !== appUri)) {
          evt.preventDefault();
          const wnd = window.open(elt.href, '_blank');
          wnd.focus();
          return;
        }
        elt = elt.parentNode;
      }
    },
    onScroll(evt) {
      this.previewTop = evt.target.scrollTop < 10;
    },
  },
  mounted() {
    const previewElt = this.$el.querySelector('.preview__inner-2');
    const enhanceCodeBlocks = () => this.enhanceCodeBlocks(previewElt);
    this.enhanceCodeBlocks(previewElt);
    editorSvc.on('previewCtx', enhanceCodeBlocks);
    this.offPreviewCtx = () => editorSvc.off('previewCtx', enhanceCodeBlocks);
    const onDiscussionEvt = cb => (evt) => {
      let elt = evt.target;
      while (elt && elt !== previewElt) {
        if (elt.discussionId) {
          cb(elt.discussionId);
          return;
        }
        elt = elt.parentNode;
      }
    };

    const classToggler = toggle => (discussionId) => {
      previewElt.getElementsByClassName(`discussion-preview-highlighting--${discussionId}`)
        .cl_each(elt => elt.classList.toggle('discussion-preview-highlighting--hover', toggle));
      document.getElementsByClassName(`comment--discussion-${discussionId}`)
        .cl_each(elt => elt.classList.toggle('comment--hover', toggle));
    };

    previewElt.addEventListener('mouseover', onDiscussionEvt(classToggler(true)));
    previewElt.addEventListener('mouseout', onDiscussionEvt(classToggler(false)));
    previewElt.addEventListener('click', onDiscussionEvt((discussionId) => {
      store.commit('discussion/setCurrentDiscussionId', discussionId);
    }));

    this.$watch(
      () => store.getters['content/currentChangeTrigger'],
      () => this.$nextTick(() => this.enhanceCodeBlocks(previewElt)),
    );

    this.$watch(
      () => store.state.discussion.currentDiscussionId,
      (discussionId, oldDiscussionId) => {
        if (oldDiscussionId) {
          previewElt.querySelectorAll(`.discussion-preview-highlighting--${oldDiscussionId}`)
            .cl_each(elt => elt.classList.remove('discussion-preview-highlighting--selected'));
        }
        if (discussionId) {
          previewElt.querySelectorAll(`.discussion-preview-highlighting--${discussionId}`)
            .cl_each(elt => elt.classList.add('discussion-preview-highlighting--selected'));
        }
      },
    );

    this.$watch(
      () => this.computedSettings.colorTheme,
      async () => {
        if (previewElt.querySelector('.mermaid-diagram[data-mermaid-source]')) {
          await rerenderMermaidDiagrams(previewElt);
        }
      },
    );
  },
  beforeUnmount() {
    if (this.offPreviewCtx) {
      this.offPreviewCtx();
      this.offPreviewCtx = null;
    }
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

.preview,
.preview__inner-1 {
  position: absolute;
  width: 100%;
  height: 100%;
}

.preview__inner-1 {
  overflow: auto;
}

.preview__inner-2 {
  margin: 0;
}

.preview__inner-2 > :first-child > :first-child {
  margin-top: 0;
}

$corner-size: 110px;

.preview__corner {
  position: absolute;
  top: 0;
  right: 0;

  &::before {
    content: '';
    position: absolute;
    right: 0;
    border-top: $corner-size solid rgba(0, 0, 0, 0.075);
    border-left: $corner-size solid transparent;
    pointer-events: none;

    .app--dark & {
      border-top-color: rgba(255, 255, 255, 0.075);
    }
  }
}

.preview__button {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 40px;
  height: 40px;
  padding: 5px;
  color: rgba(0, 0, 0, 0.25);

  .app--dark & {
    color: rgba(255, 255, 255, 0.25);
  }

  &:active,
  &:focus,
  &:hover {
    color: rgba(0, 0, 0, 0.33);
    background-color: transparent;

    .app--dark & {
      color: rgba(255, 255, 255, 0.33);
    }
  }
}

.preview__inner-2 img {
  cursor: zoom-in;
}

.preview-code-block {
  position: relative;

  &:hover,
  &:focus-within {
    > .preview-code-copy-button {
      opacity: 1;
      pointer-events: auto;
    }
  }
}

.preview-code-copy-button {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 30px;
  height: 30px;
  padding: 5px;
  opacity: 0;
  pointer-events: none;
  color: rgba(0, 0, 0, 0.55);
  background-color: rgba(255, 255, 255, 0.88);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14);
  transition: opacity 120ms ease;

  &:active,
  &:focus,
  &:hover {
    color: rgba(0, 0, 0, 0.78);
    background-color: #fff;
  }

  .app--dark & {
    color: rgba(255, 255, 255, 0.74);
    background-color: rgba(0, 0, 0, 0.58);

    &:active,
    &:focus,
    &:hover {
      color: #fff;
      background-color: rgba(0, 0, 0, 0.74);
    }
  }

  .icon {
    display: block;
    width: 20px;
    height: 20px;
    pointer-events: none;
    fill: currentColor;
  }
}
</style>
