import extensionSvc from '../services/extensionSvc';

let renderAbcPromise;

const loadRenderAbc = () => {
  if (!renderAbcPromise) {
    renderAbcPromise = import('abcjs/src/api/abc_tunebook_svg')
      .then(module => module.default);
  }
  return renderAbcPromise;
};

const render = async (elt) => {
  if (elt.$abcRendering) {
    return;
  }
  elt.$abcRendering = true;
  const content = elt.textContent;
  const renderAbc = await loadRenderAbc();
  if (!elt.parentNode || !elt.parentNode.parentNode) {
    return;
  }
  // Create a div element
  const divElt = document.createElement('div');
  divElt.className = 'abc-notation-block';
  // Replace the pre element with the div
  elt.parentNode.parentNode.replaceChild(divElt, elt.parentNode);
  renderAbc(divElt, content, {});
};

extensionSvc.onGetOptions((options, properties) => {
  options.abc = properties.extensions.abc.enabled;
});

extensionSvc.onSectionPreview((elt) => {
  const notationElts = Array.from(elt.querySelectorAll('.prism.language-abc'));
  return Promise.all(notationElts.map(notationElt => render(notationElt)));
});
