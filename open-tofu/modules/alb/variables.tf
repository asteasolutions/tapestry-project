variable "vpc_id" {
  description = "A pointer to module.networking.vpc_id that will allow ALB to be associated with the VPC"
  type        = string
}

variable "alb_subnets" {
  description = "A pointer to module.networking.alb_subnet_ids that contains the public subnets for ALB"
  type        = list(string)
}

variable "alb_certificate_arn" {
  description = "A pointer to the wildcard ACM certificate in main.tf for for SSL/TLS"
  type        = string
}

variable "base_tags" {
  description = "Base tags for resources"
  type        = map(string)
}
