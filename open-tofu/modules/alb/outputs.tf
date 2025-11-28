output "alb_dns_name" {
  description = "The FQDN of the ALB, used in the CloudFront module as an origin"
  value       = aws_lb.alb.dns_name
}

output "security_group_id" {
  description = "ALB security group ID, used by the ECS module to allow inbound traffic"
  value       = aws_security_group.alb.id
}

output "alb_target_group_arn" {
  description = "The ARN of the ALB target group, used by the backend ECS service for load balancing"
  value       = aws_lb_target_group.alb.arn
}
