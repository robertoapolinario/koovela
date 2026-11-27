# OCI Vault do ambiente (REQ-FND-081). Os VALORES dos segredos nunca ficam no repositório nem no estado:
# cada segredo nasce com um marcador e é preenchido pelo runbook de rotação (docs/ops/secret-rotations).
terraform {
  required_providers {
    oci = { source = "oracle/oci", version = "9.15.0" }
  }
}

variable "compartment_id" { type = string }
variable "name" { type = string }
variable "secret_names" { type = set(string) }

resource "oci_kms_vault" "this" {
  compartment_id = var.compartment_id
  display_name   = "${var.name}-vault"
  vault_type     = "DEFAULT"
}

resource "oci_kms_key" "master" {
  compartment_id      = var.compartment_id
  display_name        = "${var.name}-master"
  management_endpoint = oci_kms_vault.this.management_endpoint
  protection_mode     = "SOFTWARE" # HSM não é Always Free
  key_shape {
    algorithm = "AES"
    length    = 32
  }
}

resource "oci_vault_secret" "this" {
  for_each       = var.secret_names
  compartment_id = var.compartment_id
  vault_id       = oci_kms_vault.this.id
  key_id         = oci_kms_key.master.id
  secret_name    = each.value
  secret_content {
    content_type = "BASE64"
    content      = base64encode("PREENCHER-PELO-RUNBOOK")
  }
  lifecycle {
    ignore_changes = [secret_content]
  }
}

output "vault_id" { value = oci_kms_vault.this.id }
output "secret_ids" { value = { for k, s in oci_vault_secret.this : k => s.id } }
