# Borda de produção: túnel e Access de produção, e as regras da zona koovela.com inteira
# (produção e staging — ver modules/cloudflare-edge) e o e-mail.
module "edge" {
  source  = "../../modules/cloudflare-edge"
  zone_id = var.cloudflare_zone_id
}

module "tunnel" {
  source     = "../../modules/cloudflare-tunnel"
  account_id = var.cloudflare_account_id
  zone_id    = var.cloudflare_zone_id
  env        = "production"
  suffix     = ""
}

module "access" {
  source               = "../../modules/cloudflare-access"
  account_id           = var.cloudflare_account_id
  env                  = "production"
  suffix               = ""
  github_org           = var.github_org
  github_client_id     = var.github_oauth_client_id
  github_client_secret = var.github_oauth_client_secret
  admin_allowed_ips    = var.admin_allowed_ips
}

module "email" {
  source     = "../../modules/email-dns"
  zone_id    = var.cloudflare_zone_id
  account_id = var.cloudflare_account_id
  dkim       = var.dkim_public_keys
  forward_to = var.email_forward_to
}

variable "github_oauth_client_id" { type = string }
variable "github_oauth_client_secret" {
  type      = string
  sensitive = true
}
variable "dkim_public_keys" { type = map(string) }
variable "email_forward_to" {
  type      = map(string)
  sensitive = true
}
