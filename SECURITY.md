# Security

Tribune is a static frontend connected to a public GenLayer Studionet contract. It does not require repository secrets for local or production use.

Do not commit:

- private keys
- wallet exports
- seed phrases or mnemonics
- vault files
- `.env` or `.env.local`
- dashboard data files from the parent workspace

The repository intentionally contains only public deployment metadata:

- contract address
- explorer URL
- transaction hashes
- public deployed contract source

No backend route stores wallet data. No Vercel secret is required.

Before pushing, run:

```powershell
npm run security:scan
```
