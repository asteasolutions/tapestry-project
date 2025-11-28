output "ecs_security_group_id" {
  description = "ECS security group ID, used by RDS and Redis moudles to allow inbound traffic from ECS tasks"
  value       = aws_security_group.ecs.id
}
