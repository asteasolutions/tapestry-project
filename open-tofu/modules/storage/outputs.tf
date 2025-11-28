output "s3_frontend_bucket_domain_name" {
  description = "S3 bucket FQDN for use in CloudFront origin"
  value       = aws_s3_bucket.s3_frontend.bucket_regional_domain_name
}

output "s3_bucket_name" {
  description = "S3 bucket name for use in ECS task role policy"
  value       = aws_s3_bucket.s3_frontend.id
}

output "server_image_url" {
  description = "Server image repository, used to specify ECS contianer image"
  value       = aws_ecr_repository.server.repository_url
}

output "worker_image_url" {
  description = "Worker image repository, used to specify ECS contianer image"
  value       = aws_ecr_repository.worker.repository_url
}
