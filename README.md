# EchoChamber for Lumiverse

A native [Spindle](https://github.com/prolix-oc/Lumiverse) port of [mattjaybe's EchoChamber](https://github.com/mattjaybe/SillyTavern-EchoChamber). Original style prompts are included under `chat-styles/` and bundled into `dist/styles.js`. See `LICENSE` for the original MIT license.

## Features

- 14 original audience styles, including Discord/Twitch, Twitter/X, Breaking News, MST3K, AO3/Wattpad, and the two story cast styles.
- Generate on demand or automatically after an assistant reply.
- Send a message to the audience and get responses.
- Feed saved separately for each chat and user, capped at 200 reactions per chat.
- Drawer tab or resizable right dock panel. Theme aware UI.
- Uses Lumiverse's active connection through `spindle.generate.quiet()`.

The port uses the recent visible user/assistant messages as context. It does **not** import SillyTavern settings or reaction history, and it does not use the original extension's Ollama/OpenAI direct connection modes, floating window, livestream animation, or style editor. The original prompts are bundled, so editing a `chat-styles/*.md` file alone does not change the installed prompt; rebuild `dist/styles.js` after editing one.

## Install

1. In Lumiverse, open **Extensions → Add Extension → Install from Source**.
2. Paste `https://github.com/Comfyuser115/Lumiverse-EchoChamber` and install.
3. Enable EchoChamber and grant **Generation**, **Chats**, **Chat Mutation**, and **UI Panels** when prompted.
4. Open the **Echo** drawer tab. Open a chat and press **↻** to generate reactions. **Auto off** enables reactions after future assistant replies.

The repository includes `dist/`, so installation does not need a build step or npm install. Lumiverse can update it from this repository.

## Permissions and data

| Permission | Use |
| --- | --- |
| `generation` | Generate audience reactions with the active Lumiverse connection. |
| `chats` | Find the active chat when the extension opens. |
| `chat_mutation` | Read recent chat messages as prompt context. The port never changes chat messages. |
| `ui_panels` | Open the right dock panel. |

The extension does not request `characters`, `personas`, or `world_books`. It stores its own settings and reaction feeds in Lumiverse's per-user extension storage. It does not send data to any service other than the model provider selected in Lumiverse.

