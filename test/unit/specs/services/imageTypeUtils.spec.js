import { getImageExt, getImageMime } from '../../../../src/services/imageTypeUtils';

describe('imageTypeUtils', () => {
  it('should derive SVG extension and MIME type', () => {
    expect(getImageExt({ type: 'image/svg+xml', name: 'diagram' })).toBe('svg');
    expect(getImageMime('/imgs/diagram.svg')).toBe('image/svg+xml');
  });

  it('should normalize JPEG aliases', () => {
    expect(getImageExt('image/jpeg')).toBe('jpg');
    expect(getImageMime('/imgs/photo.jpg')).toBe('image/jpeg');
  });

  it('should fall back to file name when MIME type is missing', () => {
    expect(getImageExt({ type: '', name: 'chart.svg' })).toBe('svg');
  });
});
