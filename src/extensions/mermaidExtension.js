import mermaid from 'mermaid';
import extensionSvc from '../services/extensionSvc';
import utils from '../services/utils';

const config = {
  logLevel: 5,
  startOnLoad: false,
  arrowMarkerAbsolute: false,
  theme: 'neutral',
  flowchart: {
    htmlLabels: true,
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

let init = () => {
  mermaid.initialize(config);
  init = () => {};
};

const render = async (elt) => {
  try {
    init();
    const svgId = `mermaid-svg-${utils.uid()}`;
    const {svg} = await mermaid.render(svgId, elt.textContent);
    elt.innerHTML = svg;
  } catch (e) {
    console.error('Mermaid rendering error:', e);
    // 可以选择添加错误提示
    elt.innerHTML = `<div class="error">Diagram rendering failed</div>`;
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
