# Todo API — DevOps Pipeline Project

A small in-memory Todo / Task REST API (Node.js 18 + Express). It is built, tested and packaged by Jenkins and GitHub Actions, configured with Ansible, containerised with Docker and deployed to Kubernetes (Minikube).

![Node.js](https://img.shields.io/badge/Node.js-18-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![Jest](https://img.shields.io/badge/Jest-29-C21325?logo=jest)
![Jenkins](https://img.shields.io/badge/Jenkins-Pipeline-D24939?logo=jenkins&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-multi--stage-2496ED?logo=docker&logoColor=white)
![Ansible](https://img.shields.io/badge/Ansible-role-EE0000?logo=ansible)
![Kubernetes](https://img.shields.io/badge/Kubernetes-Minikube-326CE5?logo=kubernetes&logoColor=white)

> Course 25CIAEC59 / 25CYAEC59 — DevOps assignment (Component 1 + Component 2)

---

## 1. Project structure

```
.
├── app.js                     # Express app + routes (exported, no listen)
├── server.js                  # Entry point: listens on PORT (default 3000)
├── data/todos.js              # In-memory store + helper functions
├── __tests__/api.test.js      # Jest + Supertest tests (17 tests)
├── package.json / package-lock.json
├── Jenkinsfile                # Declarative CI pipeline
├── .github/workflows/ci.yml   # GitHub Actions CI
├── Dockerfile / .dockerignore # Multi-stage image build
├── configmap.yaml             # K8s ConfigMap (APP_ENV, APP_VERSION, PORT)
├── deployment.yaml            # K8s Deployment (3 replicas, probes, rolling update)
├── service.yaml               # K8s NodePort Service (30080)
├── ansible/
│   ├── inventory.ini
│   ├── playbook.yml
│   └── roles/node_app_setup/  # tasks, handlers, vars, defaults, templates, meta
├── screenshots/               # Assignment screenshots
├── DEMO_COMMANDS.md           # Copy-paste demo runbook
└── repo_link.txt
```

---

## 2. API reference

| Method | Path | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/` | Welcome message + endpoint list | 200 | — |
| GET | `/todos` | List all todos | 200 | — |
| GET | `/todos/:id` | Get one todo | 200 | 404 |
| POST | `/todos` | Create a todo, body `{ "title": "..." }` | 201 | 400 |
| PATCH | `/todos/:id/toggle` | Flip `completed` | 200 | 404 |
| GET | `/hello?name=` | Greeting (default `World`) | 200 | — |
| GET | `/health` | Health check for probes / monitoring | 200 | — |
| GET | `/version` | Version + environment (from ConfigMap) | 200 | — |
| * | anything else | Catch-all | — | 404 |

### Examples

```bash
$ curl localhost:3000/
{"message":"Welcome to the Todo API!","endpoints":{"GET /todos":"List all todos", ...}}

$ curl localhost:3000/todos
[{"id":1,"title":"Set up Git repository","completed":true},
 {"id":2,"title":"Write Jenkins pipeline","completed":false},
 {"id":3,"title":"Deploy to Kubernetes","completed":false}]

$ curl localhost:3000/todos/1
{"id":1,"title":"Set up Git repository","completed":true}

$ curl localhost:3000/todos/99
{"error":"Todo with id 99 not found."}                                  # 404

$ curl -X POST localhost:3000/todos -H "Content-Type: application/json" -d '{"title":"Learn DevOps"}'
{"id":4,"title":"Learn DevOps","completed":false}                       # 201

$ curl -X POST localhost:3000/todos -H "Content-Type: application/json" -d '{}'
{"error":"Field \"title\" is required and must be a non-empty string."} # 400

$ curl -X PATCH localhost:3000/todos/2/toggle
{"id":2,"title":"Write Jenkins pipeline","completed":true}

$ curl "localhost:3000/hello?name=Alice"
{"message":"Hello, Alice!"}

$ curl localhost:3000/health
{"status":"UP","uptime":3.07,"timestamp":"2026-11-18T14:56:49.167Z"}

$ curl localhost:3000/version
{"version":"1.0.0","environment":"development"}

$ curl localhost:3000/nope
{"error":"Route 'GET /nope' not found."}                                # 404
```

---

## 3. Run locally

```bash
npm install      # install dependencies
npm test         # run the Jest + Supertest suite
npm start        # http://localhost:3000
npm run dev      # auto-restart on file changes (node --watch)
```

---

## 4. Component 1 — Git, Jenkins CI, CI enhancements

### Git workflow
- `main`: stable branch. Jenkins builds this one.
- `feature/hello-endpoint`: the `GET /hello` endpoint and its tests were built here, then merged into `main` with `git merge --no-ff`, so the merge commit shows in history.
- Check the history with `git log --oneline --graph --all`.

### Jenkins setup
1. Run Jenkins in Docker:
   ```bash
   docker run -d --name jenkins -p 8080:8080 -p 50000:50000 \
     -v jenkins_home:/var/jenkins_home jenkins/jenkins:lts
   docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
   ```
   Open http://localhost:8080, paste the password and install the suggested plugins. Also install **Workspace Cleanup** (for `cleanWs()`) and, optionally, the **NodeJS** plugin.
2. **Node.js must be on the agent.** The `jenkins/jenkins:lts` image has no Node. Either install it in the container (`docker exec -u root jenkins bash -c "curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs"`) or configure Node 18 under *Manage Jenkins → Tools → NodeJS*.
3. **New Item** → name `todo-api` → **Pipeline** → OK.
4. *Build Triggers*: tick **Poll SCM**. The `Jenkinsfile` already sets `* * * * *`, and the job picks that up after its first run.
5. *Pipeline*: Definition **Pipeline script from SCM** → SCM **Git** → Repository URL (your GitHub repo) → Branch Specifier `*/main` → Script Path `Jenkinsfile` → Save.
6. Click **Build Now**. After that, every push to `main` starts a build within about a minute.

### Pipeline stages
Checkout → Environment Info → Install Dependencies (`npm ci`) → Test → Build & Package (`todo-api-<BUILD_NUMBER>.tar.gz`) → Archive Artifacts → Docker Build (optional; skipped if the agent has no Docker).

### CI enhancements chosen
| # | Enhancement | Where | Why |
|---|---|---|---|
| 1 | **Automated tests in CI** | `Test` stage, `npm test` (17 Jest + Supertest tests) | A broken route fails the build before anything is packaged. |
| 2 | **Versioned build artifacts** | `Build & Package` + `archiveArtifacts` with fingerprinting | Every build produces `todo-api-<build#>.tar.gz`, so any release can be traced and re-deployed. |
| 3 | **GitHub Actions CI** | `.github/workflows/ci.yml` | Runs the tests and a Docker build on every push/PR to any branch, including feature branches that Jenkins doesn't watch. |

---

## 5. Component 2 — Ansible, Docker, Kubernetes

### Ansible (run from Linux or WSL; Ansible can't be the control node on native Windows)
```bash
sudo apt install -y ansible          # or: pip install ansible-core
cd ansible
ansible-playbook -i inventory.ini playbook.yml --syntax-check
ansible-playbook -i inventory.ini playbook.yml --ask-become-pass
curl localhost:3000/health
```
The `node_app_setup` role installs prerequisites and Node.js 18 (NodeSource), creates the `nodeapp` system user and `/opt/todo-api`, and copies the app files. It then runs `npm ci --omit=dev`, installs a systemd unit from a Jinja2 template and starts the service. Last, it waits for port 3000 and checks `/health` with the `uri` module. Handlers reload systemd and restart the app only when something changed. The target needs systemd (on WSL, enable `systemd=true` in `/etc/wsl.conf`).

### Docker (deployment enhancement: multi-stage build)
```bash
docker build -t todo-api:latest .
docker run -d -p 3000:3000 --name todo todo-api:latest
curl localhost:3000/health
docker ps            # STATUS shows (healthy) thanks to HEALTHCHECK
docker rm -f todo
```
Stage 1 installs all dependencies and runs the tests, so a failing test fails the image build. Stage 2 copies only `app.js`, `server.js` and `data/` with production dependencies, runs as the non-root `node` user and has a `HEALTHCHECK` on `/health`.

### Kubernetes on Minikube
```bash
minikube start
minikube image build -t todo-api:latest .   # builds the image inside the cluster (works with containerd or docker runtime)
kubectl apply -f configmap.yaml -f deployment.yaml -f service.yaml
kubectl get pods -o wide
kubectl get svc todo-api-service
minikube service todo-api-service --url     # then curl <url>/todos
```

### Scaling
```bash
kubectl scale deployment todo-api-deployment --replicas=5 && kubectl get pods
kubectl scale deployment todo-api-deployment --replicas=2 && kubectl get pods
```

### Rollback
```bash
kubectl set image deployment/todo-api-deployment todo-api=todo-api:broken   # tag does not exist
kubectl rollout status deployment/todo-api-deployment --timeout=30s          # new pod: ErrImagePull / ImagePullBackOff
kubectl rollout history deployment/todo-api-deployment
kubectl rollout undo deployment/todo-api-deployment
kubectl rollout status deployment/todo-api-deployment
```
Because the strategy uses `maxUnavailable: 0`, the old pods keep serving traffic while the broken pod fails, so the outage never reaches users.

### ConfigMap (deployment enhancement)
`todo-api-config` holds `PORT`, `APP_ENV` and `APP_VERSION`. Pods load them through `envFrom`.
```bash
kubectl get configmap todo-api-config -o yaml
kubectl edit configmap todo-api-config          # APP_VERSION: "1.1.0"
kubectl rollout restart deployment/todo-api-deployment
curl <url>/version                              # {"version":"1.1.0","environment":"production"}
```
Environment variables are only read when a pod starts, so a restart is needed after editing the ConfigMap.

### Health probes (deployment enhancement)
- **readinessProbe** (`GET /health`, 3 s delay, every 5 s): the Service sends traffic to a pod only once it is ready. This prevents errors during startup and rolling updates.
- **livenessProbe** (`GET /health`, 5 s delay, every 10 s): if the app hangs, the kubelet restarts the container automatically.

### Monitoring note (Prometheus)
`/health` gives a simple up/down signal. A Prometheus **blackbox exporter** can probe it, giving `probe_success` and `probe_duration_seconds` for alerts such as "API down for 1 min". For app-level metrics, the next step would be a `/metrics` endpoint using `prom-client`, which provides request counts, latency histograms and process memory/CPU. Prometheus would scrape it through pod annotations or a ServiceMonitor.

---

## 6. Screenshots checklist

| # | What it shows | File |
|---|---|---|
| C1-1 | Git history with both branches and the `--no-ff` merge (`git log --oneline --graph --all`) | `screenshots/c1-1-git-history.png` |
| C1-2 | Jenkins job configuration (Pipeline from SCM, Poll SCM) | `screenshots/c1-2-jenkins-config.png` |
| C1-3 | Jenkins console output of a successful build | `screenshots/c1-3-console-output.png` |
| C1-3b | Jenkins Stage View: every stage green | `screenshots/c1-3b-stage-view.png` |
| C1-4 | Archived artifact `todo-api-<n>.tar.gz` on the build page | `screenshots/c1-4-artifact.png` |
| C1-5 | Tests passing (Jenkins Test stage or `npm test`) | `screenshots/c1-5-tests-passing.png` |
| C1-6 | GitHub Actions run (green) | `screenshots/c1-6-actions-run.png` |
| C2-1 | Ansible playbook run with `ok/changed` recap | `screenshots/c2-1-ansible-run.png` |
| C2-2 | `docker build` output and `docker images` | `screenshots/c2-2-docker-build.png` |
| C2-3 | `kubectl get pods` before scaling (3 pods) | `screenshots/c2-3-pods-before-scale.png` |
| C2-4 | `kubectl get pods` after scaling (5 pods) | `screenshots/c2-4-pods-after-scale.png` |
| C2-5 | `kubectl get svc` showing NodePort 30080 | `screenshots/c2-5-svc.png` |
| C2-6 | `curl` response from the service URL | `screenshots/c2-6-curl-response.png` |
| C2-7 | Broken rollout, `rollout history` and `rollout undo` | `screenshots/c2-7-rollback.png` |
| C2-8 | ConfigMap YAML and `/version` showing the changed value | `screenshots/c2-8-configmap.png` |

---

## 7. Resume lines

- Built a Node.js/Express REST API with 17 automated Jest + Supertest tests and a **Jenkins** declarative pipeline (poll SCM, `npm ci`, test, versioned `.tar.gz` artifacts) plus **GitHub Actions** CI on every push and PR.
- Automated server setup with an **Ansible** role that installs Node.js, deploys the app as a **systemd** service and verifies it with health checks, using handlers for idempotent restarts.
- Containerised the app with a **multi-stage Docker** build (tests run at build time, slim non-root runtime image, HEALTHCHECK).
- Deployed to **Kubernetes** (Minikube) with a ConfigMap, liveness/readiness probes, a zero-downtime RollingUpdate strategy, horizontal scaling (3 → 5 → 2 replicas) and a demonstrated `kubectl rollout undo` rollback.

---

Repository link: see [`repo_link.txt`](repo_link.txt).
