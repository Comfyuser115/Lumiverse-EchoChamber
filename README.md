# EchoChamber for Lumiverse

This is a source adaptation of [mattjaybe's SillyTavern EchoChamber v5.2.0](https://github.com/mattjaybe/SillyTavern-EchoChamber) for [Lumiverse](https://github.com/prolix-oc/Lumiverse). The upstream `index.js`, `style.css`, `settings.html`, and `connection_utils.js` are kept in `upstream/` so the origin of the interface and behavior remains clear. The original MIT license is retained.

The Lumiverse bridge provides chat history, connection profiles, generation, settings storage, and external model requests. EchoChamber's upstream panel, settings modal, live feed, chat participation, style editor, prompt assembly, and response parser run in the frontend. Its five panel positions use Lumiverse docks for top, bottom, left, and right; the original floating panel remains available from the panel controls.

## Install

Install `https://github.com/Comfyuser115/Lumiverse-EchoChamber` as a Lumiverse Spindle extension, then reload the extension. Open **EchoChamber** in the drawer or Lumiverse settings. In **Generation Engine**, choose **Default** for the main Lumiverse connection or **Connection Profile** for a separate model.

On first launch, the bridge migrates settings from the earlier Lumiverse port, including the selected connection profile. The previous settings and feed data stay available to the backup branch.

Ollama and OpenAI compatible endpoints use Lumiverse's CORS proxy. The OpenAI compatible API key is stored in the Lumiverse enclave rather than extension settings. Grant the extension's requested permissions when prompted. Persona and character names support the upstream style macros; their descriptions, the author's note, summary, and world information are supplied only when their EchoChamber settings are enabled.

## Styles and build

The 14 built-in style files are in `chat-styles/`. To batch edit them, modify the `.md` files and run:

```sh
npm ci
node scripts/bundle-styles.mjs
npm run build
npm test
```

`scripts/bundle-styles.mjs` bundles the style files into `dist/styles.js`. `scripts/build-upstream.mjs` applies the small host integration replacements to the upstream frontend and bundles the Lumiverse bridge into `dist/`. The installed extension uses the committed `dist/` files, so building is needed after editing styles.

The earlier independent Lumiverse port is preserved on the [`legacy-lumiverse-port-2026-09-28` branch](https://github.com/Comfyuser115/Lumiverse-EchoChamber/tree/legacy-lumiverse-port-2026-09-28).
