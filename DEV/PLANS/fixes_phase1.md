The error occurs because we added a test file that imports `vitest`, but `vitest` is not installed in your project yet. To satisfy the Phase 1 requirement of having tests (and to fix the build), we need to install the test runner.

Here are the steps to fix the build and complete Phase 1:

### 1. Install Vitest
Run this command in your terminal:

```bash
pnpm add -D vitest
```

### 2. Update `package.json`
Add the test script so we can run the tests.

<file path='package.json' size='850' ext='.json'>
```json
{
  "name": "git-repository-viz",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "d3": "^7.8.5",
    "d3-hierarchy": "^3.1.2",
    "lucide-react": "^0.263.1",
    "zustand": "^4.4.7",
    "date-fns": "^3.0.6",
    "papaparse": "^5.4.1",
    "framer-motion": "^11.0.3"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@types/d3": "^7.4.3",
    "@types/papaparse": "^5.3.14",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "vite": "^5.0.8",
    "vitest": "^1.2.0"
  }
}
```
</file>

### 3. Verify
After installation, run the type check again:

```bash
pnpm run type-check
```

It should now pass cleanly. You can also run `pnpm test` to execute the new `DatasetRegistry` tests we added.

Once this passes, **Phase 1 is complete** and we are ready to move to **Phase 2: Enhanced Plugin Manifest**. Shall we proceed?