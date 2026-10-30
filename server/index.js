import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const RPC_URL = 'http://127.0.0.1:18443';
const RPC_AUTH = 'Basic ' + Buffer.from('dev:devpassword').toString('base64');

app.post('/api/bitcoin/rpc', async (req, res) => {
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': RPC_AUTH,
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error || 'RPC error', offline: false });
    }
    res.json(data);
  } catch (err) {
    res.status(503).json({ error: 'bitcoind offline or unreachable', offline: true, details: err.message });
  }
});

app.listen(5000, () => console.log('Bitcoin RPC proxy running on http://localhost:5000'));