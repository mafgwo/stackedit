import { normalizeAiModelConfig } from '../services/aiModelConfig';

const chatgptConfigKey = 'chatgpt/config';

export default {
  namespaced: true,
  state: {
    config: normalizeAiModelConfig(),
  },
  mutations: {
    setCurrConfig: (state, value) => {
      state.config = normalizeAiModelConfig(value);
    },
  },
  getters: {
    chatGptConfig: state => state.config,
  },
  actions: {
    setCurrConfig({ commit }, value) {
      const config = normalizeAiModelConfig(value);
      commit('setCurrConfig', config);
      localStorage.setItem(chatgptConfigKey, JSON.stringify(config));
    },
  },
};
