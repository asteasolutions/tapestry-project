variable "vpc_cidr" {
  description = "The IP space available for resources in the VPC"
  type        = string
}

variable "subnet_purposes" {
  description = "List of subnet resource purposes (public_alb, private_ecs, private_rds...)"
  type        = list(string)
}

variable "azs" {
  description = "List of Availability Zones where subnets will be created. For each AZ, one subnet per purpose will be created"
  type        = list(string)
}

variable "base_tags" {
  description = "Base tags for resources"
  type        = map(string)
}
