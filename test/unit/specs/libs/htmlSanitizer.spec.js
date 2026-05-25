import htmlSanitizer from '../../../../src/libs/htmlSanitizer';

describe('htmlSanitizer', () => {
  it('keeps safe HTML5 tags commonly emitted from MarkdownIt raw HTML', () => {
    const html = [
      '<details open><summary>More</summary><video controls poster="https://example.com/poster.png">',
      '<source src="https://example.com/video.mp4" type="video/mp4">',
      '<track src="https://example.com/captions.vtt" kind="captions" srclang="en" label="English">',
      '</video></details>',
    ].join('');

    expect(htmlSanitizer.sanitizeHtml(html)).toBe([
      '<details open=""><summary>More</summary><video controls="" poster="https://example.com/poster.png">',
      '<source src="https://example.com/video.mp4" type="video/mp4"/>',
      '<track src="https://example.com/captions.vtt" kind="captions" srclang="en" label="English"/>',
      '</video></details>',
    ].join(''));
  });

  it('drops unsafe tags, attributes, and URLs', () => {
    const html = [
      '<details onclick="alert(1)"><summary>More</summary>',
      '<video controls poster="javascript:alert(1)" srcdoc="<script>alert(1)</script>"></video>',
      '<script>alert(1)</script>',
      '</details>',
    ].join('');

    expect(htmlSanitizer.sanitizeHtml(html)).toBe('<details><summary>More</summary><video controls=""></video></details>');
  });

  it('keeps safe inline styles used by embedded badges and SVG icons', () => {
    const html = [
      '<p><a style="background-color:black;color:white;text-decoration:none;padding:4px 6px;font-size:12px;line-height:1.2;display:inline-block;border-radius:3px" ',
      'href="https://www.dpm.org.cn/collection/paint/234597.html" target="_blank" rel="noopener noreferrer">',
      '<span style="display:inline-block;padding:2px 3px">',
      '<svg xmlns="http://www.w3.org/2000/svg" style="height:12px;width:auto;position:relative;vertical-align:middle;top:-1px;fill:white" viewBox="0 0 32 32">',
      '<title>unsplash-logo</title><path d="M20.8 18.1c0 2.7-2.2 4.8-4.8 4.8s-4.8-2.1-4.8-4.8c0-2.7 2.2-4.8 4.8-4.8 2.7.1 4.8 2.2 4.8 4.8z"></path>',
      '</svg></span><span style="display:inline-block;padding:2px 3px">顾恺之 洛神赋图卷</span></a></p>',
    ].join('');

    expect(htmlSanitizer.sanitizeHtml(html)).toBe(html.replace('顾恺之 洛神赋图卷', '&#39038;&#24698;&#20043; &#27931;&#31070;&#36171;&#22270;&#21367;'));
  });

  it('drops unsafe inline style declarations', () => {
    const html = '<span style="color:red;background-image:url(javascript:alert(1));width:12px;behavior:url(#x)">x</span>';

    expect(htmlSanitizer.sanitizeHtml(html)).toBe('<span style="color:red;width:12px">x</span>');
  });
});
