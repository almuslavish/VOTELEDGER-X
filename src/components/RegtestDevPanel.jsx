import React, { useState, useEffect } from 'react';
import { getRegtestStatus, mineBlock, getMempool } from '../services/bitcoinRegtest';

export default function RegtestDevPanel() {
  const [status, setStatus] = useState(null);
  const [mining, setMining] = useState(false);
  const [mempool, setMempool] = useState([]);

  const refresh = async () => {
    try {
      const s = await getRegtestStatus();
      setStatus(s);
      const mp = await getMempool();
      setMempool(mp);
    } catch (e) {
      setStatus({ connected: false, blockCount: 0 });
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleMine = async () => {
    setMining(true);
    try {
      await mineBlock('bcrt1qs758ursh4q5nftc5d035xk6z0r9ly99l0m8l7j', 1);
      await refresh();
    } catch (e) {
      setStatus({ connected: false, blockCount: 0 });
    } finally {
      setMining(false);
    }
  };

  const connected = status?.connected;

  return (
    <div className="fixed bottom-4 right-4 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl w-72 text-xs space-y-3 z-50">
      <div className="flex items-center justify-between">
        <span className="font-bold text-white">Regtest Dev Panel</span>
        <span className={`px-2 py-0.5 rounded-full font-bold ${connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
          {connected ? 'Connected' : 'Offline'}
        </span>
      </div>
      <div className="text-slate-300">
        Block Height: <span className="font-mono text-amber-400">{status?.blockCount ?? '—'}</span>
      </div>
      <div className="text-slate-300">
        Mempool: <span className="font-mono text-slate-200">{mempool.length} tx</span>
      </div>
      <button onClick={handleMine} disabled={!connected || mining} className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg disabled:opacity-50 transition">
        {mining ? 'Mining...' : 'Mine 1 Block'}
      </button>
    </div>
  );
}
EOF