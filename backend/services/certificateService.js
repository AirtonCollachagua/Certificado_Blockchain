import { PDFDocument, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { ethers } from "ethers";
import crypto from "crypto";
import "dotenv/config.js";

// Load the ABI compilation artifact (you must compile the contract first)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ABI location from Hardhat compile step
const artifactPath = path.join(__dirname, "../../artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json");

/**
 * 1. Receives the pre-generated PDF from Moodle via URL.
 * 2. Hashes the downloaded PDF.
 * 3. Registers the hash on the blockchain.
 */
export async function processCertificate(pdfBuffer) {
  // 1. Hash the final PDF using Web Crypto API to perfectly match the frontend
  const cryptoSubtle = crypto.webcrypto.subtle;
  const arrayBuffer = new Uint8Array(pdfBuffer).buffer;
  const hashBuffer = await cryptoSubtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const bytes32Hash = "0x" + hashHex;

  // 2. Register hash on Polygon blockchain
  const txHash = await registerOnBlockchain(bytes32Hash);

  return {
    hash: bytes32Hash,
    txHash
  };
}

async function registerOnBlockchain(hashBytes32) {
  if (!fs.existsSync(artifactPath)) {
    throw new Error("Smart Contract ABI not found. Please compile the contract first.");
  }
  
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.POLYGON_AMOY_RPC_URL;

  if (!privateKey || !contractAddress) {
    console.warn("Missing PRIVATE_KEY or CONTRACT_ADDRESS in .env. Skipping real blockchain registration for demo.");
    return "0x_dummy_tx_hash";
  }

  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com");
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);

  // Get current fee data for gas spike retry logic with fallback
  let feeData;
  try {
    feeData = await provider.getFeeData();
  } catch (feeError) {
    console.warn("⚠️ Polygon Gas Station no responde (500). Usando Gas de respaldo (Fallback).");
    feeData = {
      maxFeePerGas: ethers.parseUnits("150", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("50", "gwei")
    };
  }
  
  // Basic retry loop handling "gas spikes"
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const tx = await contract.registerCertificate(hashBytes32, {
        maxFeePerGas: feeData.maxFeePerGas * 12n / 10n, // Solo un 20% extra en lugar de 100%
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas * 12n / 10n
      });
      console.log(`Transaction submitted: ${tx.hash}`);
      // REMOVED tx.wait(1) to prevent webhook timeouts and RPC rate-limit memory leaks.
      // The transaction is in the mempool.
      return tx.hash;
    } catch (error) {
      console.error(`Blockchain registration failed (Attempt ${i + 1}/${maxRetries}):`, error.message);
      if (i === maxRetries - 1) throw error;
      
      // Wait a few seconds then retrieve new fee data before retry
      await new Promise(res => setTimeout(res, 3000));
      try {
        feeData = await provider.getFeeData();
      } catch (feeErrorRetry) {
        console.warn("⚠️ Polygon Gas Station no responde en el reintento. Usando Gas Fallback.");
        feeData = {
          maxFeePerGas: ethers.parseUnits("150", "gwei"),
          maxPriorityFeePerGas: ethers.parseUnits("50", "gwei")
        };
      }
    }
  }
}
