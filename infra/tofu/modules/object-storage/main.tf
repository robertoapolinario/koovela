# Buckets do ambiente: cópia local do backup (restic) — privado, versionado.
terraform {
  required_providers {
    oci = { source = "oracle/oci", version = "9.15.0" }
  }
}

variable "compartment_id" { type = string }
variable "name" { type = string }

data "oci_objectstorage_namespace" "this" {
  compartment_id = var.compartment_id
}

resource "oci_objectstorage_bucket" "backup" {
  compartment_id = var.compartment_id
  namespace      = data.oci_objectstorage_namespace.this.namespace
  name           = "${var.name}-backup"
  access_type    = "NoPublicAccess"
  versioning     = "Enabled"
  storage_tier   = "Standard"
}

output "namespace" { value = data.oci_objectstorage_namespace.this.namespace }
output "backup_bucket" { value = oci_objectstorage_bucket.backup.name }
