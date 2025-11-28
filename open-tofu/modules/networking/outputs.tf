output "vpc_id" {
  description = "Export the VPC ID, allowing other resources to be associated with it"
  value       = aws_vpc.this.id
}

output "alb_subnet_ids" {
  description = "List of public subnet IDs intended for ALB deployment"
  value = [
    for key in keys(local.public_subnets) :
    aws_subnet.subnets[key].id
  ]
}

output "ecs_subnet_ids" {
  description = "List of private subnet IDs intended for ECS deployment"
  value = [
    for key, subnet in local.private_subnets :
    aws_subnet.subnets[key].id
    if subnet.purpose == "private_ecs"
  ]
}

output "rds_subnet_ids" {
  description = "List of private subnet IDs intended for RDS deployment"
  value = [
    for key, subnet in local.private_subnets :
    aws_subnet.subnets[key].id
    if subnet.purpose == "private_rds"
  ]
}

output "redis_subnet_ids" {
  description = "List of private subnet IDsintended for Redis deployment"
  value = [
    for key, subnet in local.private_subnets :
    aws_subnet.subnets[key].id
    if subnet.purpose == "private_redis"
  ]
}
