/**
 * 这不是一个有效的k-bucket，只是简单的保存节点以及接收到的infohash
 */
import { EventEmitter } from 'events';
import _ from 'lodash';
import moment from 'moment';

interface findNode extends node {
  next?: string,
}

interface peerQueue {
  length: number,
  queue: {
    [nid: string]: findNode,
  },
  head: string,
  tail: string,
}

interface requestNode extends node {
  type: 'get_peers' | 'announce_peer',
  time: string,
}
interface infoHashQueue {
  length: number,
  queue: {
    [infoHash: string]: requestNode,
  }
}

function putNodeAtTail(table: peerQueue, node: node, nid: string) {
  table.queue[nid] = node;
  if (table.length === 0) {
    table.head = nid;
  } else {
    const tail = table.tail;
    console.log("TCL: putNodeAtTail -> tail, nid", tail, nid)
    try {
      table.queue[tail].next = nid;
    } catch (e) {
      console.error(table)
    }

  }
  table.tail = nid;
  table.length++;
}

function removeHead(table: peerQueue) {
  const head = table.head;
  const headNode = table.queue[head];
  table.head = headNode.next;
  table.queue[head] = null;
  table.length--;
}

function moveNodeAtTail(table: peerQueue, nid: string) {
  if (table.head === nid) {
    table.head = table.queue[nid].next || '';
  }
  const tail = table.tail;
  console.log("TCL: moveNodeAtTail -> tail, nid", tail, nid)
  table.queue[tail].next = nid;
  table.tail = nid;
  table.queue[nid].next = undefined;
}

export class NodeTable {
  readonly max: number;
  nodes: peerQueue;
  constructor(maxPeer?: number) {
    this.max = maxPeer | 60;
    this.nodes = { length: 0, queue: {}, head: '', tail: '' };
  }
  add(node: node) {
    const nid: string = node.nid.toString('hex');
    // 如果节点队列中不存在该节点添加节点到队列中，存在的话将节点放到最后
    if (this.nodes.queue[nid]) {
      moveNodeAtTail(this.nodes, nid);
    } else {
      // 如果节点数已经达到上限，删除头节点
      if (this.nodes.length >= this.max) {
        removeHead(this.nodes);
      }
      // 将新节点放到最后
      putNodeAtTail(this.nodes, node, nid);
    }
    return this.nodes.length === this.max;
  }
  foreach(callback: (value: nodeData, index?: number) => void, limit?: number, start?: string, ) {
    let next = start || this.nodes.head;
    let n = 0;
    if (this.nodes.length > 0) {
      do {
        callback({
          ...this.nodes.queue[next],
          nid: next,
        }, n);
        next = this.nodes.queue[next].next;
        n++;
      } while (next || n < limit)
    }

  }
  isFull() {
    return this.nodes.length === this.max;
  }
}

export class InfoHashTable extends EventEmitter {
  readonly max: number;
  infoHashs: infoHashQueue;
  constructor(maxInfoHash?: number) {
    super();
    this.max = maxInfoHash || 5000;
    this.infoHashs = { length: 0, queue: {} };
  }
  add(infoHash: infoHash, node: node, type: 'get_peers' | 'announce_peer'): boolean {
    const hid = infoHash.toString('hex');
    if (this.infoHashs.queue[hid] !== undefined) {
      return false;
    }

    this.infoHashs.queue[hid] = {
      ...node,
      type,
      time: moment().format('YYYY-MM-DD HH:mm'),
    }
    this.infoHashs.length++;

    // 如果达到了上限，则发出通知，并重置队列
    if (this.infoHashs.length === this.max) {
      const queue: infohashData[] = [];
      this.foreach((infoHash: string, node: requestNode) => {
        queue.push({
          ...node,
          infohash: infoHash,
        });
      });
      this.emit('full', queue);
      this.infoHashs = { length: 0, queue: {} };
    }
    return true;
  }
  foreach(callback: (infoHash: string, node: requestNode, index?: number) => void) {
    let n = 0;
    _.forEach(this.infoHashs.queue, (node: requestNode, infoHash: string) => {
      callback(infoHash, node, n);
      n++;
    });
  }
}