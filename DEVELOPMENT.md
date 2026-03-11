# Code Review & Development Notes

## ✅ Latest Code Review (Mar 2026)

### Build Status
- **Build:** ✅ Passing
- **Lint:** ✅ No errors/warnings
- **Docker:** ✅ Build and execution OK
- **TypeScript:** ✅ No type errors

### Issues Fixed

#### 1. Build Cache Issue
- **Symptom:** `TypeError: Cannot read properties of undefined (reading 'length')`
- **Solution:** Clear Next.js cache (`rm -rf .next`)
- **Prevention:** Add `.next` to `.dockerignore` if not already present

#### 2. Lint Warnings (React Hooks)
All fixed using React best practices:

| File | Issue | Fix Applied |
|------|-------|-------------|
| `app/import/ImportWizardClient.tsx` | Sync setState in useEffect | Deferred with setTimeout |
| `components/Navbar.tsx` | Sync setState in useEffect | Deferred with setTimeout |
| `components/WelcomeModal.tsx` | Sync setState in useEffect | Lazy state initialization |

#### 3. Ollama Connection Issue
- **Symptom:** "Aguardando resposta da IA..." with local Ollama
- **Problem:** URL was hardcoded for Docker (`host.docker.internal`)
- **Solution:** Auto-detect environment + add `DOCKER_CONTAINER=true` env var

---

## 🐳 Ollama Configuration

### Running Locally (without Docker)

If running `npm run dev` directly (not in Docker):

1. **Start Ollama:**
   ```bash
   ollama serve
   ```

2. **Install a model:**
   ```bash
   ollama pull llama3.2:3b
   # or
   ollama pull gemma3:4b
   ```

3. **Check running models:**
   ```bash
   ollama list
   ```

4. **In the app Config page:**
   - Provider: **Ollama**
   - Base URL: `http://localhost:11434/v1` (auto-detected)
   - Model: `llama3.4:3b` (or your installed model)

### Running in Docker

The app automatically detects Docker and uses `http://host.docker.internal:11434/v1`.

Make sure Ollama is running on your **host machine** (not inside the container).

### Troubleshooting Ollama

**Problem:** "Connection refused"
- Ollama is not running → Start with `ollama serve`

**Problem:** "Model not found"
- Model not installed → Run `ollama pull <model-name>`

**Problem:** "Timeout"
- Increase timeout in Config page or check Ollama logs

**Debug:** Test connection in Config page → Click the test button (🧪)
