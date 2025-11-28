resource "aws_s3_bucket" "s3_frontend" {
  bucket = "tapestries-${var.base_tags.Environment}-bucket-frontend"
  tags   = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-bucket-frontend" })
}

resource "aws_s3_bucket_public_access_block" "deny_all" {
  bucket                  = aws_s3_bucket.s3_frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_ecr_repository" "server" {
  name                 = "tapestries-${var.base_tags.Environment}-server"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-server" })
}

resource "aws_ecr_repository" "worker" {
  name                 = "tapestries-${var.base_tags.Environment}-worker"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-worker" })
}
