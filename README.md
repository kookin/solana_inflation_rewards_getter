# 🚀 Solana Inflation Rewards Getter  

📊 **A simple dashboard that tracks Solana validator inflation rewards per epoch for a single validator**  

This project automates the retrieval, storage, and visualization.

---

## Features  
- ✅ **Fetches inflation rewards** every epoch using **Solana JSON RPC API**.  
- ✅ **Stores historical data** in **AWS S3** (CSV format).  
- ✅ **Provides a REST API** to serve data via **Express.js**.  
- ✅ **Has a live Web Dashboard at the moment accessible through a public IP:3000** 
- ✅ **CI/CD with GitHub Actions & Terraform** for **automated AWS ECS deployment**.  
- ✅ **Fully containerized** 🐳 (Docker & AWS Fargate).  


---

## 📂 Project Structure  

solana_inflation_rewards_getter ├── infrastructure/ # Terraform configuration for AWS infrastructure ├── src/ # Source code │ ├── inflation-getter.js # Fetches & stores inflation rewards │ ├── server.js # Express API serving CSV data from S3 │ ├── .env # Environment variables (not committed) │ ├── package.json # Dependencies & scripts ├── public/ # Frontend (HTML, CSS, JS) │ ├── index.html # Dashboard UI ├── deploy.yml # GitHub Actions CI/CD workflow ├── Dockerfile # Docker containerization ├── README.md # This file

---

## Prerequisites  

Ensure you have the following installed:  
- **Node.js** `v18+`  
- **Docker** 
- **AWS CLI** (`aws configure` must be set up)  
- **Terraform** `v1.10+`  

---

## Setup & Usage  

### 

1️. Clone the Repository  

git clone https://github.com/kookin/solana_inflation_rewards_getter.git
cd solana_inflation_rewards_getter

2. Configure .env file

RPC_URL=https://solana-mainnet.gateway.tatum.io  (or RPC of your choice)
API_KEY=your-api-key (if required)

3. Install dependencies

npm install

3. Run Locally

Start both the fetcher and the server:
node src/inflation-getter.js   # Fetch rewards & upload to S3
node src/server.js             # Serve API & frontend

Open in Browser: http://localhost:3000

## API Endpoints

Get Inflation Rewards Data: GET /api/data

Example Response:
[
  {
    "Epoch": "420",
    "Validator": "FKsC411dik9ktS6xPADxs4Fk2SCENvAiuccQHLAPndvk",
    "InflationReward": "250000"
  }
]

## Web Dashboard

Displays inflation rewards per epoch using a Chart.js bar chart.
Fetches real-time data from the Express API.

## Docker Build and Run

docker build -t inflation-app .
docker run -p 3000:3000 --env-file .env inflation-app

## Deploy AWS ECS (Fargate)

cd infrastructure
terraform init
terraform apply -auto-approve


## CICD with Github Actions

Every push to main will:
✅ Build & push the latest Docker image to AWS ECR.
✅ Deploy to AWS ECS (Fargate).

To trigger manually:
Go to GitHub → Actions → Deploy Workflow → Click Run Workflow.

## Customization

Change the Tracked Validator
Modify the VALIDATOR variable in inflation-getter.js:

const VALIDATOR = "YOUR_VALIDATOR_PUBLIC_KEY";


## License

MIT License © 2025