# Cloudflare Tunnel: única entrada da OCI (REQ-FND-033). Nenhuma porta aberta nos hosts.
terraform {
  required_providers {
    cloudflare = { source = "cloudflare/cloudflare", version = "5.29.0" }
  }
}

variable "account_id" { type = string }
variable "zone_id" { type = string }
variable "env" { type = string }
variable "suffix" { type = string }

locals {
  apex = var.env == "production" ? "koovela.com" : "staging.koovela.com"
  routes = {
    apex   = local.apex
    app    = "app${var.suffix}.koovela.com"
    painel = "painel${var.suffix}.koovela.com"
    api    = "api${var.suffix}.koovela.com"
    admin  = "admin${var.suffix}.koovela.com"
    bi     = "bi${var.suffix}.koovela.com"
  }
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "app" {
  account_id = var.account_id
  name       = "koovela-${var.env}-app"
  config_src = "cloudflare"
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "app" {
  account_id = var.account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.app.id
  config = {
    ingress = concat(
      [for name, host in local.routes : { hostname = host, service = "http://localhost:8000" }],
      [
        { hostname = "ssh-app${var.suffix}.koovela.com", service = "ssh://localhost:22" },
        { service = "http_status:404" },
      ],
    )
  }
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "db" {
  account_id = var.account_id
  name       = "koovela-${var.env}-db"
  config_src = "cloudflare"
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "db" {
  account_id = var.account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.db.id
  config = {
    ingress = [
      { hostname = "grafana${var.suffix}.koovela.com", service = "http://localhost:3000" },
      { hostname = "ssh-db${var.suffix}.koovela.com", service = "ssh://localhost:22" },
      { service = "http_status:404" },
    ]
  }
}

resource "cloudflare_dns_record" "app" {
  for_each = merge(local.routes, { ssh = "ssh-app${var.suffix}.koovela.com" })
  zone_id  = var.zone_id
  name     = each.value
  type     = "CNAME"
  content  = "${cloudflare_zero_trust_tunnel_cloudflared.app.id}.cfargotunnel.com"
  proxied  = true
  ttl      = 1
}

resource "cloudflare_dns_record" "db" {
  for_each = { grafana = "grafana${var.suffix}.koovela.com", ssh = "ssh-db${var.suffix}.koovela.com" }
  zone_id  = var.zone_id
  name     = each.value
  type     = "CNAME"
  content  = "${cloudflare_zero_trust_tunnel_cloudflared.db.id}.cfargotunnel.com"
  proxied  = true
  ttl      = 1
}

output "app_tunnel_id" { value = cloudflare_zero_trust_tunnel_cloudflared.app.id }
output "db_tunnel_id" { value = cloudflare_zero_trust_tunnel_cloudflared.db.id }
