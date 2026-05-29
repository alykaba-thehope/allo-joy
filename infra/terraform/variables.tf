variable "region" {
  description = "AWS region"
  default     = "af-south-1"
}

variable "environment" {
  description = "prod | staging"
  default     = "prod"
}

variable "app_name" {
  description = "Application name"
  default     = "allojoy"
}

variable "db_instance_class" {
  description = "RDS instance type"
  default     = "db.t3.micro"
}

variable "db_password" {
  description = "RDS master password"
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  sensitive   = true
}

variable "africastalking_api_key" {
  description = "Africa's Talking API key"
  sensitive   = true
}

variable "africastalking_username" {
  description = "Africa's Talking username"
}

variable "domain_name" {
  description = "Base domain"
  default     = "allojoy.gn"
}

variable "api_cpu" {
  description = "ECS task CPU units (256 = 0.25 vCPU)"
  default     = 512
}

variable "api_memory" {
  description = "ECS task memory (MiB)"
  default     = 1024
}

variable "api_desired_count" {
  description = "Number of API replicas"
  default     = 2
}

variable "whatsapp_token" {
  description = "Meta WhatsApp Business Cloud API token"
  sensitive   = true
  default     = ""
}

variable "whatsapp_phone_id" {
  description = "WhatsApp Business phone number ID"
  default     = ""
}

variable "whatsapp_verify_token" {
  description = "Token de vérification webhook Meta"
  sensitive   = true
  default     = ""
}
