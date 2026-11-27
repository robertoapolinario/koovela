# Instância ARM Ampere Always Free (VM.Standard.A1.Flex) com Ubuntu 24.04 e cloud-init.
terraform {
  required_providers {
    oci = { source = "oracle/oci", version = "9.15.0" }
  }
}

variable "compartment_id" { type = string }
variable "availability_domain" { type = string }
variable "name" { type = string }
variable "subnet_id" { type = string }
variable "ocpus" {
  type    = number
  default = 2
}
variable "memory_gb" {
  type    = number
  default = 12
}
variable "boot_volume_gb" {
  type    = number
  default = 100
}
variable "user_data" {
  type      = string
  sensitive = true
}
variable "ssh_public_keys" { type = list(string) }

data "oci_core_images" "ubuntu" {
  compartment_id           = var.compartment_id
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_instance" "this" {
  compartment_id      = var.compartment_id
  availability_domain = var.availability_domain
  display_name        = var.name
  shape               = "VM.Standard.A1.Flex"
  shape_config {
    ocpus         = var.ocpus
    memory_in_gbs = var.memory_gb
  }
  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_gb
  }
  create_vnic_details {
    subnet_id        = var.subnet_id
    assign_public_ip = false
    hostname_label   = replace(var.name, "-", "")
  }
  metadata = {
    ssh_authorized_keys = join("\n", var.ssh_public_keys)
    user_data           = base64encode(var.user_data)
  }
  agent_config {
    is_monitoring_disabled = false
  }
  lifecycle {
    ignore_changes = [source_details[0].source_id, metadata["user_data"]]
  }
}

output "private_ip" { value = oci_core_instance.this.private_ip }
output "id" { value = oci_core_instance.this.id }
