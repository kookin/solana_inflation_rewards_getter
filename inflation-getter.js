import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import csvParser from "csv-parser";

// Load environment variables
dotenv.config();

const RPC_URL = process.env.RPC_URL;  // https://solana-mainnet.gateway.tatum.io"
const API_KEY = process.env.API_KEY;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_FILENAME = process.env.S3_FILENAME;
const AWS_REGION = process.env.AWS_REGION;

const VALIDATOR = "FKsC411dik9ktS6xPADxs4Fk2SCENvAiuccQHLAPndvk";

// Setup AWS SDK v3
const s3 = new S3Client({ region: AWS_REGION });

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to get the current epoch
async function getCurrentEpoch() {
  try {
    const response = await axios.post(
      RPC_URL,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "getEpochInfo",
        params: []
      },
      {
        headers: {
          "Content-Type": "application/json",
          "accept": "application/json",
          "x-api-key": API_KEY
        }
      }
    );

    const epoch = response.data.result.epoch;
    console.log(`✅ Current Epoch: ${epoch}`);
    return epoch;
  } catch (error) {
    console.error("Error fetching current epoch:", error.response?.data || error.message);
    return null;
  }
}

// Function to get inflation rewards for the last completed epoch
async function getInflationRewards(epoch, retries = 3) {
  try {
    console.log(`Fetching inflation rewards for last Epoch: ${epoch}`);

    const response = await axios.post(
      RPC_URL,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "getInflationReward",
        params: [[VALIDATOR], { epoch }]
      },
      {
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "x-api-key": API_KEY
        }
      }
    );

    console.log("🔹 API Response:", JSON.stringify(response.data, null, 2));

    if (!response.data || !response.data.result) {
      throw new Error("Invalid API response (no result field).");
    }

    return response.data.result.map((reward) => ({
      epoch,
      validator: VALIDATOR,
      amount: reward ? reward.amount : 0
    }));
  } catch (error) {
    console.error(`API request failed (attempt ${4 - retries}):`, error.response?.data || error.message);

    if (retries > 0) {
      console.log("Retrying in 5 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return getInflationRewards(epoch, retries - 1);
    }

    return [];
  }
}

// Function to read existing CSV and prevent duplicate entries
async function readExistingCSV() {
  const csvPath = path.join(__dirname, "inflation_rewards.csv");
  const existingEntries = new Set();

  return new Promise((resolve) => {
    if (!fs.existsSync(csvPath)) {
      return resolve(existingEntries);
    }

    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on("data", (row) => {
        const entryKey = `${row.Epoch}-${row.Validator}-${row.InflationReward}`;
        existingEntries.add(entryKey);
      })
      .on("end", () => {
        resolve(existingEntries);
      });
  });
}

// Function to save data locally as CSV (removes duplicates)
async function saveDataToCSV(data) {
  try {
    const csvPath = path.join(__dirname, "inflation_rewards.csv");
    const existingEntries = await readExistingCSV();

    // Ensure file exists before writing
    const fileExists = fs.existsSync(csvPath);
    const csvWriter = fs.createWriteStream(csvPath, { flags: "a" });

    if (!fileExists) {
      csvWriter.write("Epoch,Validator,InflationReward\n");
    }

    data.forEach(({ epoch, validator, amount }) => {
      const entryKey = `${epoch}-${validator}-${amount}`;

      // Only add new data if it's not already in the CSV
      if (!existingEntries.has(entryKey)) {
        existingEntries.add(entryKey);
        csvWriter.write(`${epoch},${validator},${amount}\n`);
      }
    });

    csvWriter.end();

    // Wait for the file to finish writing before uploading to S3
    csvWriter.on("finish", async () => {
      console.log("Data written to CSV:", csvPath);
      await uploadToS3(csvPath);
    });

  } catch (error) {
    console.error("Error saving CSV:", error.message);
  }
}

// Function to upload CSV to AWS S3
async function uploadToS3(filePath) {
  try {
    const fileStream = fs.createReadStream(filePath);

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: S3_BUCKET,
        Key: S3_FILENAME,
        Body: fileStream,
        ContentType: "text/csv"
      }
    });

    upload.on("httpUploadProgress", (progress) => {
      console.log(`⏳ Uploading... ${progress.loaded} bytes transferred`);
    });

    await upload.done();
    console.log(`CSV uploaded to S3: s3://${S3_BUCKET}/${S3_FILENAME}`);
  } catch (error) {
    console.error("S3 Upload Error:", error.message);
  }
}

// Main function to fetch and store inflation rewards
async function main() {
  console.log("\n🚀 Running inflation-getter.js at", new Date().toISOString());

  const currentEpoch = await getCurrentEpoch();
  if (!currentEpoch) {
    console.error("Failed to retrieve epoch. Exiting.");
    return;
  }

  const lastEpoch = currentEpoch - 1; // ✅ Use previous completed epoch
  const rewards = await getInflationRewards(lastEpoch);
  if (rewards.length === 0) {
    console.warn("No inflation rewards found for this epoch.");
    return;
  }

  await saveDataToCSV(rewards);
}

// Run the script every 2 days
setInterval(main, 172800000); 
main();

