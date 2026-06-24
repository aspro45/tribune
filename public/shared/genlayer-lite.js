// genlayer-lite.js - a tiny shared client for the static project frontends.
// Reads use genlayer-js (from esm.sh CDN). Writes go through the connected
// wallet (MetaMask), with the gas fields forced to legacy gasPrice=0 so the
// wallet's gas oracle cannot wrongly claim "insufficient funds for fees" on a
// zero-fee network like studionet.
import { createClient, createAccount } from "https://esm.sh/genlayer-js@latest";
import { studionet } from "https://esm.sh/genlayer-js@latest/chains";

export const RPC = "https://studio.genlayer.com/api";
export const STUDIONET_HEX = "0xf22f"; // 61999

const reader = createClient({ chain: studionet, account: createAccount() });

export async function withRetry(fn, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) {
      last = e;
      const msg = (e?.message || e || "").toString();
      if (!/failed to fetch|network|timeout|429|503/i.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw last;
}

export function makeReader(address) {
  return {
    read: (functionName, args = []) =>
      withRetry(() => reader.readContract({ address, functionName, args })),
  };
}

export async function rpc(method, params) {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || method + " failed");
  return j.result;
}

export async function balanceOf(address) {
  return BigInt(await rpc("eth_getBalance", [address, "latest"]));
}

async function ensureStudionet(provider) {
  if (!provider?.request) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: STUDIONET_HEX }] });
  } catch (err) {
    if (err && (err.code === 4902 || /Unrecognized chain/i.test(err.message || ""))) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: STUDIONET_HEX,
          chainName: "GenLayer Studionet",
          nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
          rpcUrls: [RPC],
          blockExplorers: [{ name: "Studio", url: "https://studio.genlayer.com" }],
        }],
      });
    } else { throw err; }
  }
}

// Patch an injected provider so eth_sendTransaction always goes out as a legacy
// zero-gas-price transaction. Stops MetaMask's oracle from overriding the fee.
function wrapProvider(provider) {
  if (!provider || provider.__glPatched) return provider;
  const orig = provider.request.bind(provider);
  provider.request = async (req) => {
    if (req?.method === "eth_sendTransaction" && Array.isArray(req.params) && req.params[0]) {
      const tx = { ...req.params[0] };
      tx.type = "0x0";
      tx.gasPrice = "0x0";
      delete tx.maxFeePerGas;
      delete tx.maxPriorityFeePerGas;
      if (!tx.gas) tx.gas = "0x100000";
      return orig({ method: "eth_sendTransaction", params: [tx] });
    }
    return orig(req);
  };
  provider.__glPatched = true;
  return provider;
}

export async function connectWallet() {
  const eth = window.ethereum;
  if (!eth) throw new Error("No EVM wallet found. Install MetaMask.");
  const accts = await eth.request({ method: "eth_requestAccounts" });
  await ensureStudionet(eth);
  return accts[0];
}

export async function activeAccount() {
  const eth = window.ethereum;
  if (!eth) return null;
  try {
    const accs = await eth.request({ method: "eth_accounts" });
    return Array.isArray(accs) && accs[0] ? accs[0] : null;
  } catch (_) { return null; }
}

export async function write(address, functionName, args = [], value = 0n, waitStatus = "ACCEPTED") {
  const eth = window.ethereum;
  if (!eth) throw new Error("No EVM wallet found. Install MetaMask.");
  await ensureStudionet(eth);
  let signer = await activeAccount();
  if (!signer) signer = (await eth.request({ method: "eth_requestAccounts" }))[0];
  const wrapped = wrapProvider(eth);
  const client = createClient({ chain: studionet, account: signer, provider: wrapped });
  const hash = await client.writeContract({ address, functionName, args, value });
  await client.waitForTransactionReceipt({ hash, status: waitStatus, retries: 200 });
  return hash;
}

export const short = (a) => (a ? a.slice(0, 6) + "..." + a.slice(-4) : "");
export const toGen = (wei) => (Number(BigInt(wei)) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 3 });
export const GEN = (n) => BigInt(Math.round(n * 1e6)) * 10n ** 12n; // GEN float -> wei

export function fmtErr(e) {
  if (!e) return "unknown error";
  if (typeof e === "string") return e;
  const parts = [];
  const add = (v) => { if (v && typeof v === "string" && !parts.includes(v)) parts.push(v); };
  add(e.shortMessage); add(e.details); add(e.message);
  add(e?.data?.message); add(e?.cause?.shortMessage); add(e?.cause?.message);
  add(e?.cause?.data?.message); add(e?.info?.error?.message);
  return parts.length ? parts.join(" | ") : String(e);
}
