variable "vpc_id" {
  description = "A pointer to module.networking.vpc_id that will allow RDS to be associated with the VPC"
  type        = string
}

variable "rds_subnets" {
  description = "A pointer to module.networking.rds_subnet_ids that contains the private subnets for RDS"
  type        = list(string)
}

variable "db_username" {
  description = "RDS database username"
  sensitive   = true
  type        = string
}

variable "db_password" {
  description = "RDS database password"
  sensitive   = true
  type        = string
}

variable "base_tags" {
  description = "Base tags for resources"
  type        = map(string)
}
