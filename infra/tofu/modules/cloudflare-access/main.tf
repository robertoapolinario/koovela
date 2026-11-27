# Cloudflare Access (REQ-FND-034): admin, bi e grafana com GitHub + MFA; admin também por lista de IPs.
# Token de serviço para o deploy entrar por SSH no túnel.
terraform {
  required_providers {
    cloudflare = { source = "cloudflare/cloudflare", version = "5.29.0" }
  }
}

variable "account_id" { type = string }
variable "env" { type = string }
variable "suffix" { type = string }
variable "github_org" { type = string }
variable "github_client_id" { type = string }
variable "github_client_secret" {
  type      = string
  sensitive = true
}
variable "admin_allowed_ips" { type = list(string) }

resource "cloudflare_zero_trust_access_identity_provider" "github" {
  account_id = var.account_id
  name       = "GitHub (${var.env})"
  type       = "github"
  config = {
    client_id     = var.github_client_id
    client_secret = var.github_client_secret
  }
}

resource "cloudflare_zero_trust_access_policy" "staff_mfa" {
  account_id = var.account_id
  name       = "koovela-${var.env}-staff-mfa"
  decision   = "allow"
  include    = [{ github_organization = { name = var.github_org, identity_provider_id = cloudflare_zero_trust_access_identity_provider.github.id } }]
  require    = [{ auth_method = { auth_method = "mfa" } }]
}

resource "cloudflare_zero_trust_access_policy" "admin_ip" {
  account_id = var.account_id
  name       = "koovela-${var.env}-admin-ip-mfa"
  decision   = "allow"
  include    = [{ github_organization = { name = var.github_org, identity_provider_id = cloudflare_zero_trust_access_identity_provider.github.id } }]
  require = concat(
    [{ auth_method = { auth_method = "mfa" } }],
    [for ip in var.admin_allowed_ips : { ip = { ip = ip } }],
  )
}

resource "cloudflare_zero_trust_access_service_token" "deploy" {
  account_id = var.account_id
  name       = "koovela-${var.env}-deploy"
  duration   = "8760h"
}

resource "cloudflare_zero_trust_access_policy" "deploy" {
  account_id = var.account_id
  name       = "koovela-${var.env}-deploy-token"
  decision   = "non_identity"
  include    = [{ service_token = { token_id = cloudflare_zero_trust_access_service_token.deploy.id } }]
}

locals {
  apps = {
    admin   = { domain = "admin${var.suffix}.koovela.com", policy = cloudflare_zero_trust_access_policy.admin_ip.id }
    bi      = { domain = "bi${var.suffix}.koovela.com", policy = cloudflare_zero_trust_access_policy.staff_mfa.id }
    grafana = { domain = "grafana${var.suffix}.koovela.com", policy = cloudflare_zero_trust_access_policy.staff_mfa.id }
    ssh_db  = { domain = "ssh-db${var.suffix}.koovela.com", policy = cloudflare_zero_trust_access_policy.staff_mfa.id }
  }
}

resource "cloudflare_zero_trust_access_application" "this" {
  for_each                  = local.apps
  account_id                = var.account_id
  name                      = "koovela-${var.env}-${each.key}"
  domain                    = each.value.domain
  type                      = "self_hosted"
  session_duration          = "12h"
  app_launcher_visible      = true
  auto_redirect_to_identity = true
  allowed_idps              = [cloudflare_zero_trust_access_identity_provider.github.id]
  policies                  = [{ id = each.value.policy, precedence = 1 }]
}

# SSH do host de aplicação: equipe (MFA) ou o token de serviço do deploy.
resource "cloudflare_zero_trust_access_application" "ssh_app" {
  account_id       = var.account_id
  name             = "koovela-${var.env}-ssh-app"
  domain           = "ssh-app${var.suffix}.koovela.com"
  type             = "self_hosted"
  session_duration = "1h"
  allowed_idps     = [cloudflare_zero_trust_access_identity_provider.github.id]
  policies = [
    { id = cloudflare_zero_trust_access_policy.deploy.id, precedence = 1 },
    { id = cloudflare_zero_trust_access_policy.staff_mfa.id, precedence = 2 },
  ]
}

output "deploy_client_id" { value = cloudflare_zero_trust_access_service_token.deploy.client_id }
output "deploy_client_secret" {
  value     = cloudflare_zero_trust_access_service_token.deploy.client_secret
  sensitive = true
}
