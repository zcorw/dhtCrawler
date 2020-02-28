import Node from './lib/Node';

const client = new Node('0.0.0.0', 6880);
const BOOTSTRAP_NODES = [
  { address: 'h4.trakx.nibba.trade', port: 80 },
  { address: 'router.utorrent.com', port: 6881 },
  { address: 'dht.aelitis.com', port: 6881 },
  { address: '173.249.44.180', port: 41060 },
  { address: '218.103.128.176', port: 6881 },
  { address: '90.218.143.154', port: 51413 },
  { address: '153.179.3.205', port: 14525 },
];

client.start(BOOTSTRAP_NODES);