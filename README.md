# sdk-ai-advanced-boilerplate

> This README is a template. At HEAD on `dev` this repo is **scaffolding-only** — only the ArgoCD GitOps manifests under [`argo/`](./argo) exist; there is no `client/`, `server/`, `shared/`, `.ai/`, `package.json`, or test suite yet. When you fork this into a real app (or when the "advanced" application layer lands), **replace this file** with one that describes the app while keeping the same section structure so world builders and other developers can find what they need in a predictable place.
>
> For the fully fleshed-out template with `client/` + `server/` code, tests, and `.ai/` docs, see the basic [sdk-ai-boilerplate](../sdk-ai-boilerplate).

## Introduction / Summary

`sdk-ai-advanced-boilerplate` is a companion repo to [`sdk-ai-boilerplate`](../sdk-ai-boilerplate) intended to host a more feature-rich AI/Topia SDK starter. Today (at HEAD on `dev`) the repo carries only the deployment scaffolding needed for the Topia SDK-apps ApplicationSet to discover and deploy the service once application code is added. The scaffolding wires up:

- ArgoCD auto-discovery via the SDK-apps ApplicationSet (see the two-branch contract in [`argo/README.md`](./argo/README.md))
- KEDA HTTP add-on scale-to-zero (0↔1) in dev, with the interceptor holding first requests during cold start
- SealedSecrets for `INTERACTIVE_SECRET` (ciphertext only in git; controller unseals into a `Secret` consumed via `envFrom`)
- A shared ALB group for all dev SDK apps at `topia-rtsdk.com`

## Key Features

Because no application code exists at HEAD on `dev` yet, the "features" here are the deployment scaffolding features — not app features.

### Deployment scaffolding

- **ArgoCD ApplicationSet auto-discovery.** `main` carries only `argo/envs/*/config.json` (with `"targetRevision": "dev"`); the SDK-apps ApplicationSet's git-files generator reads this to detect the repo and points the generated Application at `dev` for the actual manifests.
- **KEDA scale-to-zero (dev).** `HTTPScaledObject` runs the deployment at `min: 0`, `max: 1`, scaledown period 3 h. The KEDA HTTP interceptor lives in the `keda` namespace and holds the first request while the pod scales 0→1.
- **Sealed secrets.** `ai-advanced-boilerplate0-sealedsecret.yaml` is strict-scope for `sdk-apps-dev` and contains only ciphertext. The sealed-secrets controller unseals it into `Secret ai-advanced-boilerplate0-secrets` for `envFrom`.
- **Shared ALB.** The production `Ingress` under `argo/services/` joins the `topia-dev` ALB group so all SDK apps share one load balancer. The dev overlay deletes that Ingress and routes through the KEDA interceptor Ingress instead.
- **Health probes.** Liveness + readiness both hit `/api/system/health` on port `3000`. The app has to expose this endpoint the moment code lands or the pod will never go Ready.

### Application features

_Not implemented yet._ When the app layer lands, document its canvas interactions, drawer content, and admin features here — following the section shape from [`sdk-ai-boilerplate/README.md`](../sdk-ai-boilerplate/README.md).

## Required Assets with Unique Names

_Not applicable yet_ — there is no `server/` code that reads or writes dropped assets. When the app layer is added, document the required `uniqueName` patterns here in the same table shape:

| Unique Name Pattern | Description |
| ------------------- | ----------- |
| _TBD_               | _TBD_       |

## Technical Architecture

### Data Objects

_Not applicable yet._ When the app layer lands, document the Visitor / Key Asset / World data-object shapes here (TypeScript interfaces).

### Deployment topology (what exists today)

| Layer               | Detail                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Container image     | `368076259134.dkr.ecr.us-east-1.amazonaws.com/sdk-example:sdk-ai-advanced-boilerplate` (mapped via overlay `images:`) |
| Service             | `ai-advanced-boilerplate0` (ClusterIP, port `80` → containerPort `3000`)                                            |
| Ingress (dev)       | KEDA interceptor at `ai-advanced-boilerplate0-dev-topia.topia-rtsdk.com` (direct ALB Ingress is patched out in dev) |
| Namespace           | `sdk-apps-dev`                                                                                                      |
| Cluster             | `Topia-dev-SDK-Apps` (EKS)                                                                                          |
| Resource requests   | CPU `100m`, memory `128Mi` (limits `1` CPU / `256Mi`)                                                               |
| Termination grace   | 30 s                                                                                                                 |

## API Endpoints

_No application routes exist yet._ The only endpoint contract implied by the scaffolding is the health check the app **must** expose once server code lands:

| Method | Route                | Description                                                                    |
| ------ | -------------------- | ------------------------------------------------------------------------------ |
| `GET`  | `/api/system/health` | Liveness + readiness probe target. Referenced by the Deployment and by `alb.ingress.kubernetes.io/healthcheck-path` on the shared-ALB Ingress. Must return 2xx once the app is up. |

## Analytics

_None._ There is no application code and therefore no analytics events fired. When the app layer is added, list every `analyticName` this app fires here — with what triggers each event and where it lives in the code — in the same table shape used by [`sdk-ai-boilerplate/README.md`](../sdk-ai-boilerplate/README.md).

| Event | Fired when | Where |
| ----- | ---------- | ----- |
| _None yet_ | — | — |

## Environment Variables

The dev deployment sources environment from two Kubernetes objects (both consumed via `envFrom`):

**ConfigMap `ai-advanced-boilerplate0-config`** (non-secret, plaintext in `argo/overlays/dev/ai-advanced-boilerplate0-config.yaml`):

| Variable            | Description                                                                          | Required |
| ------------------- | ------------------------------------------------------------------------------------ | -------- |
| `API_URL`           | Base URL the app itself is reached at. Placeholder `REPLACE_WITH_API_URL` in the manifest — seeded by the Terraform-templated CI job, not by ArgoCD. | Yes      |
| `INSTANCE_DOMAIN`   | Topia API domain (`api.topia.io` for production)                                     | Yes      |
| `INSTANCE_PROTOCOL` | `https` for production/staging, `http` only for local                                | Yes      |
| `INTERACTIVE_KEY`   | Topia interactive app key. Placeholder `REPLACE_WITH_REAL_INTERACTIVE_KEY` in the manifest — seeded out-of-band by the Terraform-templated CI job. Public value; safe in the ConfigMap. | Yes      |
| `NODE_ENV`          | Node environment (`production` in dev overlay)                                       | No       |

**Secret `ai-advanced-boilerplate0-secrets`** (unsealed from `ai-advanced-boilerplate0-sealedsecret.yaml`):

| Variable             | Description                                                                                | Required |
| -------------------- | ------------------------------------------------------------------------------------------ | -------- |
| `INTERACTIVE_SECRET` | Topia interactive app secret. Committed only as SealedSecret ciphertext; unsealed by the controller into a plain `Secret` in `sdk-apps-dev`. | Yes      |

For local development once app code is added, mirror the sdk-ai-boilerplate `.env-example` pattern:

```
INTERACTIVE_KEY=your_interactive_key_here
INTERACTIVE_SECRET=your_interactive_secret_here
INSTANCE_DOMAIN=api.topia.io
INSTANCE_PROTOCOL=https
```

### Where to find `INTERACTIVE_KEY` and `INTERACTIVE_SECRET`

- [Topia Production Account Dashboard](https://topia.io/t/dashboard/integrations)

## Getting Started

At HEAD on `dev` there is no application to run locally. The only thing you can do today is render the K8s manifests:

```bash
# from the app root — render the dev overlay
kubectl kustomize argo/overlays/dev
```

Once application code is added (mirroring [sdk-ai-boilerplate](../sdk-ai-boilerplate)'s `client/` + `server/` layout), the expected run flow will be:

```bash
# from the app root
npm install
cd client && npm install && cd ..

# create a .env at the app root (see Environment Variables above)
cp .env-example .env

# run the dev server (serves the client and the Express server together)
npm run dev
```

## For Developers

### Built With

Nothing at the application layer yet. The current stack is Kubernetes / ArgoCD / KEDA:

- ArgoCD ApplicationSet (git-files generator, two-branch contract)
- Kustomize overlays (`argo/overlays/dev` extends `argo/services/ai-advanced-boilerplate0`)
- KEDA HTTP add-on (scale-to-zero interceptor)
- Bitnami SealedSecrets
- AWS ALB Ingress Controller (shared ALB via group `topia-dev`)

When the client/server land they will mirror the basic boilerplate stack: React + TypeScript (Vite) on the client, Node + Express on the server, `@rtsdk/topia` for SDK calls.

### Deployment

The two-branch contract enforced by the ApplicationSet:

- **`main`** — ONLY `argo/envs/*/config.json`, each with `"targetRevision": "dev"`. The appset's git-files generator reads these to detect the repo; `targetRevision` points the generated Application at `dev` for the manifests.
- **`dev`** — the full argo tree (`services/` + `overlays/` + `envs/` WITHOUT `targetRevision`).

Environment map:

| Env | Service                       | Namespace       | Host                                                    | Health                 |
| --- | ----------------------------- | --------------- | ------------------------------------------------------- | ---------------------- |
| dev | `ai-advanced-boilerplate0`    | `sdk-apps-dev`  | `ai-advanced-boilerplate0-dev-topia.topia-rtsdk.com`    | `/api/system/health`   |

See [`argo/README.md`](./argo/README.md) for the full deployment contract.

### Styling / Accessibility / SDK fundamentals

The application layer does not exist yet, so there are no style, a11y, or SDK-usage rules in this repo. When the app lands, follow the same conventions the basic boilerplate documents:

- [`sdk-ai-boilerplate/.ai/style-guide.md`](../sdk-ai-boilerplate/.ai/style-guide.md) — SDK CSS classes + Tailwind cascade-layer setup
- [`sdk-ai-boilerplate/.ai/accessibility.md`](../sdk-ai-boilerplate/.ai/accessibility.md) — WCAG 2.1 AA patterns
- [`sdk-ai-boilerplate/.ai/sdk-fundamentals.md`](../sdk-ai-boilerplate/.ai/sdk-fundamentals.md) — Interactive Keys, JWT signing, iframes vs webhooks, session credentials, dropped-asset ops, backend validation

### Helpful links

- [SDK Developer docs](https://metaversecloud-com.github.io/mc-sdk-js/index.html)
- [Basic boilerplate — `sdk-ai-boilerplate`](../sdk-ai-boilerplate)
- Dev host (once app code is deployed): `https://ai-advanced-boilerplate0-dev-topia.topia-rtsdk.com`
