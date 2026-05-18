const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const dosDateTime = (date = new Date()) => {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
};

const writeUint16 = (view, offset, value) => view.setUint16(offset, value, true);
const writeUint32 = (view, offset, value) => view.setUint32(offset, value >>> 0, true);

const concatBytes = (parts, totalLength) => {
  const result = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
};

const toBytes = (content) => {
  if (content instanceof Uint8Array) {
    return content;
  }
  if (content instanceof ArrayBuffer) {
    return new Uint8Array(content);
  }
  return textEncoder.encode(`${content}`);
};

export default {
  create(files) {
    const localParts = [];
    const centralParts = [];
    let localOffset = 0;
    const { time, date } = dosDateTime();

    files.forEach(({ name, content }) => {
      const nameBytes = textEncoder.encode(name);
      const dataBytes = toBytes(content);
      const crc = crc32(dataBytes);

      const localHeader = new Uint8Array(30 + nameBytes.length);
      const localView = new DataView(localHeader.buffer);
      writeUint32(localView, 0, 0x04034b50);
      writeUint16(localView, 4, 20);
      writeUint16(localView, 6, 0x0800);
      writeUint16(localView, 8, 0);
      writeUint16(localView, 10, time);
      writeUint16(localView, 12, date);
      writeUint32(localView, 14, crc);
      writeUint32(localView, 18, dataBytes.length);
      writeUint32(localView, 22, dataBytes.length);
      writeUint16(localView, 26, nameBytes.length);
      writeUint16(localView, 28, 0);
      localHeader.set(nameBytes, 30);

      localParts.push(localHeader, dataBytes);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(centralHeader.buffer);
      writeUint32(centralView, 0, 0x02014b50);
      writeUint16(centralView, 4, 20);
      writeUint16(centralView, 6, 20);
      writeUint16(centralView, 8, 0x0800);
      writeUint16(centralView, 10, 0);
      writeUint16(centralView, 12, time);
      writeUint16(centralView, 14, date);
      writeUint32(centralView, 16, crc);
      writeUint32(centralView, 20, dataBytes.length);
      writeUint32(centralView, 24, dataBytes.length);
      writeUint16(centralView, 28, nameBytes.length);
      writeUint16(centralView, 30, 0);
      writeUint16(centralView, 32, 0);
      writeUint16(centralView, 34, 0);
      writeUint16(centralView, 36, 0);
      writeUint32(centralView, 38, 0);
      writeUint32(centralView, 42, localOffset);
      centralHeader.set(nameBytes, 46);

      centralParts.push(centralHeader);
      localOffset += localHeader.length + dataBytes.length;
    });

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const endHeader = new Uint8Array(22);
    const endView = new DataView(endHeader.buffer);
    writeUint32(endView, 0, 0x06054b50);
    writeUint16(endView, 4, 0);
    writeUint16(endView, 6, 0);
    writeUint16(endView, 8, files.length);
    writeUint16(endView, 10, files.length);
    writeUint32(endView, 12, centralSize);
    writeUint32(endView, 16, localOffset);
    writeUint16(endView, 20, 0);

    return new Blob(
      [concatBytes([...localParts, ...centralParts, endHeader], localOffset + centralSize + endHeader.length)],
      { type: 'application/zip' },
    );
  },
  async read(file) {
    const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const files = {};
    let offset = 0;

    while (offset + 30 <= bytes.length) {
      const signature = view.getUint32(offset, true);
      if (signature === 0x02014b50 || signature === 0x06054b50) {
        break;
      }
      if (signature !== 0x04034b50) {
        throw new Error('无效的ZIP备份文件。');
      }

      const flags = view.getUint16(offset + 6, true);
      const method = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const fileNameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      const nameStart = offset + 30;
      const dataStart = nameStart + fileNameLength + extraLength;
      const dataEnd = dataStart + compressedSize;

      if (flags & 0x0008) {
        throw new Error('不支持带数据描述符的ZIP备份文件。');
      }
      if (method !== 0) {
        throw new Error('不支持压缩格式的ZIP备份文件。');
      }
      if (dataEnd > bytes.length) {
        throw new Error('ZIP备份文件不完整。');
      }

      const name = textDecoder.decode(bytes.slice(nameStart, nameStart + fileNameLength));
      files[name] = bytes.slice(dataStart, dataEnd);
      offset = dataEnd;
    }

    return files;
  },
};
