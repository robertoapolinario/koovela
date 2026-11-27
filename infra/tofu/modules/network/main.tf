# Rede de um ambiente (REQ-FND-027): VCN, sub-rede de aplicação e sub-rede privada de dados.
# Nenhuma regra de entrada vinda da internet: o acesso externo chega só pelo Cloudflare Tunnel (saída).
terraform {
  required_providers {
    oci = { source = "oracle/oci", version = "9.15.0" }
  }
}

variable "compartment_id" { type = string }
variable "name" { type = string }
variable "cidr" {
  type    = string
  default = "10.20.0.0/16"
}

locals {
  app_cidr  = cidrsubnet(var.cidr, 8, 1)
  data_cidr = cidrsubnet(var.cidr, 8, 2)
}

resource "oci_core_vcn" "this" {
  compartment_id = var.compartment_id
  display_name   = "${var.name}-vcn"
  cidr_blocks    = [var.cidr]
  dns_label      = replace(var.name, "-", "")
}

resource "oci_core_nat_gateway" "this" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.name}-nat"
}

data "oci_core_services" "all" {
  filter {
    name   = "name"
    values = ["All .* Services In Oracle Services Network"]
    regex  = true
  }
}

resource "oci_core_service_gateway" "this" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.name}-sgw"
  services { service_id = data.oci_core_services.all.services[0].id }
}

# Só saída: NAT para a internet (GHCR, Cloudflare, R2) e service gateway para o Object Storage.
resource "oci_core_route_table" "private" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.name}-rt-private"
  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_nat_gateway.this.id
  }
  route_rules {
    destination       = data.oci_core_services.all.services[0].cidr_block
    destination_type  = "SERVICE_CIDR_BLOCK"
    network_entity_id = oci_core_service_gateway.this.id
  }
}

resource "oci_core_security_list" "app" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.name}-sl-app"
  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }
  # Nada vindo da internet. Só a sub-rede de dados entra, nas portas de observabilidade:
  # node-exporter (9100), métricas do Traefik (8082) e o webhook interno do Alertmanager no core (8081).
  dynamic "ingress_security_rules" {
    for_each = toset([9100, 8082, 8081])
    content {
      source   = local.data_cidr
      protocol = "6"
      tcp_options {
        min = ingress_security_rules.value
        max = ingress_security_rules.value
      }
    }
  }
}

resource "oci_core_security_list" "data" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.name}-sl-data"
  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }
  # MySQL, Redis, RabbitMQ e OTLP só a partir da sub-rede de aplicação.
  dynamic "ingress_security_rules" {
    for_each = toset([3306, 6379, 5672, 4318])
    content {
      source   = local.app_cidr
      protocol = "6"
      tcp_options {
        min = ingress_security_rules.value
        max = ingress_security_rules.value
      }
    }
  }
}

resource "oci_core_subnet" "app" {
  compartment_id             = var.compartment_id
  vcn_id                     = oci_core_vcn.this.id
  display_name               = "${var.name}-app"
  cidr_block                 = local.app_cidr
  prohibit_public_ip_on_vnic = true
  route_table_id             = oci_core_route_table.private.id
  security_list_ids          = [oci_core_security_list.app.id]
  dns_label                  = "app"
}

resource "oci_core_subnet" "data" {
  compartment_id             = var.compartment_id
  vcn_id                     = oci_core_vcn.this.id
  display_name               = "${var.name}-data"
  cidr_block                 = local.data_cidr
  prohibit_public_ip_on_vnic = true # banco sem rota pública
  route_table_id             = oci_core_route_table.private.id
  security_list_ids          = [oci_core_security_list.data.id]
  dns_label                  = "data"
}

output "app_subnet_id" { value = oci_core_subnet.app.id }
output "data_subnet_id" { value = oci_core_subnet.data.id }
output "app_cidr" { value = local.app_cidr }
