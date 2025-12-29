# Development Environment Setup & Best Practices

This document consolidates all setup information, workarounds, and best practices for this project.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [PowerShell Execution Policy (Critical)](#powershell-execution-policy-critical)
3. [Module System (ES6 Only)](#module-system-es6-only)
4. [Commands & Scripts](#commands--scripts)
5. [Configuration Files](#configuration-files)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### For Visual Studio Code Users

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run lint         # Check code
npm run lint:fix     # Auto-fix linting issues
npm run test         # Run tests
npm run build        # Build for production
```

**Terminal:** VS Code is configured to use `cmd.exe` (Command Prompt) by default. No PowerShell issues.

### For Command Line Users

Use Command Prompt (cmd.exe), not PowerShell:

```cmd
cd c:\workspace\zetacard
npm install
npm run dev
```

### For PowerShell Users

First, run the one-time setup (see [PowerShell Execution Policy](#powershell-execution-policy-critical)):

```powershell
# After setup, you can use npm normally
npm install
npm run dev
```

---

## PowerShell Execution Policy (Critical)

### The Problem

PowerShell blocks npm by default:

```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because 
running scripts is disabled on this system.
```

### Why This Happens

- Windows restricts "unsigned" scripts for security
- PowerShell treats npm.ps1 as a potentially dangerous script
- Command Prompt has no such restriction
- This is a PowerShell security feature, not an npm issue

### The Solutions

#### Solution 1: Use Command Prompt (Recommended for VS Code)

**Already configured in this workspace.** Just use `cmd.exe`.

- No setup needed
- Works immediately
- VS Code defaults to this
- No execution policy issues

**For AI agents/Copilot:** This is the default. No action needed.

---

#### Solution 2: One-Time PowerShell Setup (Recommended for System-Wide)

Run this once as Administrator to allow npm everywhere:

1. Right-click `setup-powershell.cmd` (in repo root)
2. Select **"Run as administrator"**
3. Type **Y** to confirm
4. Close and reopen PowerShell
5. npm now works in PowerShell

**What it does:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

This allows local scripts to run without approval.

**Security impact:**
- Only affects your user account
- Does not affect system-wide security
- Does not require admin rights after setup
- Can be reverted if needed

---

#### Solution 3: Direct npm.cmd Call (For Restricted Environments)

If PowerShell is maximally restricted, use this pattern:

```powershell
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run lint
& "C:\Program Files\nodejs\npm.cmd" run dev
```

**Why this works:**
- Calls `npm.cmd` (a batch file, allowed in any PowerShell)
- The `&` operator invokes it as a command
- Bypasses execution policy entirely
- Confirmed working ✓

---

### Summary Table

| Scenario | Solution | Setup Required |
|----------|----------|-----------------|
| Using VS Code | Use cmd.exe (default) | ✓ Already done |
| Using PowerShell at work | Run `setup-powershell.cmd` | Run once as admin |
| Maximally restricted PS | Use `node ... npm-cli.js` pattern | None |
| Using Command Prompt | Just type `npm` | None |

---

## Module System (ES6 Only)

### The Rule: **NO CommonJS in this project**

This is a **Vite + ES6 modules** project. Only ES6 imports/exports are allowed.

### ✅ DO: Use ES6 Imports

```typescript
// Correct - import at top of file
import Omnibox from "./components/Omnibox";
import { myFunction } from "./utils/helpers";

export default function App() {
  return <Omnibox />;
}
```

### ❌ DON'T: Use CommonJS

```typescript
// WRONG - Breaks in Vite
const Omnibox = require('./components/Omnibox');

// WRONG - Does not work
const module = require(`./${variableName}`);

// WRONG - CommonJS export
module.exports = MyComponent;
```

### Why?

- **Vite is ESM-first:** Native ES6 module support
- **Tree-shaking:** Static imports enable better bundling
- **HMR:** Hot Module Replacement requires static imports
- **Type safety:** TypeScript works best with ES6 imports

### Lazy Loading (When Needed)

Use React's `lazy()` with dynamic `import()`:

```typescript
import { lazy, Suspense } from 'react';

const GITract3D = lazy(() => import('./GITract3D'));

export default function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GITract3D />
    </Suspense>
  );
}
```

### Enforcement

**ESLint automatically catches CommonJS patterns:**

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix
```

**Pre-commit hooks** prevent CommonJS code from entering git.

---

## Commands & Scripts

### Development

```bash
npm run dev          # Start Vite dev server (http://127.0.0.1:5173)
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Code Quality

```bash
npm run lint         # Run ESLint on src/
npm run lint:fix     # Auto-fix ESLint issues
npm run test         # Run tests with Vitest
```

### Helper Scripts (in repo root)

```cmd
dev.cmd              # Wrapper for npm run (handles execution policy)
npm-direct.cmd       # Direct npm via node.exe
setup-powershell.cmd # One-time PowerShell fix (run as admin)
```

### For AI/Copilot

If PowerShell is restricted, use:

```powershell
node "$env:APPDATA\npm\node_modules\npm\bin\npm-cli.js" run lint
node "$env:APPDATA\npm\node_modules\npm\bin\npm-cli.js" run dev
```

---

## Configuration Files

### Terminal & Shell

**File:** `.vscode/settings.json`

Configures VS Code to use Command Prompt by default:

```json
{
  "terminal.integrated.defaultProfile.windows": "Command Prompt",
  "terminal.integrated.profiles.windows": {
    "Command Prompt": {
      "path": "C:\\Windows\\System32\\cmd.exe",
      "args": []
    }
  },
  "terminal.integrated.shell.windows": "C:\\Windows\\System32\\cmd.exe"
}
```

**Result:** No PowerShell execution policy issues in VS Code.

---

### Build Tasks

**File:** `.vscode/tasks.json`

Defines build tasks (accessible via `Ctrl+Shift+B`):

```json
{
  "label": "Run Dev Server",
  "type": "shell",
  "command": "npm.cmd run dev",
  "options": {
    "shell": {
      "executable": "C:\\Windows\\System32\\cmd.exe",
      "args": ["/c"]
    }
  },
  "isBackground": true
}
```

**Result:** Dev server task uses cmd.exe.

---

### Code Linting

**File:** `.eslintrc.json`

Enforces ES6 modules and catches CommonJS patterns:

```json
{
  "rules": {
    "no-restricted-globals": [
      "error",
      {
        "name": "require",
        "message": "Use ES6 import syntax instead of require(). This is an ES6 module project using Vite."
      }
    ]
  }
}
```

**Result:** `npm run lint` catches CommonJS usage automatically.

---

### TypeScript

**File:** `tsconfig.json`

Strict mode enabled:

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "Bundler",
    "module": "ESNext"
  }
}
```

**Result:** Type checking prevents undefined errors.

---

### Pre-Commit Hooks

**File:** `.husky/pre-commit`

Runs ESLint before commits to prevent bad code:

```sh
npm run lint -- $FILES
```

**Result:** Can't commit code that violates linting rules.

---

## Troubleshooting

### npm Command Not Found or Blocked

**Symptom:**
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded...
```

**Solution:** See [PowerShell Execution Policy](#powershell-execution-policy-critical)

1. Are you in PowerShell? → Switch to Command Prompt
2. Must use PowerShell? → Run `setup-powershell.cmd` once as admin
3. Still blocked? → Use `node "$env:APPDATA\npm\node_modules\npm\bin\npm-cli.js"` pattern

---

### Module Import Errors

**Symptom:**
```
Cannot read properties of undefined (reading 'S')
ReferenceError: require is not defined
```

**Solution:**

1. Check the import statement - must be ES6
   ```typescript
   // Wrong
   const Module = require('./Module');
   
   // Right
   import Module from './Module';
   ```

2. Check the export statement - must be ES6
   ```typescript
   // Wrong
   module.exports = Component;
   
   // Right
   export default Component;
   ```

3. Run ESLint to find issues:
   ```bash
   npm run lint
   npm run lint:fix
   ```

---

### Blank Screen or No Content

**Symptom:** App loads but shows blank page

**Solution:**

1. Check browser console (F12) for errors
2. Verify canvas is rendering:
   ```bash
   npm run dev
   # Check http://127.0.0.1:5173
   ```

3. Check for React errors in console
4. Try hard refresh (Ctrl+Shift+R)

---

### React DevTools Warning

**Message:** "Download React DevTools for a better development experience"

**Solution:** Optional. Install from Chrome/Edge extensions:
- React Developer Tools
- No impact on functionality if not installed

---

## Files in This Workspace

### Documentation (Read These)

- `DEVELOPMENT.md` - This file (master reference)
- `MODULES.md` - ES6 module guidelines (deprecated, see above)
- `TERMINAL_CONFIG.md` - Terminal setup (deprecated, see above)
- `POWERSHELL_SETUP.md` - PowerShell setup (deprecated, see above)

### Scripts (Executable)

- `setup-powershell.cmd` - Run once as admin to fix PowerShell
- `npm-direct.cmd` - Direct npm via node.exe
- `npm-safe.ps1` - PowerShell helper script
- `dev.cmd` - npm command wrapper

### Configuration

- `.vscode/settings.json` - VS Code terminal & editor settings
- `.vscode/tasks.json` - Build tasks
- `.eslintrc.json` - ESLint rules (catches CommonJS)
- `tsconfig.json` - TypeScript compiler options
- `.husky/pre-commit` - Pre-commit linting hook
- `vite.config.ts` - Vite bundler config
- `vitest.config.ts` - Test runner config

### Source Code

- `src/` - Main application code
- `src/__tests__/` - Test files
- `src/components/` - React components
- `src/utils/` - Utility functions
- `.zeta_repo/` - Data files and schemas

---

## Quick Reference Card

```bash
# Development
npm run dev              # Start dev server

# Code Quality
npm run lint            # Check for issues
npm run lint:fix        # Auto-fix linting

# Building
npm run build           # Production build
npm run preview         # Preview build

# Testing
npm run test            # Run tests

# If npm is blocked (PowerShell)
# Option 1: Switch to cmd.exe (default)
# Option 2: Run setup-powershell.cmd once as admin
# Option 3: Use this pattern:
node "$env:APPDATA\npm\node_modules\npm\bin\npm-cli.js" run lint
```

---

## Additional Resources

- **Vite Docs:** https://vitejs.dev/
- **ES6 Modules:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- **ESLint:** https://eslint.org/
- **TypeScript:** https://www.typescriptlang.org/
- **React:** https://react.dev/

---

**Last Updated:** December 27, 2025
