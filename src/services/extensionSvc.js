const getOptionsListeners = [];
const initConverterListeners = [];
const sectionPreviewListeners = [];

export default {
  onGetOptions(listener) {
    getOptionsListeners.push(listener);
  },

  onInitConverter(priority, listener) {
    initConverterListeners[priority] = listener;
  },

  onSectionPreview(listener) {
    sectionPreviewListeners.push(listener);
  },

  getOptions(properties, isCurrentFile) {
    return getOptionsListeners.reduce((options, listener) => {
      listener(options, properties, isCurrentFile);
      return options;
    }, {});
  },

  initConverter(markdown, options) {
    // Use forEach as it's a sparsed array
    initConverterListeners.forEach((listener) => {
      listener(markdown, options);
    });
  },

  async sectionPreview(elt, options, isEditor) {
    // 过滤出所有返回 Promise 的 listener 结果
    const promises = sectionPreviewListeners
      .map(listener => listener(elt, options, isEditor))
      .filter(result => result instanceof Promise);
    
    // 等待所有 Promise 完成
    await Promise.all(promises);
  },
};
