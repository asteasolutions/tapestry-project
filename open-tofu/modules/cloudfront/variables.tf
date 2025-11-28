variable "comment" {
  description = "Description for the CloudFront distribution"
  type        = string
}

variable "aliases" {
  description = "List of aliases (custom domains) for the CloudFront distribution"
  type        = list(string)
}

variable "origin_type" {
  description = "Type of the CloudFront origin: 's3' for S3 bucket or 'alb' for Application Load Balancer"
  type        = string
}

variable "origin_domain_name" {
  description = "A pointer to module.storage.s3_frontend_bucket_domain_name (for S3) or module.alb.alb_dns_name (for ALB)"
  type        = string
}

variable "acm_certificate_arn" {
  description = "A pointer to the wildcard ACM certificate in main.tf for for SSL/TLS"
  type        = string
}

variable "base_tags" {
  description = "Base tags for resources"
  type        = map(string)
}
