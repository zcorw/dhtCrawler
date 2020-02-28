import dgram, { Socket } from 'dgram';
import bencode from 'bencode';
import { EventEmitter } from 'events';
import { randomId, transactionId, decodeNodes } from '../src/util';
import logger from './Logger';
import { NodeTable, InfoHashTable } from './SimpleTable';
import Database from './Database';

interface ping {
  id: nodeId,
}

interface findNode {
  id: nodeId,
  target: nodeId,
}

interface getPeers {
  id: nodeId,
  info_hash: infoHash,
}

interface announcePeer {
  id: nodeId,
  info_hash: infoHash,
  port: number,
  token: string,
}

interface findNodeRes {
  id: nodeId,
  nodes: Buffer,
}

interface reqMsg<T, U> {
  t: Buffer,
  y: 'q',
  q: T,
  a: U,
}

type pingReq = reqMsg<'ping', ping>;
type findNodeReq = reqMsg<'find_node', findNode>;
type getPeersReq = reqMsg<'get_peers', getPeers>;
type announceReq = reqMsg<'announce_peer', announcePeer>;

interface resMsg {
  t: Buffer,
  y: 'r',
  r: findNodeRes,
}

type message = pingReq | findNodeReq | getPeersReq | announceReq | resMsg;

class DhtNode extends EventEmitter {
  address: string;
  port: number;
  udp: Socket;
  nid: nodeId;
  nodes: NodeTable;
  infohashs: InfoHashTable;
  database: Database;
  constructor(address: string, port: number) {
    super();
    this.udp = dgram.createSocket('udp4');
    this.address = address;
    this.port = port;
    this.nid = randomId();
    this.nodes = new NodeTable();
    this.infohashs = new InfoHashTable();
    this.database = new Database();
    // this.infohashs.on('full', (infohashs: infohashData[]) => {
    //   this.database.insertInfohash(infohashs);
    // })
  };
  findNodeRequest(node: node | noNidNode, otherId?: Buffer) {
    // 每次发送请求时更新nid，增加在其他节点的存在个数，同时也能增加被推送给其他节点的几率
    // 如果是初始节点就重新生成，来自于其他节点保留对方前半部分，增加被对方保留几率
    const nid = otherId === undefined ? randomId() : Buffer.concat([otherId.slice(0, 10), randomId().slice(10)]);;
    const msg: findNodeReq = {
      t: transactionId(),
      y: 'q',
      q: 'find_node',
      a: {
        id: nid,
        target: randomId(),
      }
    }
    this.sendKRPC(msg, node);
  };
  addNode(nodes: node[] | node) {
    Array.isArray(nodes) ?
      nodes.forEach(node => this.nodes.add(node))
      :
      this.nodes.add(nodes);
  };
  addInfoHash(infoHash: infoHash, node: node, type: 'get_peers' | 'announce_peer') {
    logger.info(`has new infohash`);
    this.infohashs.add(infoHash, node, type) && this.database.insertInfohash([{
      infohash: infoHash.toString('hex'),
      address: node.address,
      port: node.port,
      type,
    }]);
  }

  sendKRPC(msg: message, node: noNidNode) {
    let buf: Buffer;
    try {
      buf = bencode.encode(msg);
    } catch (err) {
      logger.error(err);
      return;
    }
    this.udp.send(buf, 0, buf.length, node.port, node.address, (err) => {
      err && logger.error(err);
    });
  };
  joinNetwork(routeTable: noNidNode[]) {
    let table: noNidNode[] = [];
    this.nodes.foreach((node) => table.push(node));
    routeTable.concat(table).forEach((node: noNidNode) => this.findNodeRequest(node, this.nid));
  }
  start(routeTable: noNidNode[]) {
    this.udp.bind(this.port, this.address);
    this.udp.on('listening', () => {
      logger.info(`UDP Server listening on ${this.address}, ${this.port}`);
    });
    this.udp.on('message', (msg: Buffer, rinfo: { address: string, family: string, port: number, size: number }) => {
      this.onMessage(bencode.decode(msg), { address: rinfo.address, port: rinfo.port });
    });
    setInterval(() => this.joinNetwork(routeTable), 5000);
    setInterval(() => {
      let table: nodeData[] = [];
      this.nodes.foreach((node) => table.push(node));
      this.database.insertNode(table);
    }, 60000);
  };
  onMessage(message: any, node: noNidNode) {
    // 因目前发送仅做find_node，所以response只有find_node一种类型
    if (message.y.toString() == 'r') {
      // console.log('request find_node')
      if (message.r.nodes) {
        const nodes = decodeNodes(message.r.nodes)
        this.addNode(nodes);
      }
    } else {
      const otherNode = { ...node, nid: message.a.id };
      switch (message.q.toString()) {
        case 'find_node':
          // console.log('message find_node', node)
          this.addNode(otherNode);
          break;
        case 'get_peers':
          // console.log('message get_peers')
          this.addNode(otherNode);
          this.addInfoHash(message.a['info_hash'], otherNode, 'get_peers');
          break;
        case 'announce_peer':
          // console.log('message announce_peer')
          this.addNode(otherNode);
          this.addInfoHash(message.a['info_hash'], otherNode, 'announce_peer');
          break;
      }
    }
  }

}



export default DhtNode;