output "security_group_id" {
  description = "The RDS security group ID, used in ECS module for database access"
  value       = aws_security_group.rds.id
}

output "db_host" {
  description = "The FQDN of the RDS instance, used in ECS module for making database connections"
  value       = aws_db_instance.postgres.address
}
