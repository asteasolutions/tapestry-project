variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
}

variable "environment" {
  description = "The environment name: demo, dev, staging, prod"
  type        = string
}

variable "db_username" {
  description = "The RDS database username"
  sensitive   = true
  type        = string
}

variable "db_password" {
  description = "The RDS database user password"
  sensitive   = true
  type        = string
}
