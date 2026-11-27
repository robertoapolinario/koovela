# E-mail (REQ-FND-084): SPF, DKIM e DMARC p=quarantine em mail. e news.; Email Routing das caixas de atendimento.
# Os endereços de destino do encaminhamento vêm de variável (nunca no repositório).
terraform {
  required_providers {
    cloudflare = { source = "cloudflare/cloudflare", version = "5.29.0" }
  }
}

variable "zone_id" { type = string }
variable "account_id" { type = string }
variable "dkim" {
  type        = map(string)
  description = "Chave pública DKIM por domínio de envio (fornecida pelo provedor de e-mail)"
}
variable "spf_include" {
  type    = string
  default = "include:amazonses.com"
}
variable "forward_to" {
  type        = map(string)
  sensitive   = true
  description = "Destino de suporte@, privacidade@ e seguranca@ (endereços pessoais ficam fora do repositório)"
}

locals {
  sending = toset(["mail", "news"])
  inboxes = toset(["suporte", "privacidade", "seguranca"])
}

resource "cloudflare_dns_record" "spf" {
  for_each = local.sending
  zone_id  = var.zone_id
  name     = "${each.key}.koovela.com"
  type     = "TXT"
  content  = "\"v=spf1 ${var.spf_include} -all\""
  ttl      = 3600
}

resource "cloudflare_dns_record" "dkim" {
  for_each = local.sending
  zone_id  = var.zone_id
  name     = "resend._domainkey.${each.key}.koovela.com"
  type     = "TXT"
  content  = "\"${var.dkim[each.key]}\""
  ttl      = 3600
}

resource "cloudflare_dns_record" "dmarc" {
  for_each = local.sending
  zone_id  = var.zone_id
  name     = "_dmarc.${each.key}.koovela.com"
  type     = "TXT"
  content  = "\"v=DMARC1; p=quarantine; adkim=s; aspf=s; rua=mailto:dmarc@koovela.com\""
  ttl      = 3600
}

resource "cloudflare_dns_record" "dmarc_apex" {
  zone_id = var.zone_id
  name    = "_dmarc.koovela.com"
  type    = "TXT"
  content = "\"v=DMARC1; p=quarantine; rua=mailto:dmarc@koovela.com\""
  ttl     = 3600
}

resource "cloudflare_email_routing_settings" "this" {
  zone_id = var.zone_id
}

resource "cloudflare_email_routing_address" "dest" {
  for_each   = toset(values(nonsensitive(var.forward_to)))
  account_id = var.account_id
  email      = each.value
}

resource "cloudflare_email_routing_rule" "inbox" {
  for_each = local.inboxes
  zone_id  = var.zone_id
  name     = each.key
  enabled  = true
  matchers = [{ type = "literal", field = "to", value = "${each.key}@koovela.com" }]
  actions  = [{ type = "forward", value = [var.forward_to[each.key]] }]
}
