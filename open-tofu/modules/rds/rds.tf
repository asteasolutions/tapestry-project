resource "aws_security_group" "rds" {
  name   = "tapestries-${var.base_tags.Environment}-rds-security-group"
  vpc_id = var.vpc_id

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-rds-security-group" })
}

resource "aws_db_subnet_group" "rds" {
  name       = "tapestries-${var.base_tags.Environment}-rds-subnet-group"
  subnet_ids = var.rds_subnets
  tags       = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-rds-subnet-group" })
}

resource "aws_db_instance" "postgres" {
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "17.4"
  instance_class         = "db.t4g.micro"
  username               = var.db_username
  password               = var.db_password
  parameter_group_name   = "default.postgres17"
  skip_final_snapshot    = true
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  tags                   = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-postgres" })
}
