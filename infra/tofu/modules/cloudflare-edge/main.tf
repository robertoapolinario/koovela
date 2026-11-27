# Borda Cloudflare da zona koovela.com (REQ-FND-031/032/034/035): TLS, HSTS preload, cabeçalhos por superfície,
# www → apex, rate limit em api., noindex em staging e sempre em admin/bi.
terraform {
  required_providers {
    cloudflare = { source = "cloudflare/cloudflare", version = "5.29.0" }
  }
}

variable "zone_id" { type = string }
variable "api_rate_limit_per_10s" {
  type    = number
  default = 100
}

# A zona koovela.com é uma só: as regras de produção e de staging ficam juntas aqui (um ruleset por fase).
locals {
  envs = {
    production = { suffix = "", apex = "koovela.com", noindex = false }
    staging    = { suffix = ".staging", apex = "staging.koovela.com", noindex = true }
  }
  hosts = { for e, v in local.envs : e => merge(v, {
    app    = "app${v.suffix}.koovela.com"
    painel = "painel${v.suffix}.koovela.com"
    api    = "api${v.suffix}.koovela.com"
    admin  = "admin${v.suffix}.koovela.com"
    bi     = "bi${v.suffix}.koovela.com"
    csp_web = join("; ", [
      "default-src 'self'", "script-src 'self'", "style-src 'self'",
      "img-src 'self' data: https://cdn${v.suffix}.koovela.com", "font-src 'self'",
      "connect-src 'self' https://api${v.suffix}.koovela.com", "frame-ancestors 'none'",
      "base-uri 'self'", "form-action 'self'", "object-src 'none'",
    ])
  }) }
  csp_api = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
  common = {
    "X-Frame-Options"        = { operation = "set", value = "DENY" }
    "X-Content-Type-Options" = { operation = "set", value = "nosniff" }
    "Referrer-Policy"        = { operation = "set", value = "strict-origin-when-cross-origin" }
    "Permissions-Policy"     = { operation = "set", value = "camera=(), microphone=(), geolocation=(), payment=(), usb=()" }
  }
  noindex = { "X-Robots-Tag" = { operation = "set", value = "noindex, nofollow" } }

  header_rules = flatten([for e, h in local.hosts : [
    {
      ref               = "${e}_api"
      description       = "${e}: API (CSP none)"
      expression        = "(http.host eq \"${h.api}\")"
      action            = "rewrite"
      action_parameters = { headers = merge(local.common, { "Content-Security-Policy" = { operation = "set", value = local.csp_api } }, h.noindex ? local.noindex : {}) }
    },
    {
      ref               = "${e}_admin_bi"
      description       = "${e}: admin e bi nunca indexados (REQ-FND-034)"
      expression        = "(http.host in {\"${h.admin}\" \"${h.bi}\"})"
      action            = "rewrite"
      action_parameters = { headers = merge(local.common, local.noindex, { "Content-Security-Policy" = { operation = "set", value = h.csp_web } }) }
    },
    {
      ref               = "${e}_web"
      description       = "${e}: webs e páginas públicas${h.noindex ? " (noindex, REQ-FND-035)" : ""}"
      expression        = "(http.host in {\"${h.apex}\" \"${h.app}\" \"${h.painel}\"})"
      action            = "rewrite"
      action_parameters = { headers = merge(local.common, { "Content-Security-Policy" = { operation = "set", value = h.csp_web } }, h.noindex ? local.noindex : {}) }
    },
  ]])
}

resource "cloudflare_zone_setting" "always_https" {
  zone_id    = var.zone_id
  setting_id = "always_use_https"
  value      = "on"
}

resource "cloudflare_zone_setting" "min_tls" {
  zone_id    = var.zone_id
  setting_id = "min_tls_version"
  value      = "1.2"
}

resource "cloudflare_zone_setting" "ssl" {
  zone_id    = var.zone_id
  setting_id = "ssl"
  value      = "strict"
}

resource "cloudflare_zone_setting" "hsts" {
  zone_id    = var.zone_id
  setting_id = "security_header"
  value = {
    strict_transport_security = {
      enabled            = true
      max_age            = 63072000
      include_subdomains = true
      preload            = true
      nosniff            = true
    }
  }
}

# www → apex, 301, preservando caminho e query (REQ-FND-031).
resource "cloudflare_ruleset" "redirects" {
  zone_id = var.zone_id
  name    = "koovela-redirects"
  kind    = "zone"
  phase   = "http_request_dynamic_redirect"
  rules = [for e, h in local.hosts : {
    ref         = "${e}_www_to_apex"
    description = "${e}: www → apex"
    expression  = "(http.host eq \"www.${h.apex}\")"
    action      = "redirect"
    action_parameters = {
      from_value = {
        status_code           = 301
        preserve_query_string = true
        target_url            = { expression = "concat(\"https://${h.apex}\", http.request.uri.path)" }
      }
    }
  }]
}

# Cabeçalhos de segurança por superfície (REQ-FND-032), noindex em staging (035) e sempre em admin/bi (034).
resource "cloudflare_ruleset" "headers" {
  zone_id = var.zone_id
  name    = "koovela-headers"
  kind    = "zone"
  phase   = "http_response_headers_transform"
  rules   = local.header_rules
}

# A única regra de rate limit do plano gratuito: api. de produção e staging (o fino fica no gateway).
resource "cloudflare_ruleset" "ratelimit" {
  zone_id = var.zone_id
  name    = "koovela-ratelimit"
  kind    = "zone"
  phase   = "http_ratelimit"
  rules = [{
    ref         = "api"
    description = "api: limite por IP"
    expression  = "(http.host in {\"${local.hosts.production.api}\" \"${local.hosts.staging.api}\"})"
    action      = "block"
    ratelimit = {
      characteristics     = ["ip.src", "cf.colo.id"]
      period              = 10
      requests_per_period = var.api_rate_limit_per_10s
      mitigation_timeout  = 10
    }
  }]
}

# Endereços reservados e www: respondem na borda sem aplicação (REQ-FND-030/031).
resource "cloudflare_dns_record" "edge_only" {
  for_each = toset(flatten([for e, h in local.hosts : ["parceiros${h.suffix}.koovela.com", "cdn${h.suffix}.koovela.com", "www.${h.apex}"]]))
  zone_id  = var.zone_id
  name     = each.value
  type     = "AAAA"
  content  = "100::"
  proxied  = true
  ttl      = 1
  comment  = "só borda (CONST 3)"
}

resource "cloudflare_dns_record" "dev_reserved" {
  zone_id = var.zone_id
  name    = "dev.koovela.com"
  type    = "TXT"
  content = "\"reservado (CONST 3): ambientes de desenvolvimento usam *.localhost\""
  ttl     = 3600
}
