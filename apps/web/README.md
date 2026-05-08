# React + TypeScript + Vite

## LLP Chatbot Prototype

This project now includes a frontend LLP intake chatbot prototype.

### What it does

- Asks a fixed guided set of LLP creation questions in chat format.
- Stores chat messages and in-progress answers in `localStorage`.
- Restores progress after page refresh.
- Generates final structured JSON from user input.
- Submits final JSON to backend endpoint: `POST http://localhost:3000/api/llp/submit`.

### Default JSON fields

- `applicant_name`
- `email`
- `phone`
- `proposed_llp_name`
- `business_activity`
- `registered_office_address`
- `state`
- `pin_code`
- `total_partners`
- `designated_partners`
- `partner_details` (array of partner names)
- `capital_contribution`
- `agreement_required` (boolean)
- `timeline`
- `notes`

### Backend submit payload

```json
{
  "data": {
    "applicant_name": "...",
    "email": "..."
  },
  "submitted_at": "2026-05-05T12:00:00.000Z"
}
```

### Notes

- If submit fails, the chatbot keeps data and shows a retry option.
- Use the "New Chat" button to clear stored state and restart.

### AI provider adapter pattern

The app now follows this layering for AI requests:

- UI components -> internal AI client interface -> provider adapters

Current provider adapters are selected through env config:

- `VITE_AI_PROVIDER=backend|openai|mistral`
- `VITE_API_BASE_URL=http://localhost:3000/api`
- Optional `VITE_OPENAI_ADAPTER_BASE_URL` (defaults to `${VITE_API_BASE_URL}/providers/openai`)
- Optional `VITE_MISTRAL_ADAPTER_BASE_URL` (defaults to `${VITE_API_BASE_URL}/providers/mistral`)

This means switching providers usually needs config changes only, while UI code remains unchanged.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
