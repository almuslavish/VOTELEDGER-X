const RPC_URL = 'http://localhost:5000/api/bitcoin/rpc';

async function rpc(method, params = []) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '1.0', id: 'voteledger', method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'RPC error');
  return data.result;
}

export async function getRegtestStatus() {
  const count = await rpc('getblockcount');
  return { connected: true, blockCount: count };
}

export async function mineBlock(address, blocks = 1) {
  return rpc('generatetoaddress', [blocks, address]);
}

export async function getMempool() {
  return rpc('getrawmempool');
}
EOF