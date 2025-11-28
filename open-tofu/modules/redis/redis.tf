resource "aws_security_group" "redis" {
  name   = "tapestries-${var.base_tags.Environment}-redis-security-group"
  vpc_id = var.vpc_id

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-redis-security-group" })
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "tapestries-${var.base_tags.Environment}-redis-subnet-group"
  subnet_ids = var.redis_subnets
  tags       = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-redis-subnet-group" })
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.base_tags.Environment}-redis"
  engine               = "redis"
  node_type            = "cache.t3.medium"
  num_cache_nodes      = 1
  engine_version       = "7.1"
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]
  port                 = 6379
  tags                 = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-redis" })
}
