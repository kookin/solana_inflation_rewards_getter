provider "aws" {
  region = "af-south-1"
}

terraform {
  backend "s3" { 
    bucket         = "sol-inflation-data"
    key            = "terraform.tfstate"
    region         = "af-south-1"
    encrypt        = true
  }
}

# IAM Role for ECS Execution
resource "aws_iam_role" "ecs_execution_role" {
  name = "ecsExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Create ECS Cluster
resource "aws_ecs_cluster" "inflation_cluster" {
  name = "inflation-cluster"
}

# Create CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs_log_group" {
  name = "/ecs/inflation-app"
  retention_in_days = 7
}

# Use the Latest ECR Image Automatically ✅
data "aws_ecr_image" "inflation_app" {
  repository_name = "inflation-app"
  most_recent     = true
}

# Create ECS Task Definition
resource "aws_ecs_task_definition" "inflation_task" {
  family                   = "inflation-task"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn  

  container_definitions = jsonencode([
    {
      name      = "inflation-app"
      image     = data.aws_ecr_image.inflation_app.image_uri  # ✅ Always use the latest pushed image
      memory    = 512
      cpu       = 256
      essential = true
      portMappings = [{ containerPort = 3000 }]
      environment = [
        { name = "RPC_URL", value = var.rpc_url },
        { name = "API_KEY", value = var.api_key },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "S3_BUCKET", value = var.s3_bucket },
        { name = "S3_FILENAME", value = var.s3_filename }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-region        = "af-south-1"
          awslogs-group         = "/ecs/inflation-app"
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

# Create ECS Service
resource "aws_ecs_service" "inflation_service" {
  name            = "inflation-service"
  cluster         = aws_ecs_cluster.inflation_cluster.id
  task_definition = aws_ecs_task_definition.inflation_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  lifecycle {
  ignore_changes = [desired_count]
  }
  network_configuration {
    subnets          = ["subnet-00c635a3e3e9faa4e", "subnet-009c2bda209459376", "subnet-0d2d8a5c48ce51072"]
    assign_public_ip = true
    security_groups  = [aws_security_group.ecs_sg.id]
  }

  depends_on = [aws_ecs_task_definition.inflation_task] 
}

# Security Group
resource "aws_security_group" "ecs_sg" {
  name        = "ecs-security-group"
  description = "Allow HTTP traffic"
  vpc_id      = "vpc-0de2ccd2ab3114949"

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Define Variables
variable "ecr_repository_url" {
  default = "386757658188.dkr.ecr.af-south-1.amazonaws.com/inflation-app"
}

variable "rpc_url" {
  default = "https://solana-mainnet.gateway.tatum.io"
}

variable "api_key" {}
variable "aws_region" {}
variable "s3_bucket" {}
variable "s3_filename" {}
