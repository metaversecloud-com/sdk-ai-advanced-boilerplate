# Argo CD deployment (`argo/`)

GitOps manifests so this SDK app is auto-discovered by the Topia SDK-apps
ApplicationSet. App creation is owned by the appset; image build + sync is owned
by a Terraform-templated CI workflow.

## Two-branch contract

- `main` = ONLY `argo/envs/*/config.json`, each WITH `"targetRevision": "dev"`. The
  appset's git-files generator reads these to detect the repo; `targetRevision`
  points the generated Application at `dev` for the manifests.
- `dev` = the full argo tree (services/ + overlays/ + envs/ WITHOUT `targetRevision`).

**Secrets:** no plaintext committed. `ai-advanced-boilerplate0-sealedsecret.yaml` holds only ciphertext
(sealed strict-scope for namespace sdk-apps-dev); the controller unseals it into
`Secret ai-advanced-boilerplate0-secrets`, consumed via `envFrom`. Non-secret env (incl. public
`INTERACTIVE_KEY`) lives in `ai-advanced-boilerplate0-config`.

## Environment

| Env | Service | Namespace | Host | Health |
| --- | ------- | --------- | ---- | ------ |
| `dev` | `ai-advanced-boilerplate0` | `sdk-apps-dev` | ai-advanced-boilerplate0-dev-topia.topia-rtsdk.com | `/api/system/health` |

## Render locally

```sh
kubectl kustomize argo/overlays/dev
```
