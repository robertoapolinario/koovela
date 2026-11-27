# OpenTofu

`modules/` (network, compute, vault, object-storage, cloudflare-*) e `envs/{staging,production}`, cada um na
sua conta OCI (REQ-FND-023). O estado fica no Object Storage da própria conta, pelo endpoint compatível com S3.

```sh
cd infra/tofu/envs/staging
export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...   # Customer Secret Key da conta OCI (estado)
export TF_VAR_compartment_id=... TF_VAR_availability_domain=... CLOUDFLARE_API_TOKEN=...
tofu init -backend-config="endpoints={s3=\"https://<namespace>.compat.objectstorage.sa-saopaulo-1.oraclecloud.com\"}"
tofu plan
```

O bucket `koovela-tofu-state-<env>` é criado uma única vez à mão (ovo e galinha), com versionamento ligado.
