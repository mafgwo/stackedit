<template>
    <span class="dropdown-menu">
      <span ref="slotInfo" @click="toggleMenu()" class="dropdown-toggle">
        <slot></slot>
      </span>
      <ul class="dropdown-menu-items" :style="dropdownStyle" v-if="showMenu">
        <li v-for="(option, idx) in options" :key="idx">
          <a href="javascript:void(0)" :class="{selected: option.value === selectedOption.value}" @click="updateOption(option)">
            {{ option.name }}
          </a>
        </li>
      </ul>
    </span>
  </template>
  
  <script>
    import store from '../../store';

    export default {
      data: () => ({
        selectedOption: {
          value: '',
          name: '',
        },
        showMenu: false,
      }),
      props: {
        options: {
          type: [Array, Object],
        },
        selected: {},
        closeOnOutsideClick: {
          type: [Boolean],
          default: true,
        },
        closeOnItemClick: {
          type: [Boolean],
          default: true,
        },
      },
      mounted() {
        this.selectedOption = this.selected;
        if (this.closeOnOutsideClick) {
          document.addEventListener('click', this.clickHandler);
        }
      },
      beforeDestroy() {
        document.removeEventListener('click', this.clickHandler);
      },
      computed: {
        dropdownStyle() {
          const height = store.state.layout.bodyHeight;
          return `max-height: ${height * 0.7}px;`;
        },
      },
      methods: {
        updateOption(option) {
          this.selectedOption = option;
          if (this.closeOnItemClick) {
            this.showMenu = false;
          }
          this.$emit('change', option);
        },
        toggleMenu() {
          this.showMenu = !this.showMenu;
        },
        clickHandler(event) {
          const { target } = event;
          const { $el } = this;
          if (!$el.contains(target)) {
            this.showMenu = false;
          }
        },
      },
      watch: {
        selected(val) {
          this.selectedOption = val;
        },
      },
    };
  </script>
  
<style lang="scss">
.dropdown-menu {
  .dropdown-menu-items {
    position: absolute;
    top: 100%;
    right: 0;
    float: left;
    min-width: 160px;
    max-height: 450px;
    overflow-y: scroll;
    padding: 5px 0;
    margin: 0;
    list-style: none;
    font-size: 15px;
    background-color: #666;
    border: 1px solid #666;
    border-radius: 4px;
    -webkit-box-shadow: 0 6px 12px rgba(0, 0, 0, 0.18);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.18);
    background-clip: padding-box;

    li {
      width: 100%;
      display: list-item;
      margin: 0;
      text-align: -webkit-match-parent;

      a {
        display: block;
        clear: both;
        font-weight: normal;
        line-height: 1.45;
        white-space: nowrap;
        color: #eee;
        padding: 5px 20px;
        border-top: 1px solid transparent;
        border-bottom: 1px solid transparent;
        text-decoration: none;

        &:active,
        &:focus,
        &:hover {
          background-color: rgb(82, 82, 82);
        }
      }

      a.selected {
        background: #74b936 !important;
        color: #fff !important;
      }
    }
  }
}
</style>
  