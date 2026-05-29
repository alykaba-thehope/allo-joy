# ── Cluster ECS ───────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "${local.prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

# ── IAM Roles ────────────────────────────────────────────────────────────────
resource "aws_iam_role" "ecs_task_execution" {
  name = "${local.prefix}-ecs-execution"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole"; Effect = "Allow"; Principal = { Service = "ecs-tasks.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_secrets" {
  name = "${local.prefix}-ecs-secrets"
  role = aws_iam_role.ecs_task_execution.id
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameters", "secretsmanager:GetSecretValue"]
      Resource = "*"
    }]
  })
}

resource "aws_iam_role" "ecs_task" {
  name = "${local.prefix}-ecs-task"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole"; Effect = "Allow"; Principal = { Service = "ecs-tasks.amazonaws.com" } }]
  })
}

# ── CloudWatch Log Group ──────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.prefix}-api"
  retention_in_days = 14
}

# ── Task Definition ───────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "api" {
  family                   = "${local.prefix}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = var.app_name == "allojoy" ? "allojoy-api" : "${local.prefix}-api"
    image = "${aws_ecr_repository.api.repository_url}:latest"
    portMappings = [{ containerPort = 3000; protocol = "tcp" }]

    environment = [
      { name = "NODE_ENV";   value = "production" },
      { name = "PORT";       value = "3000" },
      { name = "LOG_LEVEL";  value = "info" },
      { name = "AFRICASTALKING_USERNAME"; value = var.africastalking_username },
    ]

    secrets = [
      { name = "DATABASE_URL";              valueFrom = aws_ssm_parameter.database_url.arn },
      { name = "REDIS_URL";                 valueFrom = aws_ssm_parameter.redis_url.arn },
      { name = "JWT_SECRET";                valueFrom = aws_ssm_parameter.jwt_secret.arn },
      { name = "AFRICASTALKING_API_KEY";    valueFrom = aws_ssm_parameter.africastalking_key.arn },
      { name = "GRAPHHOPPER_URL";           valueFrom = aws_ssm_parameter.graphhopper_url.arn },
      { name = "WHATSAPP_TOKEN";            valueFrom = aws_ssm_parameter.whatsapp_token.arn },
      { name = "WHATSAPP_PHONE_ID";         valueFrom = aws_ssm_parameter.whatsapp_phone_id.arn },
      { name = "WHATSAPP_VERIFY_TOKEN";     valueFrom = aws_ssm_parameter.whatsapp_verify_token.arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "api"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 15
    }
  }])
}

# ── ECS Service ───────────────────────────────────────────────────────────────
resource "aws_ecs_service" "api" {
  name            = "${local.prefix}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "allojoy-api"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener.https]

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}

# ── SSM Parameters (secrets) ──────────────────────────────────────────────────
resource "aws_ssm_parameter" "database_url" {
  name  = "/${local.prefix}/DATABASE_URL"
  type  = "SecureString"
  value = "postgresql://allojoy:${var.db_password}@${aws_db_instance.postgres.address}:5432/allojoy"
}

resource "aws_ssm_parameter" "redis_url" {
  name  = "/${local.prefix}/REDIS_URL"
  type  = "SecureString"
  value = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379"
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${local.prefix}/JWT_SECRET"
  type  = "SecureString"
  value = var.jwt_secret
}

resource "aws_ssm_parameter" "africastalking_key" {
  name  = "/${local.prefix}/AFRICASTALKING_API_KEY"
  type  = "SecureString"
  value = var.africastalking_api_key
}

resource "aws_ssm_parameter" "graphhopper_url" {
  name  = "/${local.prefix}/GRAPHHOPPER_URL"
  type  = "String"
  value = "http://${aws_lb.main.dns_name}:8989"
}

resource "aws_ssm_parameter" "whatsapp_token" {
  name  = "/${local.prefix}/WHATSAPP_TOKEN"
  type  = "SecureString"
  value = var.whatsapp_token
}

resource "aws_ssm_parameter" "whatsapp_phone_id" {
  name  = "/${local.prefix}/WHATSAPP_PHONE_ID"
  type  = "String"
  value = var.whatsapp_phone_id
}

resource "aws_ssm_parameter" "whatsapp_verify_token" {
  name  = "/${local.prefix}/WHATSAPP_VERIFY_TOKEN"
  type  = "SecureString"
  value = var.whatsapp_verify_token
}
