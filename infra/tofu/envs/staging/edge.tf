# Borda do staging: túnel e Access próprios. As regras da zona (cabeçalhos, www → apex, rate limit e o
# X-Robots-Tag: noindex de TODO o staging — REQ-FND-035) ficam no módulo cloudflare-edge, aplicado uma vez
# pela raiz de produção, porque a zona koovela.com é única e a Cloudflare aceita um ruleset por fase.
module "tunnel" {
  source     = "../../modules/cloudflare-tunnel"
  account_id = var.cloudflare_account_id
  zone_id    = var.cloudflare_zone_id
  env        = "staging"
  suffix     = ".staging"
}

module "access" {
  source               = "../../modules/cloudflare-access"
  account_id           = var.cloudflare_account_id
  env                  = "staging"
  suffix               = ".staging"
  github_org           = var.github_org
  github_client_id     = var.github_oauth_client_id
  github_client_secret = var.github_oauth_client_secret
  admin_allowed_ips    = var.admin_allowed_ips
}

variable "github_oauth_client_id" { type = string }
variable "github_oauth_client_secret" {
  type      = string
  sensitive = true
}
