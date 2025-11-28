variable "vpc_id" {
  description = "A pointer to module.networking.vpc_id that will allow Redis to be associated with the VPC"
  type        = string
}

variable "redis_subnets" {
  description = "A pointer to module.networking.redis_subnet_ids that contains the private subnets for Redis"
  type        = list(string)
}

variable "base_tags" {
  description = "Base tags for resources"
  type        = map(string)
}
