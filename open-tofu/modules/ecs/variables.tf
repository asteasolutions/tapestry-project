variable "vpc_id" {
  description = "A pointer to module.networking.vpc_id that will allow the ECS to be associated with the VPC"
  type        = string
}

variable "alb_security_group_id" {
  description = "A pointer to module.alb.security_group_id that will receive permission to connect to ECS"
  type        = string
}

variable "rds_security_group_id" {
  description = "A pointer to module.rds.security_group_id that ECS will allow access to"
  type        = string
}

variable "redis_security_group_id" {
  description = "A pointer to module.redis.security_group_id that ECS will allow access to"
  type        = string
}

variable "ecs_subnets" {
  description = "A pointer to module.networking.ecs_subnet_ids that contains the private subnets for ECS"
  type        = list(string)
}

variable "s3_bucket_name" {
  description = "A pointer to module.storage.s3_bucket_name that contains the S3 bucket name needed for task role permissions"
  type        = string
}

variable "server_image_url" {
  description = "A pointer to module.storage.server_image_url that contains the server container image"
  type        = string
}

variable "worker_image_url" {
  description = "A pointer to module.storage.worker_image_url that contains the worker container image"
  type        = string
}

variable "db_host" {
  description = "A pointer to module.rds.db_host that contains the FQDN of the RDS instance"
  type        = string
}

variable "redis_host" {
  description = "A pointer to module.redis.redis_host that contains the FQDN of the Redis instance"
  type        = string
}

variable "target_group_arn" {
  description = "A pointer to module.alb.alb_target_group_arn, used for load balancing backend traffic"
  type        = string
}

variable "base_tags" {
  description = "Base tags for resources"
  type        = map(string)
}
