import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { ScenarioClaim } from './scenarios';
import {
  runConsensus as runMockConsensus,
  runAppeal as runMockAppeal,
  ConsensusResult as MockConsensusResult,
  AppealOutcome as MockAppealOutcome
} from './mockAI';

export type ConsensusResult = MockConsensusResult;
export type AppealOutcome = MockAppealOutcome;

const CONSENSUS_MODE = process.env.NEXT_PUBLIC_GENLAYER_CONSENSUS === 'contract' ? 'contract' : 'mock';
export const GENLAYER_RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL?.trim() || 'https://studio.genlayer.com/api';
export const GENLAYER_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS?.trim() ||
  '0x93852c3720EE2316a56A3618b7637B2b18ca6cd7';
export const GENLAYER_PRIVATE_KEY =
  process.env.NEXT_PUBLIC_GENLAYER_PRIVATE_KEY?.trim() || '';

// Create account from private key using official SDK function
function getAccount() {
  if (!GENLAYER_PRIVATE_KEY || !GENLAYER_PRIVATE_KEY.startsWith('0x')) {
    return null;
  }
  try {
    // createAccount() from genlayer-js properly creates an account object with address and privateKey
    return createAccount(GENLAYER_PRIVATE_KEY as `0x${string}`);
  } catch (error) {
    console.error('❌ Failed to create account from private key:', error);
    return null;
  }
}

// Log configuration on load
const account = getAccount();
console.log('🔗 GenLayer Configuration:');
console.log('   Mode:', CONSENSUS_MODE);
console.log('   RPC URL:', GENLAYER_RPC_URL);
console.log('   Contract:', GENLAYER_CONTRACT_ADDRESS);
console.log('   Account configured:', account ? `Yes (${account.address})` : 'No (will use read-only mode)');

// Create GenLayer client using the official SDK
function getGenLayerClient() {
  const acc = getAccount();
  
  return createClient({
    chain: studionet,
    endpoint: GENLAYER_RPC_URL,
    account: acc || undefined,
  });
}

// Create client for read-only operations (no account needed)
function getReadOnlyClient() {
  return createClient({
    chain: studionet,
    endpoint: GENLAYER_RPC_URL,
  });
}

// Call a read-only (view) method on the contract using genlayer-js SDK
async function callContractView(methodName: string, args: any[] = []): Promise<any> {
  console.log(`📖 [GenLayer] Calling VIEW method: ${methodName}`, { args, contract: GENLAYER_CONTRACT_ADDRESS });
  const client = getReadOnlyClient(); // Use read-only client for view methods
  
  const result = await client.readContract({
    address: GENLAYER_CONTRACT_ADDRESS as `0x${string}`,
    functionName: methodName,
    args,
  });
  
  console.log(`✅ [GenLayer] VIEW result for ${methodName}:`, result);
  return result;
}

// Call a write method on the contract using genlayer-js SDK
async function callContractWrite(methodName: string, args: any[] = []): Promise<any> {
  console.log(`📝 [GenLayer] Calling WRITE method: ${methodName}`, { args, contract: GENLAYER_CONTRACT_ADDRESS });
  
  if (!GENLAYER_PRIVATE_KEY) {
    throw new Error('No private key configured. Please add NEXT_PUBLIC_GENLAYER_PRIVATE_KEY to your .env.local file.');
  }
  
  const client = getGenLayerClient();
  
  try {
    const writeParams = {
      address: GENLAYER_CONTRACT_ADDRESS as `0x${string}`,
      functionName: methodName,
      args,
      value: BigInt(0),
    };
    
    const txHash = await client.writeContract(writeParams);
    
    console.log(`⏳ [GenLayer] Transaction submitted: ${txHash}`);

    // Wait for transaction - try ACCEPTED first (faster), fall back handling
    // AI consensus can take time, so we use generous timeouts
    let receipt;
    try {
      receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        status: 'ACCEPTED' as any,  // ACCEPTED is sufficient for our use case
        retries: 60,                // More retries for AI consensus
        interval: 3000,             // Check every 3 seconds
      });
    } catch (waitError: any) {
      // If not finalized yet, try to get current status
      console.log(`⚠️ [GenLayer] Transaction not yet finalized, checking status...`);
      try {
        receipt = await client.getTransactionByHash(txHash);
        if (receipt) {
          console.log(`📊 [GenLayer] Current transaction status:`, receipt);
        }
      } catch (e) {
        // Ignore and throw original error
      }
      throw waitError;
    }

    console.log(`✅ [GenLayer] Transaction confirmed:`, receipt);
    return receipt;
  } catch (error) {
    console.error(`❌ [GenLayer] writeContract error:`, error);
    throw error;
  }
}

async function fetchContractConsensus(claim: ScenarioClaim): Promise<ConsensusResult> {
  try {
    // First, seed the scenario if not already present
    const scenarioId = `scenario_${claim.id}_${Date.now()}`;
    
    // Map ScenarioClaim to contract parameters
    // The claim.text is the question, options are Trust/Doubt based on the game
    const seedReceipt = await callContractWrite('seed_scenario', [
      scenarioId,
      claim.text,           // question
      'Trust (True)',       // option_a - Accept the claim
      'Doubt (False)',      // option_b - Reject the claim
      claim.category,       // category
      claim.detail || ''    // context
    ]);
    
    console.log(`🌱 [GenLayer] Scenario seeded, receipt:`, seedReceipt);

    // Call the initial evaluation - this is a write operation because it triggers AI consensus
    const receipt = await callContractWrite('evaluate_initial', [scenarioId]);
    
    console.log(`🔍 [GenLayer] Full evaluation receipt:`, JSON.stringify(receipt, null, 2));
    
    // Extract the result from the consensus_data.leader_receipt
    let result: any = null;
    
    // Try to get result from leader_receipt payload (where the actual contract return value is)
    if (receipt?.consensus_data?.leader_receipt?.[0]?.result?.payload?.readable) {
      const readable = receipt.consensus_data.leader_receipt[0].result.payload.readable;
      // Remove surrounding quotes if present
      result = readable.replace(/^"|"$/g, '');
      console.log(`📊 [GenLayer] Got result from leader_receipt:`, result);
    } else if (receipt?.data?.result) {
      result = receipt.data.result;
    }
    
    // If result is a pipe-separated string (from contract), parse it
    if (typeof result === 'string' && result.includes('|')) {
      const parsed: any = {};
      result.split('|').forEach((pair: string) => {
        const [key, value] = pair.split(':');
        if (key && value !== undefined) {
          parsed[key] = value;
        }
      });
      result = parsed;
      console.log('📊 [GenLayer] Parsed pipe-separated result:', result);
    } else if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch (e) {
        console.log('Result is not JSON, using as-is:', result);
      }
    }
    
    // Check if the result has the expected structure
    console.log(`📊 [GenLayer] Extracted result:`, result, 'Type:', typeof result);
    
    if (result && typeof result === 'object' && result.ruling) {
      // Map A/B ruling to trust/doubt
      const consensusValue = result.ruling === 'A' ? 'trust' : 'doubt';
      const returnResult: any = {
        consensus: consensusValue as 'trust' | 'doubt',
        confidence: 0.85, // Default confidence for contract results
        explanation: `AI Validator consensus via GenLayer contract. Method: ${result.method || 'initial_optimistic'}. Validators: ${result.validator_count || 5}. Scenario: ${scenarioId}`,
        scenarioId, // Include for appeal lookup
      };
      return returnResult;
    }
    
    console.warn('Contract returned unexpected result, falling back to mock:', result);
    return runMockConsensus(claim);
  } catch (error) {
    // Don't spam console with full errors - just note the fallback
    console.log('⚠️ [GenLayer] Contract call failed, using mock consensus instead');
    return runMockConsensus(claim);
  }
}

async function fetchContractAppeal(previous: ConsensusResult): Promise<AppealOutcome> {
  try {
    const scenarioId = (previous as any).scenarioId;
    
    if (!scenarioId) {
      console.warn('No scenarioId found in previous result, falling back to mock');
      return runMockAppeal(previous);
    }

    // Call the appeal evaluation - matches contract method name
    const receipt = await callContractWrite('evaluate_appeal', [scenarioId]);
    
    // Extract the result from the consensus_data.leader_receipt
    let result: any = null;
    
    // Try to get result from leader_receipt payload (where the actual contract return value is)
    if (receipt?.consensus_data?.leader_receipt?.[0]?.result?.payload?.readable) {
      const readable = receipt.consensus_data.leader_receipt[0].result.payload.readable;
      // Remove surrounding quotes if present
      result = readable.replace(/^"|"$/g, '');
      console.log(`📊 [GenLayer] Got appeal result from leader_receipt:`, result);
    } else if (receipt?.data?.result) {
      result = receipt.data.result;
    }
    
    // If result is a pipe-separated string (from contract), parse it
    if (typeof result === 'string' && result.includes('|')) {
      const parsed: any = {};
      result.split('|').forEach((pair: string) => {
        const [key, value] = pair.split(':');
        if (key && value !== undefined) {
          parsed[key] = value;
        }
      });
      result = parsed;
      console.log('📊 [GenLayer] Parsed appeal result:', result);
    }
    
    if (result && result.ruling) {
      // Map A/B ruling to trust/doubt
      const finalRuling = result.ruling === 'A' ? 'trust' : 'doubt';
      const overturned = finalRuling !== previous.consensus;
      return {
        success: overturned,
        detail: `Appeal decided by ${result.validator_count || 50} validators. ${overturned ? 'Original ruling overturned.' : 'Original ruling upheld.'}`,
      };
    }
    
    console.warn('Contract appeal returned unexpected result, falling back to mock:', result);
    return runMockAppeal(previous);
  } catch (error) {
    console.error('GenLayer contract appeal failed:', error);
    console.warn('Falling back to mock appeal');
    return runMockAppeal(previous);
  }
}

export async function resolveConsensus(claim: ScenarioClaim): Promise<ConsensusResult> {
  console.log(`🎮 [GenLayer] resolveConsensus called, mode: ${CONSENSUS_MODE}`);
  if (CONSENSUS_MODE === 'contract') {
    return fetchContractConsensus(claim);
  }
  return runMockConsensus(claim);
}

export async function resolveAppeal(previous: ConsensusResult): Promise<AppealOutcome> {
  console.log(`🎮 [GenLayer] resolveAppeal called, mode: ${CONSENSUS_MODE}`);
  if (CONSENSUS_MODE === 'contract') {
    return fetchContractAppeal(previous);
  }
  return runMockAppeal(previous);
}

export function isContractMode() {
  return CONSENSUS_MODE === 'contract';
}

// Test function to verify contract connectivity
export async function testContractConnection(): Promise<{ success: boolean; message: string; data?: any }> {
  console.log('🧪 [GenLayer] Testing contract connection...');
  try {
    const client = getGenLayerClient();
    
    // Try to list scenarios (a simple read operation)
    const scenarios = await client.readContract({
      address: GENLAYER_CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'list_scenarios',
      args: [],
    });
    
    console.log('✅ [GenLayer] Connection test successful!', { scenarios });
    return {
      success: true,
      message: `Connected to contract ${GENLAYER_CONTRACT_ADDRESS} on StudioNet`,
      data: { scenarios, rpcUrl: GENLAYER_RPC_URL }
    };
  } catch (error: any) {
    console.error('❌ [GenLayer] Connection test failed:', error);
    return {
      success: false,
      message: `Failed to connect: ${error.message}`,
    };
  }
}
