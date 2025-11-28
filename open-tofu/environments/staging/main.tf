terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  base_tags = {
    Environment = var.environment
    OpenTofu    = "true"
  }
}

data "aws_acm_certificate" "wildcard" {
  domain      = "tapestries.media"
  statuses    = ["ISSUED"]
  most_recent = true
}

module "storage" {
  source    = "../../modules/storage"
  base_tags = local.base_tags
}

module "networking" {
  source          = "../../modules/networking"
  vpc_cidr        = "172.31.0.0/16"
  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  subnet_purposes = ["public_alb", "private_ecs", "private_rds", "private_redis"]
  base_tags       = local.base_tags
  depends_on      = [module.storage]
}

module "alb" {
  source              = "../../modules/alb"
  vpc_id              = module.networking.vpc_id
  alb_subnets         = module.networking.alb_subnet_ids
  alb_certificate_arn = data.aws_acm_certificate.wildcard.arn
  base_tags           = local.base_tags
  depends_on          = [module.networking]
}

module "cloudfront_s3" {
  source              = "../../modules/cloudfront"
  comment             = "Static S3 website CloudFront distribution (OAC)"
  origin_type         = "s3"
  aliases             = ["${local.base_tags.Environment}.tapestries.media"]
  origin_domain_name  = module.storage.s3_frontend_bucket_domain_name
  acm_certificate_arn = data.aws_acm_certificate.wildcard.arn
  base_tags           = local.base_tags
  depends_on          = [module.alb]
}

module "cloudfront_alb" {
  source              = "../../modules/cloudfront"
  comment             = "Backend ALB CloudFront distribution"
  origin_type         = "alb"
  aliases             = ["${local.base_tags.Environment}.api.tapestries.media"]
  origin_domain_name  = module.alb.alb_dns_name
  acm_certificate_arn = data.aws_acm_certificate.wildcard.arn
  base_tags           = local.base_tags
  depends_on          = [module.alb]
}

module "rds" {
  source      = "../../modules/rds"
  vpc_id      = module.networking.vpc_id
  rds_subnets = module.networking.rds_subnet_ids
  db_username = var.db_username
  db_password = var.db_password
  base_tags   = local.base_tags
  depends_on  = [module.alb]
}

module "redis" {
  source        = "../../modules/redis"
  vpc_id        = module.networking.vpc_id
  redis_subnets = module.networking.redis_subnet_ids
  base_tags     = local.base_tags
  depends_on    = [module.alb]
}

module "ecs" {
  source                  = "../../modules/ecs"
  vpc_id                  = module.networking.vpc_id
  alb_security_group_id   = module.alb.security_group_id
  rds_security_group_id   = module.rds.security_group_id
  redis_security_group_id = module.redis.security_group_id
  ecs_subnets             = module.networking.ecs_subnet_ids
  s3_bucket_name          = module.storage.s3_bucket_name
  server_image_url        = module.storage.server_image_url
  worker_image_url        = module.storage.worker_image_url
  db_host                 = module.rds.db_host
  redis_host              = module.redis.redis_host
  target_group_arn        = module.alb.alb_target_group_arn
  base_tags               = local.base_tags
  depends_on              = [module.rds, module.redis]
}
