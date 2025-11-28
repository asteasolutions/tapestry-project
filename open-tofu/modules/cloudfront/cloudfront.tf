resource "aws_cloudfront_origin_access_control" "this" {
  count = var.origin_type == "s3" ? 1 : 0

  name                              = "tapestries-${var.base_tags.Environment}-${var.origin_type}-oac"
  description                       = "Origin access control for ${var.origin_type}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}

resource "aws_cloudfront_distribution" "this" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = var.comment
  aliases         = var.aliases
  tags            = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-cloudfront" })

  origin {
    domain_name = var.origin_domain_name
    origin_id   = "${var.origin_type}-origin"

    dynamic "s3_origin_config" {
      for_each = var.origin_type == "s3" ? [1] : []
      content {
        origin_access_identity = ""
      }
    }

    dynamic "custom_origin_config" {
      for_each = var.origin_type == "alb" ? [1] : []
      content {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }

    origin_access_control_id = var.origin_type == "s3" ? aws_cloudfront_origin_access_control.this[0].id : null
  }

  dynamic "default_cache_behavior" {
    for_each = var.origin_type == "s3" ? [1] : (var.origin_type == "alb" ? [2] : [])

    content {
      target_origin_id       = var.origin_type == "s3" ? "s3-origin" : "alb-origin"
      compress               = var.origin_type == "s3" ? true : false
      viewer_protocol_policy = var.origin_type == "s3" ? "redirect-to-https" : "https-only"
      allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
      cached_methods         = ["GET", "HEAD"]
      cache_policy_id        = var.origin_type == "s3" ? data.aws_cloudfront_cache_policy.caching_optimized.id : data.aws_cloudfront_cache_policy.caching_disabled.id
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = var.origin_type == "alb" ? [1] : []

    content {
      path_pattern             = "/subscribe/*"
      target_origin_id         = "alb-origin"
      compress                 = false
      viewer_protocol_policy   = "https-only"
      allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
      cached_methods           = ["GET", "HEAD"]
      cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
      origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
    }
  }

  dynamic "custom_error_response" {
    for_each = var.origin_type == "s3" ? [1] : []

    content {
      error_code            = 404
      response_code         = 200
      response_page_path    = "/index.html"
      error_caching_min_ttl = 10
    }
  }

  dynamic "custom_error_response" {
    for_each = var.origin_type == "s3" ? [1] : []

    content {
      error_code            = 500
      response_code         = 503
      response_page_path    = "/maintenance-page/index.html"
      error_caching_min_ttl = 10
    }
  }

  dynamic "custom_error_response" {
    for_each = var.origin_type == "s3" ? [1] : []

    content {
      error_code            = 501
      response_code         = 503
      response_page_path    = "/maintenance-page/index.html"
      error_caching_min_ttl = 10
    }
  }

  dynamic "custom_error_response" {
    for_each = var.origin_type == "s3" ? [1] : []

    content {
      error_code            = 502
      response_code         = 503
      response_page_path    = "/maintenance-page/index.html"
      error_caching_min_ttl = 10
    }
  }

  dynamic "custom_error_response" {
    for_each = var.origin_type == "s3" ? [1] : []

    content {
      error_code            = 503
      response_code         = 503
      response_page_path    = "/maintenance-page/index.html"
      error_caching_min_ttl = 10
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

data "aws_route53_zone" "this" {
  name         = "tapestries.media"
  private_zone = false
}

resource "aws_route53_record" "cloudfront_a" {
  for_each = aws_cloudfront_distribution.this.aliases
  zone_id  = data.aws_route53_zone.this.zone_id
  name     = each.value
  type     = "A"

  alias {
    name                   = aws_cloudfront_distribution.this.domain_name
    zone_id                = aws_cloudfront_distribution.this.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cloudfront_aaaa" {
  for_each = aws_cloudfront_distribution.this.aliases
  zone_id  = data.aws_route53_zone.this.zone_id
  name     = each.value
  type     = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.this.domain_name
    zone_id                = aws_cloudfront_distribution.this.hosted_zone_id
    evaluate_target_health = false
  }
}
