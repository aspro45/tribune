# Tribune

Bounty review desk for submissions that need evidence before payout.

Tribune turns a bounty into a case file. A sponsor posts the standard and reward, builders submit work, sources are attached, and GenLayer reviews the result before the record is finalized. The app presents the bounty board like an operations screen, with statuses and proof links visible up front.

## Project Snapshot

- Live app: https://tribune-github.vercel.app
- Repository: https://github.com/aspro45/tribune
- Contract source: `contracts/tribune_v2.py`
- Contract size: 52,281 bytes
- Smoke writes: 18 finalized transactions
- Network: GenLayer Studionet, chain ID `61999`

## On-Chain Address

Contract:
[`0x74814E96e2dF5d46E7404e0d4606CD6428fE5925`](https://explorer-studio.genlayer.com/contracts/0x74814E96e2dF5d46E7404e0d4606CD6428fE5925)

Deploy transaction:
[`0x28c00e32853ade25c70d82acac03b3585c6cabc5de0aa492046c50eb1c1be8e9`](https://explorer-studio.genlayer.com/tx/0x28c00e32853ade25c70d82acac03b3585c6cabc5de0aa492046c50eb1c1be8e9)

Deployed at `2026-06-24T00:33:00.303Z`.

## How A Bounty Moves

1. `set_bounty_standard` defines what a winning submission must prove.
2. `post_bounty` creates the public bounty record.
3. Obligations and evidence are added before review.
4. `submit_solution` attaches the builder's work.
5. GenLayer reads the evidence and records a decision.
6. Challenge, appeal and archive paths keep the result auditable.

Read methods cover bounties, submissions, items, recent bounty lists and filtered status views.

## Finalized Smoke Transactions

| Action | Link |
| --- | --- |
| `set_bounty_standard` | [0x1087b12d...c785ae](https://explorer-studio.genlayer.com/tx/0x1087b12d1cd45390959e4c1a85020ae59930c307ed04383b645939ec6ec785ae) |
| `post_bounty` | [0x7ec44596...5bc841](https://explorer-studio.genlayer.com/tx/0x7ec4459645af5ea72db330a835f7c45d3dab176095666fd9acc192a69c5bc841) |
| `add_obligation` | [0x878cdfbc...95c35b](https://explorer-studio.genlayer.com/tx/0x878cdfbcd0b54b3c3b96f8bf96e84b790c46823ed7d21dcdf92393bcfe95c35b) |
| `add_evidence_docs` | [0xe4a21084...2ef389](https://explorer-studio.genlayer.com/tx/0xe4a21084279353ae01e484f9ddb3ea9f896b9d8f0358b0215457332e602ef389) |
| `add_evidence_web` | [0xd2a5c2d6...9fd312](https://explorer-studio.genlayer.com/tx/0xd2a5c2d620dd60fbf7ffe58327c8ad053288688eb81c6eef630218506f9fd312) |
| `submit_solution` | [0x4eaba6e7...de3815](https://explorer-studio.genlayer.com/tx/0x4eaba6e744a0df102f62a171eeaa01eed6996a491c93872a6a5ae878ddde3815) |

## Local Preview

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Security

Only public artifacts belong here: contract code, UI code and deployment metadata. Keep wallet keys, vault files, environment files and Vercel state out of Git.
