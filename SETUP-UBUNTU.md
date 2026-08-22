# MOI - AI Chat — Setup Guide (Ubuntu Desktop)

Install and run **MOI - AI Chat** on Ubuntu Desktop. Everything runs locally in Docker, including the AI model (`qwen2.5:7b` via Ollama) — no external API keys and no data leaves the machine.

**Time needed:** ~30 minutes, most of it waiting for downloads.

---

## What you need

| Requirement | Minimum | Recommended |
|---|---|---|
| Ubuntu Desktop | 22.04 | 24.04 |
| RAM | 8 GB | 16 GB |
| Free disk space | 25 GB | 40 GB |
| CPU | 4 cores | 8 cores |
| Internet | Required for setup only | — |

The model runs on CPU by default and answers in roughly 5–15 seconds. An NVIDIA GPU is optional — see [Optional: NVIDIA GPU](#optional-nvidia-gpu-acceleration).

---

## Step 1 — Install Docker

Ubuntu's built-in `docker.io` package is too old. Install Docker's official packages:

```bash
# Remove any old versions
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null

# Add Docker's official repository
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
```

Let your user run Docker without `sudo`:

```bash
sudo usermod -aG docker $USER
```

> **Important:** Log out and log back in (or reboot) for this to take effect.

Verify:

```bash
docker --version          # Docker version 27.x or newer
docker compose version    # Docker Compose version v2.x or newer
docker run --rm hello-world
```

If `hello-world` prints a welcome message, Docker is ready.

---

## Step 2 — Get the code

```bash
git clone https://github.com/M-elhasan9/LibreChat.git moi-ai-chat
cd moi-ai-chat
```

---

## Step 3 — Create your configuration

Three files are **not** in the repository — they hold machine-specific settings and secrets, so each person creates their own. Create all three now.

### 3a. `librechat.yaml`

Defines the MOI Assistant endpoint and points it at the local Ollama model.

```bash
cat > librechat.yaml <<'EOF'
version: 1.2.1
cache: true
endpoints:
  custom:
    - name: "MOI Assistant"
      iconURL: "/assets/logo.jpg"
      apiKey: "ollama"
      baseURL: "http://ollama:11434/v1"
      models:
        default: ["qwen2.5:7b"]
        fetch: false
      titleConvo: true
      titleModel: "qwen2.5:7b"
EOF
```

### 3b. `docker-compose.override.yml`

Adds the Ollama container and makes the app build locally so the MOI branding is included.

```bash
cat > docker-compose.override.yml <<'EOF'
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    restart: always
    volumes:
      - ./ollama_data:/root/.ollama
  api:
    image: librechat-moi:latest
    build:
      context: .
      target: node
    depends_on:
      - mongodb
      - rag_api
      - ollama
    volumes:
      - type: bind
        source: ./librechat.yaml
        target: /app/librechat.yaml
EOF
```

### 3c. `.env` — settings and secrets

Start from the template:

```bash
cp .env.example .env
```

> ### ⚠️ Generate your own secrets — do not keep the ones in the template
>
> The values that ship in `.env.example` are **not safe to use**. Anyone who has them can forge logins to your instance and decrypt stored credentials. The command below replaces all of them with fresh random values. Run it exactly once.

```bash
python3 - <<'PY'
import re, secrets, pathlib

env = pathlib.Path('.env')
text = env.read_text()

values = {
    'CREDS_KEY':                  secrets.token_hex(32),
    'CREDS_IV':                   secrets.token_hex(16),
    'JWT_SECRET':                 secrets.token_hex(32),
    'JWT_REFRESH_SECRET':         secrets.token_hex(32),
    'MEILI_MASTER_KEY':           secrets.token_hex(32),
    'ADMIN_PANEL_SESSION_SECRET': secrets.token_hex(32),
    'APP_TITLE':                  'MOI - AI Chat',
    'HOST':                       '0.0.0.0',
}

for key, value in values.items():
    pattern = re.compile(rf'^{key}=.*$', re.MULTILINE)
    text = pattern.sub(f'{key}={value}', text) if pattern.search(text) else f'{text}\n{key}={value}'

env.write_text(text)
print('Secrets generated.')
PY
```

Finally, tell Docker which user owns the data files. **On Linux this must be your own user ID** — otherwise the database cannot write to its folder:

```bash
echo "UID=$(id -u)" >> .env
echo "GID=$(id -g)" >> .env
```

Confirm the file looks right (this prints names only, never values):

```bash
grep -E '^(APP_TITLE|HOST|UID|GID)=' .env
awk -F= '/^(CREDS_KEY|JWT_SECRET|JWT_REFRESH_SECRET)=/ {print $1, "length:", length($2)}' .env
```

You should see `CREDS_KEY length: 64`, `JWT_SECRET length: 64`, and `JWT_REFRESH_SECRET length: 64`.

> **Never commit `.env`.** It is already listed in `.gitignore`. Do not paste real secrets into `.env.example` either — that file *is* tracked by Git.

---

## Step 4 — Build the app

This compiles the MOI branding (name, logo, English/Arabic) into the app.

```bash
docker compose build api
```

**This takes 10–20 minutes the first time.** Later builds are much faster because Docker caches the steps.

---

## Step 5 — Start everything

```bash
docker compose up -d
```

Check that all six services are running:

```bash
docker compose ps
```

Expected: `api`, `mongodb`, `meilisearch`, `vectordb`, `rag_api`, and `ollama`, all showing `running`.

---

## Step 6 — Download the AI model

```bash
docker compose exec ollama ollama pull qwen2.5:7b
```

**This downloads 4.7 GB** and takes 5–30 minutes depending on your connection. Let it finish — it must print `success` at the end.

Verify:

```bash
docker compose exec ollama ollama list
```

You should see `qwen2.5:7b`. Then reload the app so it picks up the model:

```bash
docker compose up -d --force-recreate api
```

---

## Step 7 — Verify the installation

Run these four checks. All must pass.

```bash
# 1. The app is serving
curl -s http://localhost:3080/ | grep -o "<title>.*</title>"
#    Expected: <title>MOI - AI Chat</title>

# 2. The app can reach the model
docker compose exec api sh -c "wget -qO- http://ollama:11434/api/tags" | grep -o '"name":"[^"]*"'
#    Expected: "name":"qwen2.5:7b"

# 3. The configuration loaded
docker compose exec api sh -c "cat /app/librechat.yaml" | grep "MOI Assistant"
#    Expected: - name: "MOI Assistant"

# 4. Arabic loads right-to-left
curl -s -H 'Cookie: lang=ar-EG' http://localhost:3080/ | sed -n '2p'
#    Expected: <html lang="ar" dir="rtl">
```

---

## Step 8 — Open the app

Go to **<http://localhost:3080>**

1. Click **Sign up** and create your account. *The first account you create is yours alone — the database starts empty, so there is no default login.*
2. Once signed in, pick **MOI Assistant** from the model menu.
3. Send a message. The first reply takes ~30 seconds while the model loads into memory; after that it is much faster.

**To switch to Arabic:** Settings (⚙️) → **General** → **Language** → **العربية**. The whole interface flips to right-to-left.

---

## Everyday commands

| What you want | Command |
|---|---|
| Start | `docker compose up -d` |
| Stop | `docker compose stop` |
| Restart the app | `docker compose restart api` |
| View logs | `docker compose logs -f api` |
| Check status | `docker compose ps` |
| Update after code changes | `docker compose build api && docker compose up -d --force-recreate api` |
| Free up space | `docker system prune -f` |

> **Careful:** `docker compose down -v` deletes all conversations and accounts. Use `docker compose stop` for normal shutdown.

---

## Troubleshooting

### The page shows old branding or the wrong logo

Your browser cached the old version. Press **Ctrl+Shift+R** to hard-refresh. If it persists, open a private window to confirm, then clear the site data for `localhost:3080`.

### `permission denied` in the mongodb or meilisearch logs

`UID`/`GID` in `.env` do not match your user. Fix and restart:

```bash
sed -i "s/^UID=.*/UID=$(id -u)/" .env
sed -i "s/^GID=.*/GID=$(id -g)/" .env
docker compose up -d --force-recreate mongodb meilisearch
```

### `permission denied while trying to connect to the Docker daemon`

You have not logged out since being added to the `docker` group. Log out and back in, or run `newgrp docker` for the current terminal.

### MOI Assistant is missing from the model menu

The config file is not reaching the container:

```bash
docker compose exec api sh -c "cat /app/librechat.yaml"
```

If that fails, `librechat.yaml` is missing or `docker-compose.override.yml` is wrong. Recreate both from Step 3, then `docker compose up -d --force-recreate api`.

### Replies are very slow or the container is killed

The machine is short on RAM. Close other applications, or use a smaller model:

```bash
docker compose exec ollama ollama pull qwen2.5:3b
```

Then change **both** `qwen2.5:7b` entries in `librechat.yaml` to `qwen2.5:3b` and run `docker compose up -d --force-recreate api`.

### Port 3080 is already in use

```bash
sudo lsof -i :3080     # find what is using it
```

Either stop that program, or set a different `PORT=` in `.env` and restart.

---

## Optional: NVIDIA GPU acceleration

Makes replies roughly 5–10× faster. Requires an NVIDIA card and drivers (`nvidia-smi` must work).

```bash
# Install the NVIDIA container toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt update && sudo apt install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

Then add this to the `ollama` service in `docker-compose.override.yml`:

```yaml
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

Apply it: `docker compose up -d --force-recreate ollama`

---

## Good to know

- **Everything is local.** Conversations and the model stay on your machine. Nothing is sent to any external service.
- **Local access only by default.** `http://localhost:3080` works on this machine. Sharing it across the network needs HTTPS and a reverse proxy — talk to whoever manages the deployment first.
- **Languages:** English and Arabic only, English by default, with full right-to-left support for Arabic.
- **Your data lives in the project folder** (`data-node/`, `ollama_data/`, `uploads/`, `logs/`). These are excluded from Git and must never be committed.
