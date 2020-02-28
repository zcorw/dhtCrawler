/**
 * 数据库
 */

import { STRING, INTEGER, Model, Sequelize, DataType } from 'sequelize';
import path from 'path';

const cwd: string = process.cwd();

type modelOp = {
  [key: string]: { primaryKey: true, type: DataType } | DataType;
}

const nodeOp: modelOp = {
  nid: {
    primaryKey: true,
    type: STRING,
  },
  address: STRING,
  port: INTEGER,
}

const infohashOp: modelOp = {
  infohash: {
    primaryKey: true,
    type: STRING,
  },
  address: STRING,
  port: INTEGER,
  type: STRING,
}

class nodeModel extends Model { }
class infohashModel extends Model { }

export default class Database {
  db: Sequelize;
  nodeM: typeof nodeModel;
  infohashM: typeof infohashModel;
  constructor() {
    this.db = new Sequelize('store', null, null, {
      dialect: 'sqlite',
      storage: path.join(cwd, 'store.db'),
      logging: false,
    });
    this.db.sync();
    this.nodeM = nodeModel;
    this.infohashM = infohashModel;
    this.nodeM.init(nodeOp, { sequelize: this.db, modelName: 'node' });
    this.infohashM.init(infohashOp, { sequelize: this.db, modelName: 'infohash' });

  }
  insertNode(nodes: nodeData[]) {
    this.db.transaction((t) => {
      return Promise.all(nodes.map(node => this.nodeM.upsert(node, { transaction: t })));
    });
  }
  insertInfohash(infohashs: infohashData[]) {
    this.db.transaction((t) => {
      return Promise.all(infohashs.map(infohash => this.infohashM.upsert(infohash, { transaction: t })));
    });
  }
}