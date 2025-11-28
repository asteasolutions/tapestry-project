output "security_group_id" {
  description = "The security group ID, used in ECS module for Redis access"
  value       = aws_security_group.redis.id
}

output "redis_host" {
  description = "The FQDN of the Redis instance, used in ECS module for making database connections"
  value       = aws_elasticache_cluster.redis.cluster_address
}
