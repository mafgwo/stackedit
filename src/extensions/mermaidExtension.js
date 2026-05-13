import mermaid from 'mermaid';
import extensionSvc from '../services/extensionSvc';
import utils from '../services/utils';

const baseConfig = {
  startOnLoad: false,
  look: 'classic',
  securityLevel: 'strict',
  deterministicIds: false,
  suppressErrorRendering: true,
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  flowchart: {
    htmlLabels: false,
    curve: 'linear',
  },
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
    mirrorActors: true,
    bottomMarginAdj: 1,
    useMaxWidth: true,
  },
  gantt: {
    titleTopMargin: 25,
    barHeight: 20,
    barGap: 4,
    topPadding: 50,
    leftPadding: 75,
    gridLineStartPadding: 35,
    fontSize: 11,
    fontFamily: '"Open-Sans", "sans-serif"',
    numberSectionStyles: 4,
    axisFormat: '%Y-%m-%d',
  },
};

let currentTheme;

const getTheme = (elt) => {
  if (elt.closest('.app--dark')) {
    return 'dark';
  }
  return 'base';
};

const ensureConfig = (theme) => {
  if (currentTheme === theme) {
    return;
  }
  mermaid.initialize({
    ...baseConfig,
    theme,
  });
  currentTheme = theme;
};

const escapeHtml = (value = '') => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const render = async (elt) => {
  const source = (elt.dataset.mermaidSource || elt.textContent).trim();
  if (!source) {
    return;
  }
  try {
    ensureConfig(getTheme(elt));
    const svgId = `mermaid-svg-${utils.uid()}`;
    const { svg } = await mermaid.render(svgId, source);
    elt.dataset.mermaidSource = source;
    elt.innerHTML = svg;
    elt.classList.add('mermaid-diagram');
    elt.classList.remove('mermaid-error');
  } catch (e) {
    console.error('Mermaid rendering error:', e);
    elt.classList.remove('mermaid-diagram');
    elt.classList.add('mermaid-error');
    elt.innerHTML = `
      <div class="mermaid-error__title">Mermaid 渲染失败</div>
      <pre class="mermaid-error__message">${escapeHtml(e && e.message ? e.message : 'Unknown Mermaid error')}</pre>
    `;
  }
};

extensionSvc.onGetOptions((options, properties) => {
  options.mermaid = properties.extensions.mermaid.enabled;
});

extensionSvc.onSectionPreview((elt) => {
  const diagrams = Array.from(elt.querySelectorAll('.prism.language-mermaid'));
  // 返回 Promise.all 以等待所有图表渲染完成
  return Promise.all(
    diagrams.map(diagramElt => render(diagramElt.parentNode))
  );
});

export const rerenderMermaidDiagrams = elt => Promise.all(
  Array.from(elt.querySelectorAll('.mermaid-diagram[data-mermaid-source]'))
    .map(diagramElt => render(diagramElt))
);
