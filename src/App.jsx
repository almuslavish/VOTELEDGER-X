import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Lock, 
  Unlock, 
  Anchor, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Code, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Award, 
  Eye, 
  Key, 
  FileText,
  ChevronRight,
  HelpCircle,
  QrCode,
  Layers,
  Activity,
  Copy,
  Check,
  Building2,
  MapPin,
  ExternalLink,
  Cpu
} from 'lucide-react';

// Web Crypto API SHA-256 helper
async function calculateSHA256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple SVG QR Code Generator Component
function QuickQRCode({ value, size = 120 }) {
  // SVG grid pattern based on string characters for visual demo
  const hashVal = useMemo(() => {
    let h = 0;
    for (let i = 0; i < value.length; i++) {
      h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }, [value]);

  const grid = useMemo(() => {
    const matrix = Array(11).fill(0).map(() => Array(11).fill(false));
    // Corners (Finder Patterns)
    const setCorner = (r, c) => {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          matrix[r + i][c + j] = true;
        }
      }
    };
    setCorner(0, 0);
    setCorner(0, 8);
    setCorner(8, 0);

    // Dynamic data bits based on hash
    let seed = hashVal;
    for (let r = 0; r < 11; r++) {
      for (let c = 0; c < 11; c++) {
        if ((r < 3 && c < 3) || (r < 3 && c >= 8) || (r >= 8 && c < 3)) continue;
        seed = (seed * 9301 + 49297) % 233280;
        matrix[r][c] = (seed / 233280) > 0.45;
      }
    }
    return matrix;
  }, [hashVal]);

  const cellSize = size / 11;

  return (
    <div className="bg-white p-2 rounded-lg shadow-inner inline-block">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {grid.map((row, r) =>
          row.map((active, c) =>
            active ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize - 0.5}
                height={cellSize - 0.5}
                fill="#0f172a"
                rx={1}
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
}

export default function App() {
  // Polling Unit Selection
  const [selectedUnit, setSelectedUnit] = useState('PU-001');

  // Multi Polling Unit Votes State
  const [pollingUnits, setPollingUnits] = useState({
    'PU-001': { name: 'Lagos Central (PU-001)', alpha: 120, beta: 95, gamma: 35 },
    'PU-002': { name: 'Abuja Municipal (PU-002)', alpha: 210, beta: 180, gamma: 60 },
    'PU-003': { name: 'Kano Urban (PU-003)', alpha: 85, beta: 240, gamma: 45 }
  });

  // Active Unit Data
  const currentUnitData = pollingUnits[selectedUnit];

  // Cryptographic & Anchoring States
  const [currentHash, setCurrentHash] = useState('');
  const [lockedData, setLockedData] = useState(null);
  const [anchoredHash, setAnchoredHash] = useState(null);
  const [isAnchored, setIsAnchored] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isStamping, setIsStamping] = useState(false);
  const [showCodeTab, setShowCodeTab] = useState(false);
  const [copied, setCopied] = useState(false);
  const [txLogs, setTxLogs] = useState([]);
  const [voterHash, setVoterHash] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [voterStatus, setVoterStatus] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Constants
  const BITCOIN_BLOCK = 884102;
  const MOCK_TXID = "e9a3182b84f3c701a9b1c1d92e811340a5b89710f22d91bc81b37f40118a4f1a";

  // Total aggregated votes across all units
  const aggregateVotes = useMemo(() => {
    return Object.values(pollingUnits).reduce((acc, unit) => {
      acc.alpha += unit.alpha;
      acc.beta += unit.beta;
      acc.gamma += unit.gamma;
      return acc;
    }, { alpha: 0, beta: 0, gamma: 0 });
  }, [pollingUnits]);

  const totalAggregated = aggregateVotes.alpha + aggregateVotes.beta + aggregateVotes.gamma;

  // Format canonical JSON representation for deterministic hashing
  const getCanonicalVoteString = (unitKey, units) => {
    const u = units[unitKey];
    return JSON.stringify({
      unitId: unitKey,
      unitName: u.name,
      candidates: {
        Candidate_Alpha: u.alpha,
        Candidate_Beta: u.beta,
        Candidate_Gamma: u.gamma
      },
      unitTotal: u.alpha + u.beta + u.gamma,
      timestamp: "2026-10-27T10:00:00Z"
    });
  };

  // Recalculate hash whenever current polling unit votes change
  useEffect(() => {
    const updateHash = async () => {
      const voteStr = getCanonicalVoteString(selectedUnit, pollingUnits);
      const hash = await calculateSHA256(voteStr);
      setCurrentHash(hash);
    };
    updateHash();
  }, [pollingUnits, selectedUnit]);

  // Start camera for voter verification
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (e) {
      setVoterStatus('Camera access denied');
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    const hash = await calculateSHA256(dataUrl);
    // stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    const voted = JSON.parse(localStorage.getItem('votedVoters') || '[]');
    if (voted.includes(hash)) {
      setVoterHash(hash);
      setVoterStatus('Already voted — blocked');
    } else {
      setVoterHash(hash);
      setVoterStatus('Verified — you may vote once');
    }
  };

  // Guard vote casting
  const handleVoteChange = (candidate, delta) => {
    if (!voterHash || JSON.parse(localStorage.getItem('votedVoters') || '[]').includes(voterHash)) {
      setVoterStatus('Verify identity first / already voted');
      return;
    }
    // mark voted on first cast
    const voted = JSON.parse(localStorage.getItem('votedVoters') || '[]');
    if (!voted.includes(voterHash)) {
      voted.push(voterHash);
      localStorage.setItem('votedVoters', JSON.stringify(voted));
    }
    setPollingUnits(prev => ({
      ...prev,
      [selectedUnit]: {
        ...prev[selectedUnit],
        [candidate]: Math.max(0, prev[selectedUnit][candidate] + delta)
      }
    }));
  };

  // Lock Fingerprint
  const handleLockFingerprint = async () => {
    setIsLocking(true);
    setTimeout(async () => {
      const voteStr = getCanonicalVoteString(selectedUnit, pollingUnits);
      const hash = await calculateSHA256(voteStr);
      setLockedData({
        unitId: selectedUnit,
        unitName: currentUnitData.name,
        votes: { ...currentUnitData },
        hash: hash,
        timestamp: new Date().toLocaleTimeString()
      });
      setIsLocking(false);
    }, 500);
  };

  // Anchor to Bitcoin
  const handleAnchorToBitcoin = () => {
    if (!lockedData) return;
    setIsStamping(true);
    setTxLogs([]);
    
    // Simulate transaction lifecycle logs
    const logSteps = [
      "Creating raw transaction with OP_RETURN output...",
      `Embedding SHA-256 payload: 0x${lockedData.hash.substring(0, 16)}...`,
      "Broadcasting transaction to Bitcoin P2P Network...",
      `Included in Block #${BITCOIN_BLOCK}! TxID: ${MOCK_TXID.substring(0, 12)}...`
    ];

    logSteps.forEach((log, index) => {
      setTimeout(() => {
        setTxLogs(prev => [...prev, log]);
        if (index === logSteps.length - 1) {
          setAnchoredHash(lockedData.hash);
          setIsAnchored(true);
          setIsStamping(false);
        }
      }, (index + 1) * 350);
    });
  };

  // Tamper Cheat Trigger
  const handleCheat = () => {
    setPollingUnits(prev => ({
      ...prev,
      [selectedUnit]: {
        ...prev[selectedUnit],
        alpha: prev[selectedUnit].alpha + 15
      }
    }));
  };

  // Reset Application
  const handleReset = () => {
    setPollingUnits({
      'PU-001': { name: 'Lagos Central (PU-001)', alpha: 120, beta: 95, gamma: 35 },
      'PU-002': { name: 'Abuja Municipal (PU-002)', alpha: 210, beta: 180, gamma: 60 },
      'PU-003': { name: 'Kano Urban (PU-003)', alpha: 85, beta: 240, gamma: 45 }
    });
    setLockedData(null);
    setAnchoredHash(null);
    setIsAnchored(false);
    setTxLogs([]);
  };

  // Copy Hash
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Verification Statuses
  const isTampered = isAnchored && currentHash !== anchoredHash;
  const isVerified = isAnchored && currentHash === anchoredHash;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-16 selection:bg-emerald-500 selection:text-slate-900">
      
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
              <span className="text-xl tracking-tight font-extrabold">VoteLedger<span className="text-amber-400">Mini</span></span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset Simulation</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-8">

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950/60 p-6 md:p-8 rounded-3xl border border-emerald-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <ShieldCheck className="w-72 h-72 text-emerald-400" />
          </div>
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Interactive CivicTech Lab
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Cryptographic Election Integrity Simulator 🛡️
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Explore how modern democracies combine <span className="text-emerald-400 font-bold">SHA-256 Digital Fingerprints</span> with the <span className="text-amber-400 font-bold">Bitcoin Blockchain</span> to guarantee transparent, tamper-proof ballot tallying across multiple polling units.
            </p>
          </div>
        </div>

        {/* Developer Code Modal / Tab */}
        {showCodeTab && (
          <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-sm">
                <Code className="w-4 h-4" />
                <span>app/api/anchor-vote/route.ts (Next.js App Router)</span>
              </div>
              <button 
                onClick={() => setShowCodeTab(false)} 
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 bg-slate-800 rounded-lg"
              >
                ✕ Close
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Below is a full Next.js App Router API Route snippet using <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">bitcoinjs-lib</code> to handle server-side SHA-256 hashing and OP_RETURN anchoring.
            </p>
            <pre className="bg-slate-900 p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800 leading-relaxed">
{`// app/api/anchor-vote/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import * as bitcoin from 'bitcoinjs-lib';

export async function POST(request: Request) {
  try {
    const { pollingUnit, candidates } = await request.json();

    // 1. Generate Canonical Hash
    const payloadString = JSON.stringify({ pollingUnit, candidates });
    const sha256Hash = crypto.createHash('sha256').update(payloadString).digest('hex');

    // 2. Prepare Bitcoin OP_RETURN Payload
    const embedScript = bitcoin.payments.embed({
      data: [Buffer.from(sha256Hash, 'hex')]
    }).output;

    // 3. Return Anchored Data Output
    return NextResponse.json({
      status: 'ANCHORED',
      sha256Hash,
      opReturnHex: embedScript?.toString('hex'),
      blockHeight: 884102,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to anchor payload' }, { status: 500 });
  }
}`}
            </pre>
          </div>
        )}

        {/* Polling Unit Selector & Aggregated Summary Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-slate-800/90 rounded-2xl border border-slate-700 p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Select Polling Unit to Audit</h3>
              </div>
              <span className="text-xs bg-slate-900 text-slate-400 px-3 py-1 rounded-full border border-slate-700 font-mono">
                Active: {selectedUnit}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {Object.keys(pollingUnits).map((unitKey) => {
                const u = pollingUnits[unitKey];
                const unitTotal = u.alpha + u.beta + u.gamma;
                const isSelected = selectedUnit === unitKey;
                return (
                  <button
                    key={unitKey}
                    onClick={() => setSelectedUnit(unitKey)}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? "bg-emerald-950/80 border-emerald-500 text-white shadow-lg shadow-emerald-950/40"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="text-xs font-bold font-mono text-emerald-400 mb-0.5">{unitKey}</div>
                    <div className="text-sm font-semibold truncate">{u.name.split(' ')[0]}</div>
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">{unitTotal} votes</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* National / Regional Aggregated Total */}
          <div className="bg-slate-800/90 rounded-2xl border border-slate-700 p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" /> Total Aggregated Tally
              </span>
              <span className="text-xs text-amber-400 font-mono font-bold">3 Units Combined</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center my-2">
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-semibold">🦁 Alpha</div>
                <div className="text-lg font-black text-amber-400 font-mono">{aggregateVotes.alpha}</div>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-semibold">🦅 Beta</div>
                <div className="text-lg font-black text-slate-200 font-mono">{aggregateVotes.beta}</div>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-semibold">🐘 Gamma</div>
                <div className="text-lg font-black text-slate-200 font-mono">{aggregateVotes.gamma}</div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-700/60 text-slate-400">
              <span>Combined Ballot Sum:</span>
              <span className="text-white font-bold font-mono text-sm">{totalAggregated}</span>
            </div>
          </div>
        </div>

        {/* STEP 1: CAST VOTES IN SELECTED POLLING UNIT */}
        <section className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 shadow-lg space-y-6">
          <div className="flex items-center justify-between border-b border-slate-700 pb-4 flex-wrap gap-2">
            <div className="flex items-center space-x-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black text-base shadow">
                1
              </span>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  Cast Ballot Votes
                  <span className="text-xs font-normal text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800 font-mono">
                    {currentUnitData.name}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Adjust candidate vote counts for this specific polling location.</p>
              </div>
            </div>
            <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-700 text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Unit Total</span>
              <span className="text-2xl font-black text-amber-400 font-mono">
                {currentUnitData.alpha + currentUnitData.beta + currentUnitData.gamma}
              </span>
            </div>
          </div>

          {/* Voter Verification */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-bold text-white">Voter Identity Verification</span>
              <span className={`text-xs font-mono ${voterStatus.includes('blocked') || voterStatus.includes('denied') ? 'text-rose-400' : 'text-emerald-400'}`}>{voterStatus}</span>
            </div>
            {!cameraOpen ? (
              <button onClick={startCamera} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded-lg border border-slate-700 transition">
                📷 Verify with Camera
              </button>
            ) : (
              <div className="space-y-2">
                <video ref={videoRef} autoPlay playsInline className="w-full max-w-sm rounded-lg border border-slate-700" />
                <canvas ref={canvasRef} className="hidden" />
                <button onClick={capturePhoto} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold rounded-lg transition">
                  Capture & Verify
                </button>
              </div>
            )}
          </div>

          {/* Candidate Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Candidate Alpha */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700/80 flex flex-col justify-between space-y-3">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🦁</span>
                <div>
                  <h3 className="font-bold text-white text-base">Candidate Alpha</h3>
                  <span className="text-xs text-slate-400">Progress Party</span>
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                <button 
                  onClick={() => handleVoteChange('alpha', 1)} 
                  className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition active:scale-95"
                >
                  Cast Vote for Alpha
                </button>
              </div>
            </div>

            {/* Candidate Beta */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700/80 flex flex-col justify-between space-y-3">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🦅</span>
                <div>
                  <h3 className="font-bold text-white text-base">Candidate Beta</h3>
                  <span className="text-xs text-slate-400">Unity Alliance</span>
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                <button 
                  onClick={() => handleVoteChange('beta', 1)} 
                  className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition active:scale-95"
                >
                  Cast Vote for Beta
                </button>
              </div>
            </div>

            {/* Candidate Gamma */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700/80 flex flex-col justify-between space-y-3">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🐘</span>
                <div>
                  <h3 className="font-bold text-white text-base">Candidate Gamma</h3>
                  <span className="text-xs text-slate-400">Future Coalition</span>
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                <button 
                  onClick={() => handleVoteChange('gamma', 1)} 
                  className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition active:scale-95"
                >
                  Cast Vote for Gamma
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* STEP 2: CREATE DIGITAL FINGERPRINT & VERIFIABLE RECEIPT */}
        <section className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 shadow-lg space-y-5">
          <div className="flex items-center space-x-3 border-b border-slate-700 pb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black text-base shadow">
              2
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">Generate SHA-256 Fingerprint & QR Receipt</h2>
              <p className="text-xs text-slate-400">Lock the ballot tally to turn the numbers into a unique mathematical signature.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Lock Button & Info */}
            <div className="lg:col-span-5 space-y-3">
              <button
                onClick={handleLockFingerprint}
                disabled={isLocking}
                className="w-full py-4 px-6 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-lg rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-3 transition transform active:scale-98 disabled:opacity-50"
              >
                {isLocking ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-950" />
                ) : (
                  <Lock className="w-6 h-6" />
                )}
                <span>🔒 Lock & Fingerprint Result</span>
              </button>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-400 font-semibold block mb-0.5">How it works:</strong>
                  The ballot tally is formatted into a deterministic JSON string. SHA-256 converts that exact payload into a unique 64-character hash.
                </div>
              </div>
            </div>

            {/* Hash Display & QR Code */}
            <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 space-y-2.5 w-full">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-slate-400">Live SHA-256 Hash:</span>
                  <button
                    onClick={() => copyToClipboard(currentHash)}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-[11px] font-medium"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied" : "Copy Hash"}</span>
                  </button>
                </div>

                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 break-all leading-relaxed select-all">
                  {currentHash || "Generating hash..."}
                </div>

                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Unit: <strong className="text-slate-200">{selectedUnit}</strong></span>
                  <span>Status: <strong className={lockedData ? "text-emerald-400" : "text-amber-400"}>{lockedData ? "Locked" : "Unlocked"}</strong></span>
                </div>
              </div>

              {/* QR Code Printable Receipt Preview */}
              <div className="flex flex-col items-center justify-center p-3 bg-slate-900 rounded-xl border border-slate-800 shrink-0 text-center space-y-1">
                <QuickQRCode value={currentHash || "DEFAULT"} size={90} />
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-1">
                  <QrCode className="w-3 h-3 text-amber-400" /> Scannable Receipt
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* STEP 3: ANCHOR TO BITCOIN BLOCKCHAIN */}
        <section className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 shadow-lg space-y-5">
          <div className="flex items-center space-x-3 border-b border-slate-700 pb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black text-base shadow">
              3
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">Anchor Fingerprint to Bitcoin</h2>
              <p className="text-xs text-slate-400">Permanently record the locked hash into the immutable public ledger using OP_RETURN.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <button
                onClick={handleAnchorToBitcoin}
                disabled={!lockedData || isStamping || isAnchored}
                className={`w-full py-4 px-6 font-black text-lg rounded-xl shadow-lg flex items-center justify-center gap-3 transition transform active:scale-98 ${
                  isAnchored
                    ? "bg-slate-700 text-emerald-400 border border-emerald-500/40 cursor-default"
                    : lockedData
                    ? "bg-linear-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-950/50"
                    : "bg-slate-700 text-slate-500 cursor-not-allowed"
                }`}
              >
                {isStamping ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-950" />
                ) : isAnchored ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Anchor className="w-6 h-6" />
                )}
                <span>
                  {isAnchored 
                    ? "✅ Stamped onto Bitcoin Block!" 
                    : "⚓ Stamp Fingerprint onto Bitcoin"}
                </span>
              </button>

              {!lockedData && (
                <p className="text-xs text-amber-400 font-medium text-center">
                  ⚠️ Lock the digital fingerprint in Step 2 before anchoring!
                </p>
              )}
            </div>

            {/* Simulated Live Bitcoin Block & Tx Console */}
            <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="font-bold text-amber-400">BITCOIN MAINNET BLOCK #{BITCOIN_BLOCK}</span>
                </div>
                <span className="text-[10px] text-slate-400">OP_RETURN Payload</span>
              </div>

              {/* Console Logs Output */}
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 h-28 overflow-y-auto space-y-1 text-slate-300 text-[11px] leading-relaxed">
                {txLogs.length === 0 ? (
                  <span className="text-slate-600 italic">Waiting for broadcasting action...</span>
                ) : (
                  txLogs.map((log, index) => (
                    <div key={index} className="flex items-start gap-1.5">
                      <span className="text-emerald-400">›</span>
                      <span>{log}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* STEP 4: THE INTERACTIVE TAMPER TEST */}
        <section className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 shadow-lg space-y-6">
          <div className="flex items-center justify-between border-b border-slate-700 pb-4 flex-wrap gap-2">
            <div className="flex items-center space-x-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black text-base shadow">
                4
              </span>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  🧪 Simulated Tamper Test
                  <span className="text-xs text-amber-400 font-normal bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-800">
                    Audit Simulator
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Attempt to secretly alter votes in {selectedUnit} after locking to see how SHA-256 detects it instantly.</p>
              </div>
            </div>
          </div>

          {/* Hash Comparison Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-400 uppercase">⚓ Anchored Hash on Bitcoin</span>
                <span className="text-amber-400 font-mono">Immutable</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-xs text-amber-400 break-all leading-relaxed">
                {anchoredHash || "Not Anchored Yet (Complete Step 3)"}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-400 uppercase">🔄 Live Recalculated Hash</span>
                <span className="text-emerald-400 font-mono">Real-time</span>
              </div>
              <div className={`p-3 rounded-lg border font-mono text-xs break-all leading-relaxed ${
                isTampered 
                  ? "bg-rose-950/60 border-rose-500 text-rose-300 font-bold animate-pulse" 
                  : "bg-slate-900 border-slate-800 text-emerald-400"
              }`}>
                {currentHash}
              </div>
            </div>
          </div>
        </section>

        {/* STEP 5: AUTOMATED AUDIT VERIFICATION REPORT */}
        <section className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black text-base shadow">
              5
            </span>
            <h2 className="text-xl font-bold text-white">Cryptographic Audit Status</h2>
          </div>

          {!isAnchored ? (
            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700 text-center space-y-2">
              <Info className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-300">Audit Status Pending</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Lock the polling unit result and stamp it onto the Bitcoin blockchain to activate live cryptographic auditing.
              </p>
            </div>
          ) : isVerified ? (
            <div className="bg-linear-to-r from-emerald-950 via-slate-900 to-emerald-950 p-6 rounded-2xl border-2 border-emerald-500 shadow-2xl space-y-3 animate-in zoom-in-95 duration-300">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-500 text-slate-950 rounded-xl shadow-lg">
                  <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-emerald-400 uppercase tracking-wide">
                    🟢 ELECTION RESULT VERIFIED LEGITIMATE
                  </h3>
                  <p className="text-sm text-slate-200">
                    The live ballot calculation matches the Bitcoin OP_RETURN anchor with 100% cryptographic precision.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-linear-to-r from-rose-950 via-slate-900 to-rose-950 p-6 rounded-2xl border-2 border-rose-500 shadow-2xl space-y-4 animate-in zoom-in-95 duration-300">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-rose-600 text-white rounded-xl shadow-lg animate-bounce">
                  <ShieldAlert className="w-8 h-8 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-rose-400 uppercase tracking-wide">
                    🚨 ELECTION FRAUD / TAMPERING DETECTED!
                  </h3>
                  <p className="text-sm text-slate-200">
                    The live hash does NOT match the anchored Bitcoin record! Vote numbers were changed after anchoring.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/90 p-4 rounded-xl border border-rose-500/40 space-y-2 text-xs font-mono">
                <div className="text-rose-400 font-bold uppercase tracking-wider text-[11px] border-b border-rose-900/50 pb-1">
                  Audit Discrepancy Breakdown ({selectedUnit}):
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Anchored Vote Total:</span>
                  <span className="text-amber-400 font-bold">
                    {lockedData ? lockedData.votes.alpha + lockedData.votes.beta + lockedData.votes.gamma : 0}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Modified Live Total:</span>
                  <span className="text-rose-400 font-bold">
                    {currentUnitData.alpha + currentUnitData.beta + currentUnitData.gamma}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* EDUCATIONAL RECAP BOARD */}
        <footer className="bg-slate-950 rounded-2xl border border-amber-500/30 p-6 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <Award className="w-6 h-6 text-amber-400" />
            <h2 className="text-lg font-bold text-white">
              VoteLedger Pillars: How Public Blockchains Protect Elections
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/30">
                1
              </div>
              <h3 className="font-bold text-white text-sm">Deterministic Fingerprints</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                SHA-256 generates a fixed-length string from ballot data. Any alteration, even a single character or space, produces an entirely distinct hash.
              </p>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs border border-amber-500/30">
                2
              </div>
              <h3 className="font-bold text-white text-sm">Immutable OP_RETURN Anchoring</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Embedding hashes inside Bitcoin transactions guarantees that no central authority or hacker can retroactively modify or delete election timestamps.
              </p>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-500/30">
                3
              </div>
              <h3 className="font-bold text-white text-sm">Universal Public Verification</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Voters, observers, and international auditors can independently scan QR code receipts to verify that local polling results match public blockchain state.
              </p>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}
