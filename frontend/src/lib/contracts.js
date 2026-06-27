/**
 * contracts.js
 * Soroban contract call helpers using stellar-sdk + Freighter wallet.
 * All write operations build a Soroban transaction, request Freighter signature,
 * then submit to the Stellar testnet RPC.
 */

import {
  SorobanRpc,
  TransactionBuilder,
  Networks,
  scValToNative,
  nativeToScVal,
  xdr,
  Contract,
  BASE_FEE,
} from 'stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

export const CONTRACT_IDS = {
  registry: import.meta.env.VITE_REGISTRY_CONTRACT_ID || '',
  pool: import.meta.env.VITE_POOL_CONTRACT_ID || '',
  distributor: import.meta.env.VITE_DISTRIBUTOR_CONTRACT_ID || '',
};

const rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

// ─── Helper: build → simulate → sign → submit ──────────────────────────────
async function invokeContract({ contractId, method, args, caller }) {
  if (!contractId) throw new Error(`Contract ID for "${method}" is not configured. Add it to your .env.`);

  const account = await rpc.getAccount(caller);
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  // Simulate first to get footprint & resource usage
  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();
  const txXdr = preparedTx.toXDR();

  // Request Freighter signature
  const signedXdr = await signTransaction(txXdr, {
    network: 'TESTNET',
    networkPassphrase: NETWORK_PASSPHRASE,
    accountToSign: caller,
  });

  // Submit
  const sendResult = await rpc.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  );

  if (sendResult.status === 'ERROR') {
    throw new Error(`Transaction rejected: ${JSON.stringify(sendResult.errorResult)}`);
  }

  // Poll for confirmation
  const hash = sendResult.hash;
  let getResult = await rpc.getTransaction(hash);
  let attempts = 0;
  while (getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 30) {
    await new Promise((r) => setTimeout(r, 2000));
    getResult = await rpc.getTransaction(hash);
    attempts++;
  }

  if (getResult.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
    throw new Error('Transaction failed on-chain.');
  }

  return { hash, result: getResult };
}

// ─── ISA Registry ──────────────────────────────────────────────────────────

/**
 * Create a new ISA proposal on-chain.
 */
export async function createISA({ earner, fundingTarget, incomeShareBp, durationMonths, capMultiplierBp }) {
  return invokeContract({
    contractId: CONTRACT_IDS.registry,
    method: 'create_isa',
    args: [
      nativeToScVal(earner, { type: 'address' }),
      nativeToScVal(BigInt(fundingTarget), { type: 'i128' }),
      nativeToScVal(incomeShareBp, { type: 'u32' }),
      nativeToScVal(durationMonths, { type: 'u32' }),
      nativeToScVal(capMultiplierBp, { type: 'u32' }),
    ],
    caller: earner,
  });
}

// ─── Funding Pool ──────────────────────────────────────────────────────────

/**
 * Investor deposits USDC into the funding pool for a given ISA.
 */
export async function investInPool({ poolContractId, investor, amount }) {
  const contractId = poolContractId || CONTRACT_IDS.pool;
  return invokeContract({
    contractId,
    method: 'invest',
    args: [
      nativeToScVal(investor, { type: 'address' }),
      nativeToScVal(BigInt(amount), { type: 'i128' }),
    ],
    caller: investor,
  });
}

/**
 * Earner withdraws funded capital once pool target is reached.
 */
export async function withdrawFunds({ poolContractId, earner }) {
  return invokeContract({
    contractId: poolContractId || CONTRACT_IDS.pool,
    method: 'withdraw',
    args: [],
    caller: earner,
  });
}

// ─── Repayment Distributor ────────────────────────────────────────────────

/**
 * Earner submits income proof (off-chain hash recorded on-chain as event).
 */
export async function submitIncomeProof({ earner, income, proofHash }) {
  return invokeContract({
    contractId: CONTRACT_IDS.distributor,
    method: 'submit_income_proof',
    args: [
      nativeToScVal(earner, { type: 'address' }),
      nativeToScVal(BigInt(income), { type: 'i128' }),
      xdr.ScVal.scvSymbol(proofHash.substring(0, 10)),
    ],
    caller: earner,
  });
}

/**
 * Distribute a repayment to a list of investors.
 * @param {string[]} investors - Array of investor wallet addresses
 */
export async function distributeRepayment({ distributorContractId, payer, amount, investors }) {
  const contractId = distributorContractId || CONTRACT_IDS.distributor;
  const investorScVals = investors.map((addr) => nativeToScVal(addr, { type: 'address' }));
  return invokeContract({
    contractId,
    method: 'distribute_repayment',
    args: [
      nativeToScVal(payer, { type: 'address' }),
      nativeToScVal(BigInt(amount), { type: 'i128' }),
      xdr.ScVal.scvVec(investorScVals),
    ],
    caller: payer,
  });
}
