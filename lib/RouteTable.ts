import _ from 'lodash';
import { EventEmitter } from 'events';
import logger from './Logger';
import { randomId, distance } from '../src/util';

interface routeNode {
  nid: Buffer,
  address: string,
  port: number,
  status?: 1 | 2 | 3, // 1 good 2 pending 3 bad
  isMe: 1 | 0,
}

interface cacheNode {
  [oldNid: string]: [number, routeNode],
}


/**
 * k-bucket，用来存储Kad网络中邻居节点的数据结构。
 * 结构主体是一个二维数组，一级数组长度与节点nid长度相同，二级数组长度固定为8。
 * 二级数组的下标n是指该二级数组中的所有nid与自身节点的nid的第n位bit相同。
 * 初始状态一级数组长度为1，当二级数组长度为8同时有新节点要加入时，该二级数组分裂为2个，
 * 将所有第一位bit与自身节点不同的nid留在原数组中，将其他的节点放入第二个数组。
 */

class KBucket extends EventEmitter {
  private buckets: routeNode[][];
  private bit: number;
  private cache: cacheNode;
  readonly k: number;
  readonly nid: Buffer;
  hasMe: boolean;
  constructor() {
    super();
    this.k = 8;
    this.nid = randomId();
    this.bit = this.nid.length;
    this.buckets = [[]];
    this.cache = {};
  }
  addCache(node: node) {
    if (node.nid === undefined) {
      logger.error('node hasn\'t nid');
      return;
    }
    const rNode: routeNode = {
      nid: node.nid,
      ...node,
      isMe: 0,
    }
    const d = distance(this.nid, node.nid);
    const index = this.buckets.length >= d ? d - 1 : this.buckets.length - 1;
    const res = _.find(this.buckets[index], (v) => node.nid.equals(v.nid));
    if (res) {
      return;
    }
    if (this.buckets[index].length >= 8) {
      let nid: Buffer;
      let _node: [number, routeNode];
      do {
        nid = this.buckets[index][0].nid;
        _node = this.cache[nid.toString()];
      } while (_node === undefined)
      this.emit('ping', nid);
      this.cache = {
        ...this.cache,
        [node.nid.toString()]: [d, rNode],
      }
    } else {
      this.buckets[index].push({
        ...rNode,
        status: 1,
      });
    }

  }
  comfirm(nid: Buffer, success: 1 | 0) {
    const [number, cacheNode] = this.cache[nid.toString()];
    const [_node] = _.remove(this.buckets[number - 1], v => v.nid.equals(nid));
    if (success) {
      this.buckets[number - 1].push(_node);
    } else {
      this.buckets[number - 1].push(cacheNode);
    }
  }
}

export default KBucket;