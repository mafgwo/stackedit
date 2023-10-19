<template>
  <div class="preview-in-page-buttons">
    <ul>
      <li class="before">
        <icon-ellipsis></icon-ellipsis>
      </li>
      <li title="分享">
        <a href="javascript:void(0)" @click="share"><icon-share></icon-share></a>
      </li>
      <li title="切换预览主题">
        <dropdown-menu :selected="selectedTheme" :options="allThemes" :closeOnItemClick="false" @change="changeTheme">
          <icon-select-theme></icon-select-theme>
        </dropdown-menu>
      </li>
      <li title="Markdown语法帮助">
        <a href="javascript:void(0)" @click="showHelp"><icon-help-circle></icon-help-circle></a>
      </li>
    </ul>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
// import juice from 'juice';
import store from '../store';
import DropdownMenu from './common/DropdownMenu';
import publishSvc from '../services/publishSvc';
import giteeGistProvider from '../services/providers/giteeGistProvider';
import gistProvider from '../services/providers/gistProvider';

export default {
  components: {
    DropdownMenu,
  },
  data: () => ({
    allThemes: [{
      name: '默认主题',
      value: 'default',
    }, {
      name: '凝夜紫',
      value: 'ningyezi',
    }, {
      name: '草原绿',
      value: 'caoyuangreen',
    }, {
      name: '雁栖湖',
      value: 'yanqihu',
    }, {
      name: '灵动蓝',
      value: 'activeblue',
    }, {
      name: '极客黑',
      value: 'jikebrack',
    }, {
      name: '极简黑',
      value: 'simplebrack',
    }, {
      name: '全栈蓝',
      value: 'allblue',
    }, {
      name: '自定义',
      value: 'custom',
    }],
    baseCss: '',
    sharing: false,
  }),
  computed: {
    ...mapGetters('theme', [
      'currPreviewTheme',
      'customPreviewThemeStyle',
    ]),
    ...mapGetters('publishLocation', {
      publishLocations: 'current',
    }),
    selectedTheme() {
      return {
        value: this.currPreviewTheme || 'default',
      };
    },
  },
  methods: {
    ...mapActions('data', [
      'toggleSideBar',
    ]),
    async changeTheme(item) {
      await store.dispatch('theme/setPreviewTheme', item.value);
      // 如果自定义主题没内容 则弹出编辑区域
      if (item.value === 'custom' && !this.customPreviewThemeStyle) {
        this.toggleSideBar(true);
        store.dispatch('data/setSideBarPanel', 'previewTheme');
      }
    },
    showHelp() {
      this.toggleSideBar(true);
      store.dispatch('data/setSideBarPanel', 'help');
    },
    async share() {
      if (this.sharing) {
        store.dispatch('notification/info', '分享链接创建中...请稍后再试');
        return;
      }
      try {
        const currentFile = store.getters['file/current'];
        await store.dispatch('modal/open', { type: 'shareHtmlPre', name: currentFile.name });
        this.sharing = true;
        const mainToken = store.getters['workspace/mainWorkspaceToken'];
        if (!mainToken) {
          store.dispatch('notification/info', '登录主文档空间之后才可使用分享功能！');
          return;
        }
        let tempGistId = null;
        const isGithub = mainToken.providerId === 'githubAppData';
        const gistProviderId = isGithub ? 'gist' : 'giteegist';
        const filterLocations = this.publishLocations.filter(it => it.providerId === gistProviderId
                 && it.url && it.gistId);
        if (filterLocations.length > 0) {
          tempGistId = filterLocations[0].gistId;
        }
        const location = (isGithub ? gistProvider : giteeGistProvider).makeLocation(
          mainToken,
          `分享-${currentFile.name}`,
          true,
          null,
        );
        location.templateId = 'styledHtmlWithTheme';
        location.fileId = currentFile.id;
        location.gistId = tempGistId;
        const { gistId } = await publishSvc.publishLocationAndStore(location);
        const sharePage = mainToken.providerId === 'githubAppData' ? 'gistshare.html' : 'share.html';
        const url = `${window.location.protocol}//${window.location.host}/${sharePage}?id=${gistId}`;
        await store.dispatch('modal/open', { type: 'shareHtml', name: currentFile.name, url });
      } catch (err) {
        if (err) {
          store.dispatch('notification/error', err);
        }
      } finally {
        this.sharing = false;
      }
    },
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

.preview-in-page-buttons {
  position: absolute;
  bottom: 10px;
  right: -98px;
  height: 34px;
  padding: 5px;
  background-color: rgba(84, 96, 114, 0.4);
  border-radius: $border-radius-base;
  transition: 0.5s;
  display: flex;

  .dropdown-menu {
    display: none;
  }

  &:active,
  &:focus,
  &:hover {
    right: 0;
    transition: 0.5s;
    background-color: #546072;

    .dropdown-menu {
      display: block;
    }
  }

  .dropdown-menu-items {
    bottom: 100%;
    top: unset;
  }

  ul {
    padding: 0;
    margin-left: 10px;
    line-height: 20px;

    li {
      line-height: 16px;
      width: 16px;
      display: inline-block;
      vertical-align: middle;
      list-style: none;
      cursor: pointer;
      font-size: 14px;
      margin-right: 10px;

      .icon {
        color: #fff;
        opacity: 0.7;

        &:active,
        &:focus,
        &:hover {
          opacity: 1;
        }
      }
    }

    .before {
      margin-left: -16px;
      margin-right: 0;
    }
  }
}
</style>
