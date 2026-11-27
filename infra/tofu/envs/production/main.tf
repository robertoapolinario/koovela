# Ambiente production — conta OCI própria (REQ-FND-023). Estado no Object Storage desta conta
# (endpoint compatível com S3). Credenciais só por variáveis de ambiente, nunca em arquivo versionado.
terraform {
  required_version = ">= 1.12.0"
  required_providers {
    oci        = { source = "oracle/oci", version = "9.15.0" }
    cloudflare = { source = "cloudflare/cloudflare", version = "5.29.0" }
  }
  backend "s3" {
    bucket                      = "koovela-tofu-state-production"
    key                         = "production/terraform.tfstate"
    region                      = "sa-saopaulo-1"
    use_path_style              = true
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
    # endpoints.s3 = "https://<namespace>.compat.objectstorage.sa-saopaulo-1.oraclecloud.com" via -backend-config
  }
}

provider "oci" {
  region = var.region
}

provider "cloudflare" {}

variable "region" {
  type    = string
  default = "sa-saopaulo-1"
}
variable "compartment_id" { type = string }
variable "availability_domain" { type = string }
variable "ssh_public_keys" { type = list(string) }
variable "cloudflare_zone_id" { type = string }
variable "cloudflare_account_id" { type = string }
variable "admin_allowed_ips" {
  type    = list(string)
  default = []
}
variable "github_org" { type = string }

locals {
  env      = "production"
  hostname = "app-prod-01"
  db_name  = "db-worker-01"
}

module "network" {
  source         = "../../modules/network"
  compartment_id = var.compartment_id
  name           = "koovela-${local.env}"
}

module "object_storage" {
  source         = "../../modules/object-storage"
  compartment_id = var.compartment_id
  name           = "koovela-${local.env}"
}

module "vault" {
  source         = "../../modules/vault"
  compartment_id = var.compartment_id
  name           = "koovela-${local.env}"
  secret_names = toset([
    "mysql_root_password", "mysql_password_platform", "mysql_password_gateway",
    "redis_password", "rabbitmq_password", "rabbitmq_url", "redis_url", "sentry_dsn",
    "grafana_admin_password", "smtp_password", "ntfy_token",
    "tunnel_token_app", "tunnel_token_db", "restic_password", "r2_access_key_id", "r2_secret_access_key",
    "oci_s3_access_key_id", "oci_s3_secret_access_key", "mysql_exporter_cnf", "alertmanager_webhook_token",
  ])
}

# Divisão da cota Always Free da conta: 4 OCPU e 24 GB entre os dois hosts.
module "app_host" {
  source              = "../../modules/compute"
  compartment_id      = var.compartment_id
  availability_domain = var.availability_domain
  name                = local.hostname
  subnet_id           = module.network.app_subnet_id
  ocpus               = 2
  memory_gb           = 12
  ssh_public_keys     = var.ssh_public_keys
  user_data           = file("${path.module}/../../../host/cloud-init/app.yaml")
}

module "db_host" {
  source              = "../../modules/compute"
  compartment_id      = var.compartment_id
  availability_domain = var.availability_domain
  name                = local.db_name
  subnet_id           = module.network.data_subnet_id
  ocpus               = 2
  memory_gb           = 12
  boot_volume_gb      = 100
  ssh_public_keys     = var.ssh_public_keys
  user_data           = file("${path.module}/../../../host/cloud-init/db.yaml")
}

output "app_private_ip" { value = module.app_host.private_ip }
output "db_private_ip" { value = module.db_host.private_ip }
