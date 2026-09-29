# EchoChamber for Lumiverse

A [Lumiverse Spindle](https://github.com/prolix-oc/Lumiverse) adaptation of [mattjaybe's EchoChamber for SillyTavern](https://github.com/mattjaybe/SillyTavern-EchoChamber). The original 14 audience prompts are included in `chat-styles/` and bundled in `dist/styles.js`. The original MIT license is included.

## Features

| Feature | Lumiverse adaptation |
| --- | --- |
| 14 built-in styles | Discord/Twitch, Twitter/X, Breaking News, MST3K, AO3/Wattpad, Dark Roast, Doomscrollers, HypeBot, roleplay/story cast, and more. |
| Flexible model backends | Active Lumiverse connection or a selected connection profile; direct Ollama and OpenAI-compatible endpoints for KoboldCPP, LM Studio, vLLM, and similar servers. |
| Five panel positions | Top, bottom, left, right, or a draggable and resizable floating widget. A drawer tab is also available. |
| Chat participation | Send a message as your configured audience name; click a commenter or type `@` to address one. Set your name, avatar color, and reply count. |
| Livestream | Reveal background reactions with configurable random intervals. Manual **Regenerate** replaces the feed and displays its batch immediately. Turning Live off pauses the reveal queue; turning it back on resumes it. Manual, on-message, and after-batch modes; pause/resume and auto-scroll controls. |
| Quick controls | Style, audience size, regenerate/stop, layout, font size, power, livestream, collapse, and clear controls. |
| Theme aware | Uses Lumiverse theme variables for colors, surfaces, and borders. |
| Style manager | Create, edit, hide, reorder, import, and export styles. Built-in prompt edits are saved as overrides. Easy and advanced creation modes are included. |
| Markdown | Reaction text supports bold, italic, underline, inline code, and @mentions. Rendering creates text and formatting nodes rather than inserting model output as HTML. |

The extension can also include selected context from the active persona, character description, author's note, chat summary, and activated world info. These context options are off by default. The cast styles and custom `{{user}}`, `{{char}}`, `{{characters}}`, or `{{story_characters_block}}` macros resolve names from the active Lumiverse chat and persona. Reaction feeds and settings are saved separately for each user; feeds are scoped to each chat.

## Install

1. In Lumiverse, open **Extensions → Add Extension → Install from Source**.
2. Paste `https://github.com/Comfyuser115/Lumiverse-EchoChamber`.
3. Enable EchoChamber and grant the permissions needed for the features you use.
4. Open the **Echo** drawer tab. Open a chat and press **Regenerate** to create the first audience reactions.

The repository includes ready-to-load `dist/` files. It does not require npm packages or a build step. Lumiverse can update the extension from this repository.

## Model backends

- **Lumiverse:** Choose a saved profile from the panel's **Model** control or **Settings → Lumiverse connection**. Profile names and model IDs are shown together, so you can select a cheaper model for audience reactions while keeping your main RP connection. Choose **Use main Lumiverse connection** to follow your active connection. Press **Refresh connections** in settings after adding a profile in Lumiverse. EchoChamber turns reasoning off for its own short reaction requests without changing the profile's saved reasoning settings.
- **Ollama:** Enter the server URL and model name. The request goes to `/api/chat`.
- **OpenAI-compatible:** Enter a base URL and model name. The extension calls `/v1/chat/completions`. This works with servers offering that endpoint, including KoboldCPP, LM Studio, and vLLM. An optional API key is stored in Lumiverse's encrypted per-user secure enclave.

Direct backend requests use Lumiverse's server-side CORS proxy. `localhost` in a backend URL refers to the **Lumiverse server**, which may differ from the device running your browser.

## Permissions

| Permission | Used for |
| --- | --- |
| `generation` | Reactions through Lumiverse and connection profile selection. |
| `chats`, `chat_mutation` | Find the active chat and read recent messages as reaction context. EchoChamber does not edit chat messages. |
| `ui_panels` | Docked and floating panel positions. |
| `cors_proxy` | Ollama and OpenAI-compatible server requests. |
| `characters`, `personas`, `world_books` | Optional context switches, plus character/persona name lookup when a style contains a matching macro. |

API keys stay in the secure enclave; they are not returned to the browser as settings. The extension sends prompt context only to the model backend you configure.

## Style files and development

Custom styles can be imported or exported as Markdown or JSON in the panel's Style Manager. The Markdown files under `chat-styles/` are the source prompts. At runtime, the backend reads their bundled copy in `dist/styles.js`. After batch editing the Markdown files, run `node scripts/bundle-styles.mjs` from the repository root and include the updated `dist/styles.js` when publishing.

Run local checks with `node --test tests/*.test.mjs`. These exercise the backend and frontend protocol with fixtures; they do not access your Lumiverse account or content.

This port uses Lumiverse's native APIs. It does not import SillyTavern settings, chat caches, or connection profiles automatically.
