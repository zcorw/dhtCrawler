import crypto from 'crypto';

export const randomId: () => Buffer = function(): Buffer {
  return crypto.createHash('sha1').update(crypto.randomBytes(20)).digest();
}

export const transactionId: () => Buffer = function(): Buffer {
  return randomId().slice(0, 4);
}

export const decodeNodes: (data: Buffer) => node[] = function(data: Buffer): node[] {
  var nodes = [];
  for (var i = 0; i + 26 <= data.length; i += 26) {
      nodes.push({
          nid: data.slice(i, i + 20),
          address: data[i + 20] + '.' + data[i + 21] + '.' +
              data[i + 22] + '.' + data[i + 23],
          port: data.readUInt16BE(i + 24)
      });
  }
  return nodes;
}

export const distance: (firstId: Buffer, secondId: Buffer) => number = function(firstId: Buffer, secondId: Buffer): number {
  let i = 0;
  const min = Math.min(firstId.length, secondId.length);
  for (; i < min; ++i) {
    let xor = firstId[i] ^ secondId[i];
    if(xor !== 0) {
      for(let y = 0; y < 8; y++) {
        if((xor & (1 << (7 - y))) !== 0) {
          return y + 1 + i * 8;
        }
      }
    }
  }
  return 0;
}