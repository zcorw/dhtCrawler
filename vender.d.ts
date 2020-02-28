declare type nodeId = Buffer;
declare type infoHash = Buffer;

declare interface noNidNode {
  address: string,
  port: number,
}

declare interface node extends noNidNode {
  nid: nodeId,
}

declare interface infohashData extends noNidNode {
  infohash: string,
  type: 'get_peers' | 'announce_peer',
}

declare interface nodeData extends noNidNode {
  nid: string,
}