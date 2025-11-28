resource "aws_security_group" "ecs" {
  name   = "tapestries-${var.base_tags.Environment}-ecs-security-group"
  vpc_id = var.vpc_id

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-ecs-security-group" })
}

resource "aws_security_group_rule" "alb_to_ecs" {
  type                     = "ingress"
  protocol                 = "tcp"
  from_port                = 3000
  to_port                  = 3000
  security_group_id        = aws_security_group.ecs.id
  source_security_group_id = var.alb_security_group_id
}

resource "aws_security_group_rule" "ecs_to_rds" {
  type                     = "ingress"
  security_group_id        = var.rds_security_group_id
  source_security_group_id = aws_security_group.ecs.id
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
}

resource "aws_security_group_rule" "ecs_to_redis" {
  type                     = "ingress"
  security_group_id        = var.redis_security_group_id
  source_security_group_id = aws_security_group.ecs.id
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
}

resource "aws_iam_role" "execution_role" {
  name = "tapestries-${var.base_tags.Environment}-ecs-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = { Service = "ecs-tasks.amazonaws.com" },
      Action    = "sts:AssumeRole"
    }]
  })

  tags = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-ecs-execution-role" })
}

resource "aws_iam_role_policy_attachment" "execution_role" {
  role       = aws_iam_role.execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task_role" {
  name = "tapestries-${var.base_tags.Environment}-ecs-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = { Service = "ecs-tasks.amazonaws.com" },
      Action    = "sts:AssumeRole"
    }]
  })

  tags = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-ecs-task-role" })
}

resource "aws_ecs_cluster" "this" {
  name = "tapestries-${var.base_tags.Environment}-ecs-cluster"
  tags = var.base_tags
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "tapestries-${var.base_tags.Environment}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"

  execution_role_arn = aws_iam_role.execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "${var.base_tags.Environment}-server"
      image     = var.server_image_url
      essential = true
      cpu       = 256
      memory    = 512
      portMappings = [
        { containerPort = 3000 }
      ],
      environment = [
        { name = "DB_HOST", value = var.db_host },
        { name = "REDIS_HOST", value = var.redis_host }
      ]
    },
    {
      name      = "${var.base_tags.Environment}-worker"
      image     = var.worker_image_url
      essential = true
      cpu       = 256
      memory    = 512
      environment = [
        { name = "DB_HOST", value = var.db_host },
        { name = "REDIS_HOST", value = var.redis_host }
      ]
    }
  ])
}

resource "aws_ecs_service" "backend" {
  name            = "tapestries-${var.base_tags.Environment}-backend"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.backend.arn
  launch_type     = "FARGATE"
  desired_count   = 2

  network_configuration {
    subnets          = var.ecs_subnets
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "${var.base_tags.Environment}-server"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "vault" {
  family                   = "tapestries-${var.base_tags.Environment}-vault"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "1024"

  execution_role_arn = aws_iam_role.execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "${var.base_tags.Environment}-vault"
      image     = "hashicorp/vault:1.20"
      essential = true
      portMappings = [
        { containerPort = 8200 }
      ]
    }
  ])
}

resource "aws_ecs_service" "vault" {
  name            = "tapestries-${var.base_tags.Environment}-backend"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.vault.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets          = var.ecs_subnets
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }
}
