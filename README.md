# Trust or Doubt — GenLayer mini-game

This is a Next.js 14 + Tailwind project that wires landing → lobby → scenario → voting → leaderboard flow from the GenLayer-friendly “Trust or Doubt” concept. It still runs the mock AI consensus helpers locally but is ready for the intelligent contract once you want to flip the switch.

## Getting started (Chrome or any browser)

```bash
npm install --legacy-peer-deps
npm run dev
```

Browse to `http://localhost:3000`, sign in with a username, choose single or multiplayer, and you are routed straight into the lobby. The autocomplete link will redirect you back if you try to visit `/game` without a username. Any modern browser (Chrome, Edge, Brave, etc.) works — the experience is served fully client-side after the first load.

## Gameplay highlights

- Each round uses a 30-second timer (`app/game/GameExperience.tsx`). Once time expires the “Next claim” button becomes active so you can keep the pace.
- Scenario text is randomized from `utils/scenarios.ts` (1,000+ combinations that mix GenLayer protocol language with fresh Web3 + crypto trend topics). The current session seed (`username + mode + time`) is shuffled so repeated plays never reuse the same order.
- Back-to-home sits in the top-left of the game page, the live chat/history tabs keep the secondary panels tidy, and the final scoreboard pops up only after all rounds finish.

## Contract + consensus wiring

- Mock helpers live in `utils/mockAI.ts`; `utils/genlayerClient.ts` switches between mock and contract modes using `NEXT_PUBLIC_GENLAYER_CONSENSUS`.
- Deploy the intelligent contract from `contracts/appeal_or_accept_contract.py` when you have GenLayer CLI access. The deployed address the front end uses by default is `0x93852c3720EE2316a56A3618b7637B2b18ca6cd7`.
- To enable contract mode, set these environment vars in `.env.local` or your deployment platform:
  ```env
  NEXT_PUBLIC_GENLAYER_CONSENSUS=contract
  NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x93852c3720EE2316a56A3618b7637B2b18ca6cd7
  ```
- Once the contract is live, replace the console warning placeholders inside `fetchContractConsensus` and `fetchContractAppeal` with real RPC/ABI calls (ethers.js, ViEM, or the GenLayer SDK). The UI already tracks appeals, XP, and contract mode state, so it will automatically reflect the on-chain verdicts.

## Randomized claims & sessions

The landing page seeds the queue with `Date.now()` plus the username/mode, so each restart is a new permutation of the 1,000+ scenario claims. This satisfies the “500+ claims” ask while keeping every round unique until you’ve played thousands of claims.

## Testing + linting

```bash
npm run lint
```

The app currently passes `next lint`. Running `npm run build` before pushing ensures Tailwind classes and TypeScript stay valid.

## Pushing updates

```bash
git add .
git commit -m "feat: update Trust or Doubt"
git push origin main
```

If you hit large-file errors, double-check that `node_modules`, `.next`, and other generated content are excluded (the `.gitignore` already covers them).

## Next steps

1. Hook the intelligent contract: keep `contracts/appeal_or_accept_contract.py` as the canonical source, then add ABI/RPC helpers to `utils/genlayerClient.ts` and flip `NEXT_PUBLIC_GENLAYER_CONSENSUS=contract`.
2. Upload or refresh the GenLayer logo under `public/`, ensuring the `GenLayerLogo` component still renders the PNG correctly.
3. Consider writing README or docs that describe how to run 100+ multiplayer rooms (websocket rooms + scoreboard persistence) once the backend is live.
