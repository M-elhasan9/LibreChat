<p align="center">
  <img src="client/public/assets/logo.jpg" height="180" alt="MOI logo">
</p>

<h1 align="center">MOI - AI Chat</h1>

<p align="center">
  A private AI chat assistant for MOI — runs entirely on your own machine.
</p>

---

## What this is

A self-hosted AI chat application for MOI staff. It runs completely offline after setup: the AI model lives on your machine, so **no data ever leaves it** and no external API keys are needed.

| | |
|---|---|
| **AI model** | `qwen2.5:7b`, running locally via [Ollama](https://ollama.com) |
| **Reply language** | Arabic by default (Modern Standard Arabic) |
| **Interface** | English and Arabic, with full right-to-left support |
| **Runs on** | Ubuntu Desktop and Windows 11, via Docker |
| **Cost** | None — no subscriptions, no API billing |

---

## 📖 Installation

**→ Follow [SETUP.md](SETUP.md) for the complete step-by-step guide.**

It covers both Ubuntu and Windows, and takes about 30 minutes — most of it waiting for downloads.

### Already installed?

```bash
docker compose up -d          # start
docker compose stop           # stop
docker compose logs -f api    # view logs
```

Then open **<http://localhost:3080>**.

---

## Repository layout

| Path | What it is |
|---|---|
| `SETUP.md` | Full installation guide — start here |
| `librechat.yaml` | Endpoint and Arabic system prompt *(not in Git — you create it)* |
| `docker-compose.override.yml` | Ollama service and local build *(not in Git — you create it)* |
| `.env` | Secrets and settings *(not in Git — you create it)* |
| `client/` | Web interface (React) |
| `api/`, `packages/` | Server |

> **Three files are deliberately excluded from Git** because they hold secrets or machine-specific paths. `SETUP.md` contains all three as copy-paste blocks — a fresh clone is not runnable until you create them.

---

## ⚠️ Before you commit

- **Never commit `.env`** — it holds the keys that secure logins and encrypt stored credentials.
- **Never put real secrets in `.env.example`** — unlike `.env`, that file *is* tracked by Git.
- **Never commit runtime data** — `ollama_data/`, `data-node/`, `meili_data_v1.35.1/`, `logs/`, `uploads/`, `images/`. These are gigabytes of models and databases, and are already excluded in `.gitignore`.

Each person generates their own secrets during setup. Do not share them between machines.

---

## Making changes

The MOI branding (name, logo, languages) is compiled into the web interface, so a rebuild is required after editing anything under `client/`:

```bash
docker compose build api
docker compose up -d --force-recreate api
```

Changes to `librechat.yaml` need only the second command.

---

## Built on LibreChat

This is a customized fork of [LibreChat](https://github.com/danny-avila/LibreChat), an open-source chat platform, used under the [MIT License](LICENSE).

Customizations for MOI: rebranding (name, logo, icons), the interface restricted to English and Arabic with right-to-left support, a local Ollama endpoint replacing the cloud providers, and an Arabic-by-default system prompt.
