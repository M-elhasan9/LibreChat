# MOI - AI Chat — Setup Guide

Install and run **MOI - AI Chat** on **Ubuntu Desktop** or **Windows 11**. Everything runs locally in Docker, including the AI model (`qwen2.5:7b` via Ollama) — no external API keys, and no data leaves the machine.

**Time needed:** ~30 minutes, most of it waiting for downloads.

> **How to read this guide.** Steps 1 and 3 differ by operating system — each has an **🐧 Ubuntu** and a **🪟 Windows** version, so follow only the one for your machine. Every other step is identical on both.

---

## What you need

| Requirement | Minimum | Recommended |
|---|---|---|
| Operating system | Ubuntu 22.04 / Windows 10 (22H2) | Ubuntu 24.04 / Windows 11 |
| RAM | 8 GB | 16 GB |
| Free disk space | 25 GB | 40 GB |
| CPU | 4 cores | 8 cores |
| Internet | Required for setup only | — |

The model runs on CPU by default and answers in roughly 5–15 seconds. An NVIDIA GPU is optional — see [Optional: NVIDIA GPU](#optional-nvidia-gpu-acceleration).

---

## Step 1 — Install Docker

### 🐧 Ubuntu

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

### 🪟 Windows

1. Install **WSL 2** — open **PowerShell as Administrator** and run:

   ```powershell
   wsl --install
   ```

   **Restart your computer** when it finishes.

2. Download and install **Docker Desktop** from <https://www.docker.com/products/docker-desktop/>.

   During installation, leave **"Use WSL 2 instead of Hyper-V"** checked.

3. **Launch Docker Desktop** and wait for the whale icon in the system tray to stop animating. Docker Desktop must be running whenever you use the app.

4. In **Settings → Resources**, give Docker at least **8 GB of memory**. The model will not load reliably below this.

> From here on, run all Windows commands in a normal **PowerShell** window (not Administrator).

### Verify (both systems)

```
docker --version
docker compose version
docker run --rm hello-world
```

If `hello-world` prints a welcome message, Docker is ready.

---

## Step 2 — Get the code

```
git clone https://github.com/M-elhasan9/LibreChat.git moi-ai-chat
cd moi-ai-chat
```

> **Windows:** if `git` is not recognized, install Git from <https://git-scm.com/download/win> and reopen PowerShell.

---

## Step 3 — Create your configuration

Three files are **not** in the repository — they hold machine-specific settings and secrets, so each person creates their own. Create all three now.

> ### ⚠️ Generate your own secrets
>
> The secret values that ship in `.env.example` are **not safe to use**. Anyone who has them can forge logins to your instance and decrypt stored credentials. The commands below replace all of them with fresh random values. Run them exactly once.

### 🐧 Ubuntu

```bash
# 3a. The MOI Assistant endpoint
cat > librechat.yaml <<'EOF'
version: 1.2.1
cache: true

# Default model spec. `prioritize: true` + `default: true` makes this the
# selection every new conversation starts from, so its promptPrefix (the
# system message) applies without the user choosing anything.
modelSpecs:
  enforce: false
  prioritize: true
  list:
    - name: "moi-assistant-ar"
      label: "MOI Assistant"
      default: true
      description: "مساعد MOI الذكي — يجيب بالعربية الفصحى"
      iconURL: "/assets/logo.jpg"
      preset:
        endpoint: "MOI Assistant"
        model: "qwen2.5:7b"
        promptPrefix: "أنت مساعد ذكي لمؤسسة MOI. أجب دائماً باللغة العربية الفصحى بشكل افتراضي، إلا إذا طلب المستخدم صراحةً لغة أخرى. كن واضحاً ومهنياً ومفيداً."

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

# 3b. Ollama container + local build of the branded app
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

# 3c. Settings and secrets
cp .env.example .env

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

# On Linux the containers must run as YOU, or the database cannot write its files
echo "UID=$(id -u)" >> .env
echo "GID=$(id -g)" >> .env
```

### 🪟 Windows

```powershell
# 3a. The MOI Assistant endpoint
@'
version: 1.2.1
cache: true

# Default model spec. `prioritize: true` + `default: true` makes this the
# selection every new conversation starts from, so its promptPrefix (the
# system message) applies without the user choosing anything.
modelSpecs:
  enforce: false
  prioritize: true
  list:
    - name: "moi-assistant-ar"
      label: "MOI Assistant"
      default: true
      description: "مساعد MOI الذكي — يجيب بالعربية الفصحى"
      iconURL: "/assets/logo.jpg"
      preset:
        endpoint: "MOI Assistant"
        model: "qwen2.5:7b"
        promptPrefix: "أنت مساعد ذكي لمؤسسة MOI. أجب دائماً باللغة العربية الفصحى بشكل افتراضي، إلا إذا طلب المستخدم صراحةً لغة أخرى. كن واضحاً ومهنياً ومفيداً."

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
'@ | Set-Content -Path 'librechat.yaml' -Encoding utf8

# 3b. Ollama container + local build of the branded app
@'
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
'@ | Set-Content -Path 'docker-compose.override.yml' -Encoding utf8

# 3c. Settings and secrets
Copy-Item '.env.example' '.env' -Force

$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
function New-Secret([int]$size) {
  $bytes = New-Object byte[] $size
  $rng.GetBytes($bytes)
  ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
}

$values = [ordered]@{
  'CREDS_KEY'                  = New-Secret 32
  'CREDS_IV'                   = New-Secret 16
  'JWT_SECRET'                 = New-Secret 32
  'JWT_REFRESH_SECRET'         = New-Secret 32
  'MEILI_MASTER_KEY'           = New-Secret 32
  'ADMIN_PANEL_SESSION_SECRET' = New-Secret 32
  'APP_TITLE'                  = 'MOI - AI Chat'
  'HOST'                       = '0.0.0.0'
  'UID'                        = '0'
  'GID'                        = '0'
}

$text = Get-Content '.env' -Raw
foreach ($key in $values.Keys) {
  $line = "$key=$($values[$key])"
  $pattern = "(?m)^$key=.*$"
  if ($text -match $pattern) {
    $text = [regex]::Replace($text, $pattern, { $line }.GetNewClosure())
  } else {
    $text = $text.TrimEnd() + "`r`n" + $line
  }
}
Set-Content -Path '.env' -Value $text -Encoding utf8 -NoNewline
Write-Output 'Secrets generated.'
```

> **Why `UID=0` on Windows but your own ID on Ubuntu?** Docker Desktop shares Windows folders into Linux containers without real file ownership, so the database only has write access as root. On Ubuntu the containers touch your actual folders, so they must run as you — otherwise they create root-owned files you cannot delete.

### Verify your `.env` (both systems)

This prints names and lengths only, never the secret values.

**Ubuntu**

```bash
grep -E '^(APP_TITLE|HOST|UID|GID)=' .env
awk -F= '/^(CREDS_KEY|JWT_SECRET|JWT_REFRESH_SECRET)=/ {print $1, "length:", length($2)}' .env
```

**Windows**

```powershell
Select-String -Path '.env' -Pattern '^(APP_TITLE|HOST|UID|GID)=' | ForEach-Object { $_.Line }
Get-Content '.env' | Where-Object { $_ -match '^(CREDS_KEY|JWT_SECRET|JWT_REFRESH_SECRET)=' } |
  ForEach-Object { $p = $_.Split('=',2); "{0,-20} length: {1}" -f $p[0], $p[1].Length }
```

Both should report **length: 64** for `CREDS_KEY`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`.

> **Never commit `.env`.** It is already in `.gitignore`. Do not paste real secrets into `.env.example` either — that file *is* tracked by Git.

---

## Step 4 — Build the app

This compiles the MOI branding (name, logo, English/Arabic) into the app.

```
docker compose build api
```

**This takes 10–20 minutes the first time.** Later builds are much faster because Docker caches the steps.

---

## Step 5 — Start everything

```
docker compose up -d
docker compose ps
```

Expected: `api`, `mongodb`, `meilisearch`, `vectordb`, `rag_api`, and `ollama`, all showing `running`.

---

## Step 6 — Download the AI model

```
docker compose exec ollama ollama pull qwen2.5:7b
```

**This downloads 4.7 GB** and takes 5–30 minutes depending on your connection. Let it finish — it must print `success` at the end.

Verify, then reload the app so it picks up the model:

```
docker compose exec ollama ollama list
docker compose up -d --force-recreate api
```

You should see `qwen2.5:7b` in the list.

---

## Step 7 — Verify the installation

All five checks must pass. They are identical on both systems.

```
# 1. The app is serving
curl -s http://localhost:3080/ | grep -o "<title>.*</title>"
#    Expected: <title>MOI - AI Chat</title>

# 2. The app can reach the model
docker compose exec api sh -c "wget -qO- http://ollama:11434/api/tags"
#    Expected: output contains "qwen2.5:7b"

# 3. The configuration loaded
docker compose exec api sh -c "cat /app/librechat.yaml"
#    Expected: shows the MOI Assistant block

# 4. The Arabic system prompt is loaded
docker compose exec api sh -c "cat /app/librechat.yaml" | grep -c promptPrefix
#    Expected: 2

# 5. Arabic loads right-to-left
curl -s -H "Cookie: lang=ar-EG" http://localhost:3080/
#    Expected: second line is <html lang="ar" dir="rtl">
```

> **Windows:** PowerShell aliases `curl` to its own command. Use `curl.exe` instead — for example `curl.exe -s http://localhost:3080/`.

---

## Step 8 — Open the app

Go to **<http://localhost:3080>**

1. Click **Sign up** and create your account. *The first account you create is yours alone — the database starts empty, so there is no default login.*
2. Once signed in, pick **MOI Assistant** from the model menu.
3. Send a message. The first reply takes ~30 seconds while the model loads into memory; after that it is much faster.

**The assistant replies in Arabic by default.** Ask a question in any language and the answer comes back in Modern Standard Arabic. This is set by `modelSpecs` in `librechat.yaml` — see [Changing the assistant's language](#changing-the-assistants-language).

**To switch the interface to Arabic:** Settings (⚙️) → **General** → **Language** → **العربية**. The whole interface flips to right-to-left. This is separate from the reply language — the interface can be English while the assistant still answers in Arabic.

---

## Changing the assistant's language

The Arabic instruction lives in `librechat.yaml` under `modelSpecs` → `preset` → `promptPrefix`. It is sent as a system message at the start of every new conversation.

**To reword it or switch to another language,** edit that one line and apply:

```
docker compose up -d --force-recreate api
```

**To let each person choose instead,** delete the whole `modelSpecs:` block. Replies then follow whatever language the user writes in — note that `qwen2.5:7b` tends to fall back to Chinese without an instruction, which is why the block exists.

**To stop anyone from overriding it,** set `enforce: true` inside `modelSpecs`. The preset is then locked and users cannot change the prompt or model.

> Changes to `promptPrefix` only affect **new** conversations. Existing ones keep the settings they were created with.

---

## Everyday commands

Identical on both systems.

| What you want | Command |
|---|---|
| Start | `docker compose up -d` |
| Stop | `docker compose stop` |
| Restart the app | `docker compose restart api` |
| View logs | `docker compose logs -f api` |
| Check status | `docker compose ps` |
| Update after code changes | `docker compose build api` then `docker compose up -d --force-recreate api` |
| Free up space | `docker system prune -f` |

> **Careful:** `docker compose down -v` deletes all conversations and accounts. Use `docker compose stop` for normal shutdown.

---

## Troubleshooting

### The page shows old branding or the wrong logo

Your browser cached the old version. Press **Ctrl+Shift+R** to hard-refresh. If it persists, open a private window to confirm, then clear the site data for `localhost:3080`.

### `permission denied` in the mongodb or meilisearch logs

`UID`/`GID` in `.env` are wrong for your system.

**Ubuntu** — they must be your own user:

```bash
sed -i "s/^UID=.*/UID=$(id -u)/" .env
sed -i "s/^GID=.*/GID=$(id -g)/" .env
docker compose up -d --force-recreate mongodb meilisearch
```

**Windows** — they must both be `0`:

```powershell
(Get-Content '.env') -replace '^UID=.*','UID=0' -replace '^GID=.*','GID=0' |
  Set-Content '.env' -Encoding utf8
docker compose up -d --force-recreate mongodb meilisearch
```

### `permission denied while trying to connect to the Docker daemon` (Ubuntu)

You have not logged out since being added to the `docker` group. Log out and back in, or run `newgrp docker` for the current terminal.

### `error during connect` or `docker daemon is not running` (Windows)

Docker Desktop is not started. Launch it and wait for the tray whale to stop animating.

### `docker compose` says `UID variable is not set` (Windows)

`UID` and `GID` are missing from `.env`. Add them:

```powershell
Add-Content '.env' "`r`nUID=0`r`nGID=0"
```

### MOI Assistant is missing from the model menu

The config file is not reaching the container:

```
docker compose exec api sh -c "cat /app/librechat.yaml"
```

If that fails, `librechat.yaml` is missing or `docker-compose.override.yml` is wrong. Recreate both from Step 3, then `docker compose up -d --force-recreate api`.

### Replies are very slow, or the container keeps restarting

The machine is short on RAM. Close other applications. On Windows, also raise Docker Desktop's memory limit (**Settings → Resources**). Or use a smaller model:

```
docker compose exec ollama ollama pull qwen2.5:3b
```

Then change **both** `qwen2.5:7b` entries in `librechat.yaml` to `qwen2.5:3b` and run `docker compose up -d --force-recreate api`.

### The assistant replies in English or Chinese instead of Arabic

Check the config actually reached the container:

```
docker compose exec api sh -c "cat /app/librechat.yaml" | grep promptPrefix
```

If nothing prints, `librechat.yaml` is missing the `modelSpecs` block — recreate it from Step 3, then `docker compose up -d --force-recreate api`.

If it does print, you are most likely in a **conversation created before the setting existed**. Start a new chat and confirm **MOI Assistant** is selected in the model menu.

> **Conversation titles** are generated by a separate call that does not use `promptPrefix`, so titles may still appear in English or Chinese even when replies are correctly in Arabic.

---

### Port 3080 is already in use

**Ubuntu:** `sudo lsof -i :3080`
**Windows:** `Get-NetTCPConnection -LocalPort 3080 | Select-Object OwningProcess`

Either stop that program, or set a different `PORT=` in `.env` and restart.

---

## Optional: NVIDIA GPU acceleration

Makes replies roughly 5–10× faster. Requires an NVIDIA card with working drivers (`nvidia-smi` must run).

**Ubuntu** — install the container toolkit first:

```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt update && sudo apt install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

**Windows** — nothing to install. Docker Desktop with the WSL 2 backend passes the GPU through automatically once your NVIDIA driver is up to date.

**Both** — add this to the `ollama` service in `docker-compose.override.yml`:

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
- **Languages:** the interface is English and Arabic only, English by default, with full right-to-left support for Arabic. The assistant itself replies in Arabic by default.
- **Your data lives in the project folder** (`data-node/`, `ollama_data/`, `uploads/`, `logs/`). These are excluded from Git and must never be committed.
