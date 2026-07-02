# Tribune

Bounty review desk for submissions that need evidence before payout.

Tribune turns a bounty into a case file. A sponsor posts the standard and reward, builders submit work, sources are attached, and GenLayer reviews the result before the record is finalized. The app presents the bounty board like an operations surface, with statuses and proof links visible up front.

## Deployed Instance

| Item | Detail |
| --- | --- |
| Network | GenLayer Bradbury |
| Chain ID | `4221` |
| Contract | [`0x6694f5D10f123DD9A8EDF2762690311e53f04deb`](https://explorer-bradbury.genlayer.com/address/0x6694f5D10f123DD9A8EDF2762690311e53f04deb) |
| Deploy tx | [`0xfcc4c86ba58dceb5c683e14b7a15f0af99c92f019f882d94c91617b5e66538b7`](https://explorer-bradbury.genlayer.com/tx/0xfcc4c86ba58dceb5c683e14b7a15f0af99c92f019f882d94c91617b5e66538b7) |
| Deployed | `2026-07-01T23:20:20.395Z` |
| Live app | [`https://tribune-delta.vercel.app`](https://tribune-delta.vercel.app) |
| Repository | `https://github.com/aspro45/tribune` |

## Contract Model

The Bradbury deployment uses `contracts/tribune_bradbury.py`, a compact deployable version of the larger `tribune_v2.py` protocol. It stores bounty standards, bounty records, obligations, evidence, submissions, review outcomes, challenge rulings, appeal rulings and reputation updates.

The main flow is:

1. Define the bounty standard.
2. Post a bounty with payout terms.
3. Add obligations and evidence before review.
4. Submit the builder solution.
5. Ask GenLayer to review the evidence.
6. Record a ruling, challenge or appeal.
7. Archive the bounty with an auditable decision trail.

Read methods expose bounty counts, records, submissions, recent bounties, status filters and sponsor-facing views.

## Verification

- Bradbury deploy completed with finalized transaction metadata.
- Smoke flow covered bounty setup, evidence, submission, review fallback, challenge, appeal, archive and compatibility wrappers.
- Read test suite passed `39/39`.
- Frontend is wired to the Bradbury RPC and contract address above.

## Local Preview

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Security

This repository contains public contract and frontend artifacts only. Do not commit private keys, wallet vaults, `.env` files, dashboard exports or Vercel state.
