# Demo Runbook — todo-api

Run these blocks in order. The text after each block says what you should see.
Screenshot names refer to the checklist in `README.md`.

> **Windows / WSL note:** Node, Docker, kubectl and Minikube all work in PowerShell or Git Bash. **Ansible does not run natively on Windows**, so run the Ansible block from WSL (Ubuntu) or a Linux VM. For systemd inside WSL, add a `[boot]` section with `systemd=true` to `/etc/wsl.conf` and run `wsl --shutdown` once. In PowerShell, use `curl.exe` instead of `curl` (which is an alias for `Invoke-WebRequest`), and replace `'{"title":"Learn DevOps"}'` with `'{\"title\":\"Learn DevOps\"}'`.

---

## 1. Local

```bash
npm install && npm test && npm start
```
**Expected:** `Tests: 17 passed, 17 total`, then `🚀 Todo API running at http://localhost:3000`. Leave it running and use a second terminal:

```bash
curl localhost:3000/todos ; curl -X POST localhost:3000/todos -H "Content-Type: application/json" -d '{"title":"Learn DevOps"}'
```
**Expected:** a JSON array of 3 todos, then `{"id":4,"title":"Learn DevOps","completed":false}`. Stop the server with Ctrl+C.

---

## 2. Docker  → `c2-2-docker-build.png`

```bash
docker build -t todo-api:latest . && docker run -d -p 3000:3000 --name todo todo-api:latest && curl localhost:3000/health
```
**Expected:** the build log shows the test stage (`17 passed`), then a container ID, then `{"status":"UP","uptime":...,"timestamp":"..."}`. After about 30 s, `docker ps` shows `(healthy)`.

```bash
docker images todo-api ; docker rm -f todo
```
**Expected:** the image is listed (about 190 MB) and the container is removed (this also frees port 3000).

---

## 3. Minikube

```bash
minikube start
minikube image build -t todo-api:latest .
# (Alternative only if Minikube uses the docker runtime:
#  eval $(minikube docker-env) && docker build -t todo-api:latest .
#  PowerShell: & minikube -p minikube docker-env --shell powershell | Invoke-Expression)
kubectl apply -f configmap.yaml -f deployment.yaml -f service.yaml
```
**Expected:** `configmap/todo-api-config created`, `deployment.apps/todo-api-deployment created`, `service/todo-api-service created`. The image is built inside the Minikube node, so `imagePullPolicy: IfNotPresent` finds it without a registry.

```bash
kubectl get pods -o wide ; kubectl get svc ; kubectl get configmap todo-api-config -o yaml
```
**Expected:** 3 pods `todo-api-deployment-xxxx` with `READY 1/1` and `STATUS Running` (→ `c2-3-pods-before-scale.png`). `todo-api-service` is `NodePort 80:30080/TCP` (→ `c2-5-svc.png`). The ConfigMap shows `APP_ENV: production` and `APP_VERSION: 1.0.0`.

```bash
minikube service todo-api-service --url
curl <url>/todos
curl <url>/version
```
**Expected:** a URL like `http://127.0.0.1:5xxxx` (on Windows/Docker driver, keep that terminal open). `/todos` returns the list and `/version` returns `{"version":"1.0.0","environment":"production"}`, which proves the ConfigMap is used (→ `c2-6-curl-response.png`).

---

## 4. Scaling  → `c2-4-pods-after-scale.png`

```bash
kubectl scale deployment todo-api-deployment --replicas=5 ; kubectl get pods
```
**Expected:** `deployment.apps/todo-api-deployment scaled`, then 5 pods (2 new ones going `ContainerCreating` → `Running`).

```bash
kubectl scale deployment todo-api-deployment --replicas=2 ; kubectl get pods
```
**Expected:** 3 pods go `Terminating`, leaving 2 `Running`.

---

## 5. Rollback demo  → `c2-7-rollback.png`

```bash
kubectl set image deployment/todo-api-deployment todo-api=todo-api:broken   # non-existent tag → ImagePullBackOff
kubectl rollout status deployment/todo-api-deployment --timeout=30s ; kubectl get pods
```
**Expected:** `rollout status` times out with `error: timed out waiting for the condition`. One new pod shows `ErrImagePull` / `ImagePullBackOff`, and the old pods keep `Running` (because of `maxUnavailable: 0`).

```bash
kubectl rollout history deployment/todo-api-deployment
kubectl rollout undo deployment/todo-api-deployment ; kubectl rollout status deployment/todo-api-deployment
```
**Expected:** the history lists revisions 1 and 2. Then `deployment.apps/todo-api-deployment rolled back` and `successfully rolled out`, and the broken pod is gone.

---

## 6. ConfigMap demo  → `c2-8-configmap.png`

```bash
kubectl edit configmap todo-api-config      # change APP_VERSION to "1.1.0", save and close
# or, non-interactive:
kubectl patch configmap todo-api-config -p '{"data":{"APP_VERSION":"1.1.0"}}'
kubectl rollout restart deployment/todo-api-deployment
kubectl rollout status deployment/todo-api-deployment
curl <url>/version
```
**Expected:** `{"version":"1.1.0","environment":"production"}`. The new value appears without rebuilding the image.

---

## 7. Ansible (from WSL / Linux)  → `c2-1-ansible-run.png`

```bash
sudo apt update && sudo apt install -y ansible
cd ansible && ansible-playbook -i inventory.ini playbook.yml --ask-become-pass
curl localhost:3000/health
```
**Expected:** each task in `node_app_setup` prints `ok` or `changed`. The `Show health check response` task prints `{"status": "UP", ...}`, and the PLAY RECAP shows `failed=0`. A second run shows mostly `ok` (idempotent). `curl` returns `{"status":"UP",...}`, and `systemctl status todo-api` shows `active (running)`.

> Stop anything else on port 3000 first (e.g. `docker rm -f todo`), or the service can't bind to it.

---

## Cleanup

```bash
kubectl delete -f service.yaml -f deployment.yaml -f configmap.yaml
minikube stop
sudo systemctl disable --now todo-api      # in WSL, if you ran Ansible
```
