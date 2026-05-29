# ── Outputs ───────────────────────────────────────────────────────────────────

output "alb_dns_name" {
  description = "ALB DNS name — use as CNAME target for api.allojoy.gn"
  value       = aws_lb.main.dns_name
}

output "ecr_repository_url" {
  description = "ECR URL — docker push <url>:latest"
  value       = aws_ecr_repository.api.repository_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (private, VPC only)"
  value       = aws_db_instance.postgres.address
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint (private, VPC only)"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "cloudfront_domains" {
  description = "CloudFront domain names for each web app"
  value = {
    for k, v in aws_cloudfront_distribution.web :
    k => v.domain_name
  }
}

output "cloudfront_distribution_ids" {
  description = "CloudFront distribution IDs — used in deploy.yml for cache invalidation"
  value = {
    for k, v in aws_cloudfront_distribution.web :
    k => v.id
  }
}

output "s3_bucket_names" {
  description = "S3 bucket names for each web app"
  value = {
    for k, v in aws_s3_bucket.web :
    k => v.bucket
  }
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN (wildcard *.allojoy.gn) — referenced by CloudFront distributions"
  value       = aws_acm_certificate.api.arn
}
