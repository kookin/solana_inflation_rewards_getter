const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const S3_BUCKET = process.env.S3_BUCKET;
const S3_FILENAME = process.env.S3_FILENAME;
const AWS_REGION = process.env.AWS_REGION;
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.static("public"));

// API Route: Fetch CSV from S3 & Serve as JSON
app.get("/api/data", async (req, res) => {
  try {
    console.log(`Fetching ${S3_FILENAME} from S3 bucket ${S3_BUCKET}...`);

    // Get CSV from S3
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: S3_FILENAME,
    });

    const { Body } = await s3.send(command);

    // Convert S3 Stream to JSON
    const results = [];
    Body.pipe(csvParser())
      .on("data", (row) => {
        results.push(row);
      })
      .on("end", () => {
        console.log("Successfully retrieved and parsed CSV data.");
        res.json(results);
      })
      .on("error", (err) => {
        console.error("Error parsing CSV:", err.message);
        res.status(500).json({ error: "Failed to parse CSV file" });
      });

  } catch (error) {
    console.error("S3 Fetch Error:", error.message);
    res.status(500).json({ error: "Failed to retrieve data from S3" });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
