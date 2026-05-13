<template>
  <div
    v-if="image"
    class="image-lightbox"
    role="dialog"
    aria-modal="true"
    :aria-label="image.alt || '图片预览'"
    @click.self="close"
    @wheel.prevent="onWheel"
  >
    <div class="image-lightbox__toolbar">
      <button
        class="image-lightbox__action button"
        type="button"
        aria-label="缩小"
        @click="zoomOut"
      >
        -
      </button>
      <button
        class="image-lightbox__action button"
        type="button"
        aria-label="重置缩放"
        @click="resetZoom"
      >
        {{ Math.round(zoomScale * 100) }}%
      </button>
      <button
        class="image-lightbox__action button"
        type="button"
        aria-label="放大"
        @click="zoomIn"
      >
        +
      </button>
    </div>
    <button
      class="image-lightbox__close button"
      type="button"
      aria-label="关闭图片预览"
      @click="close"
    >
      ×
    </button>
    <div class="image-lightbox__viewport">
      <img
        class="image-lightbox__image"
        :src="image.src"
        :alt="image.alt"
        :style="{ transform: `scale(${zoomScale})` }"
      >
    </div>
  </div>
</template>

<script>
const minZoomScale = 0.5;
const maxZoomScale = 4;
const zoomStep = 0.2;

export default {
  props: {
    image: {
      type: Object,
      default: null,
    },
  },
  data: () => ({
    zoomScale: 1,
  }),
  watch: {
    image() {
      this.resetZoom();
    },
  },
  mounted() {
    window.addEventListener('keydown', this.onWindowKeydown);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onWindowKeydown);
  },
  methods: {
    clampZoomScale(value) {
      return Math.min(maxZoomScale, Math.max(minZoomScale, Number(value.toFixed(2))));
    },
    close() {
      this.$emit('close');
    },
    setZoomScale(value) {
      this.zoomScale = this.clampZoomScale(value);
    },
    zoomIn() {
      this.setZoomScale(this.zoomScale + zoomStep);
    },
    zoomOut() {
      this.setZoomScale(this.zoomScale - zoomStep);
    },
    resetZoom() {
      this.zoomScale = 1;
    },
    onWheel(evt) {
      if (evt.deltaY < 0) {
        this.zoomIn();
        return;
      }
      this.zoomOut();
    },
    onWindowKeydown(evt) {
      if (!this.image) {
        return;
      }
      if (evt.key === 'Escape') {
        this.close();
        return;
      }
      if (evt.key === '+' || evt.key === '=') {
        evt.preventDefault();
        this.zoomIn();
        return;
      }
      if (evt.key === '-') {
        evt.preventDefault();
        this.zoomOut();
        return;
      }
      if (evt.key === '0') {
        evt.preventDefault();
        this.resetZoom();
      }
    },
  },
};
</script>

<style lang="scss">
.image-lightbox {
  position: absolute;
  inset: 0;
  z-index: 20;
  padding: 32px;
  background: rgba(0, 0, 0, 0.82);
}

.image-lightbox__toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  gap: 8px;
  z-index: 1;
}

.image-lightbox__action {
  min-width: 44px;
  height: 44px;
  padding: 0 12px;
  color: #fff;
  font-size: 22px;
  line-height: 1;

  &:active,
  &:focus,
  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
  }
}

.image-lightbox__close {
  position: absolute;
  top: 16px;
  right: 16px;
  min-width: 44px;
  height: 44px;
  padding: 0;
  font-size: 32px;
  line-height: 1;
  color: #fff;

  &:active,
  &:focus,
  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
  }
}

.image-lightbox__viewport {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-lightbox__image {
  max-width: min(96vw, 1400px);
  max-height: 92vh;
  object-fit: contain;
  box-shadow: 0 16px 60px rgba(0, 0, 0, 0.45);
  transform-origin: center center;
  transition: transform 120ms ease;
  will-change: transform;
}
</style>
