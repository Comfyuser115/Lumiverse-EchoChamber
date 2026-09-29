// src/backend.js
var SETTINGS_PATH = "upstream-settings.json";
var EXTERNAL_KEY = "echochamber-openai-key";
var jobs = /* @__PURE__ */ new Map();
function respond(userId, id, result, error) {
  spindle.sendToFrontend({ type: "bridge_response", id, result, error: error ? String(error.message || error) : void 0 }, userId);
}
function text(value, max = 12e3) {
  return typeof value === "string" ? value.slice(0, max) : "";
}
function idOf(value) {
  return typeof value === "string" && /^[\w-]{1,128}$/.test(value) ? value : null;
}
async function profileList(userId) {
  if (!spindle.permissions.has("generation")) return [];
  return (await spindle.connections.list(userId)).map((profile) => ({
    id: profile.id,
    name: profile.name,
    model: profile.model,
    provider: profile.provider,
    is_default: profile.is_default === true
  }));
}
async function snapshot(userId, options = {}) {
  const active = spindle.permissions.has("chats") ? await spindle.chats.getActive(userId) : null;
  const chatId = idOf(active?.id);
  const all = chatId ? await spindle.chat.getMessages(chatId) : [];
  const chat = chatId ? await spindle.chats.get(chatId, userId) : null;
  const persona = spindle.permissions.has("personas") ? await spindle.personas.getActive(userId) : null;
  const character = chat?.character_id && spindle.permissions.has("characters") ? await spindle.characters.get(chat.character_id, userId) : null;
  const mapped = all.slice(-500).map((message) => ({
    mes: text(message.content),
    message: text(message.content),
    is_user: message.role === "user",
    is_system: message.role === "system",
    name: text(message.name, 100) || (message.role === "user" ? text(persona?.name, 100) || "User" : text(character?.name, 100) || "Character"),
    extra: options.includeSummary ? { memory: text(message?.metadata?.memory || message?.extra?.memory, 8e3) } : {}
  }));
  const details = {};
  if (options.includePersona && persona) {
    details.persona = { name: text(persona.name, 100), description: text(persona.description, 8e3) };
  }
  if (options.includeAuthorsNote) {
    const note = chat?.metadata?.authors_note;
    details.authorsNote = text(typeof note === "string" ? note : note?.content, 8e3);
  }
  if (options.includeSummary) details.summary = text(chat?.metadata?.summary, 8e3);
  if (options.includeCharacterDescription && character) {
    details.characterDescription = text(character.description, 1e4);
  }
  if (options.includeWorldInfo && chatId && spindle.permissions.has("world_books")) {
    const selected = await spindle.world_books.getActivated(chatId, userId);
    const contents = [];
    let budget = Number(options.wiBudget) || 0;
    for (const item of selected || []) {
      if (!item?.id) continue;
      const entry = await spindle.world_books.entries.get(item.id, userId);
      const content = text(entry?.content, 12e3).trim();
      if (!content) continue;
      if (budget > 0) {
        const count = (await spindle.tokens.countText(content, { userId })).total_tokens;
        if (count > budget) continue;
        budget -= count;
      }
      contents.push(content);
      if (contents.length >= 30) break;
    }
    details.worldInfo = contents.join("\n\n");
  }
  return {
    chatId,
    chat: mapped,
    personaName: text(persona?.name, 100) || "User",
    characterName: text(character?.name, 100) || "Character",
    characterId: chat?.character_id || null,
    profiles: await profileList(userId),
    details
  };
}
async function saveSettings(userId, incoming) {
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) throw new Error("Invalid settings");
  const settings = structuredClone(incoming);
  const key = text(settings.openai_key, 2048);
  if (key) await spindle.enclave.put(EXTERNAL_KEY, key, userId);
  delete settings.openai_key;
  await spindle.userStorage.setJson(SETTINGS_PATH, settings, { userId });
  return true;
}
async function generate(userId, payload, id) {
  if (!spindle.permissions.has("generation")) throw new Error("Grant Generation permission to EchoChamber.");
  const controller = new AbortController();
  jobs.set(`${userId}:${id}`, controller);
  try {
    const messages = Array.isArray(payload.messages) ? payload.messages.slice(-520).map((row) => ({
      role: ["system", "user", "assistant"].includes(row?.role) ? row.role : "user",
      content: text(row?.content, 3e4)
    })) : [];
    if (!messages.length) throw new Error("No messages to generate from.");
    const maxTokens = Math.max(100, Math.min(8e3, Number(payload.maxTokens) || 700));
    const input = { userId, messages, parameters: { max_tokens: maxTokens }, signal: controller.signal };
    if (payload.connectionId) {
      const profile = await spindle.connections.get(payload.connectionId, userId);
      if (!profile) throw new Error("Selected Lumiverse connection profile was not found.");
      input.connection_id = payload.connectionId;
    }
    const response = await spindle.generate.quiet(input);
    return { content: response?.content || "" };
  } finally {
    jobs.delete(`${userId}:${id}`);
  }
}
function checkedUrl(raw) {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash) {
    throw new Error("External model URL must be an http(s) URL without credentials or fragment.");
  }
  if (!/\/(api\/chat|chat\/completions|api\/tags)$/.test(url.pathname)) throw new Error("Unsupported model endpoint.");
  return url.toString();
}
async function externalRequest(userId, payload) {
  if (!spindle.permissions.has("cors_proxy")) throw new Error("Grant CORS Proxy permission to EchoChamber.");
  const url = checkedUrl(payload.url);
  const headers = { "content-type": "application/json" };
  if (url.endsWith("/chat/completions")) {
    const key = await spindle.enclave.get(EXTERNAL_KEY, userId);
    if (key) headers.authorization = `Bearer ${key}`;
  }
  const response = await spindle.cors(url, {
    method: payload.method === "GET" ? "GET" : "POST",
    headers,
    ...payload.method === "GET" ? {} : { body: text(payload.body, 2e5) }
  });
  return { status: response.status, body: text(response.body, 3e5) };
}
spindle.onFrontendMessage(async (payload, userId) => {
  if (payload?.type === "bridge_cancel") {
    jobs.get(`${userId}:${payload.id}`)?.abort();
    return;
  }
  if (payload?.type !== "bridge_request" || typeof payload.id !== "string") return;
  try {
    let result;
    switch (payload.action) {
      case "hydrate":
        result = {
          settings: await spindle.userStorage.getJson(SETTINGS_PATH, { fallback: null, userId }),
          snapshot: await snapshot(userId, payload.options)
        };
        break;
      case "snapshot":
        result = await snapshot(userId, payload.options);
        break;
      case "save_settings":
        result = await saveSettings(userId, payload.settings);
        break;
      case "generate":
        result = await generate(userId, payload, payload.id);
        break;
      case "external":
        result = await externalRequest(userId, payload);
        break;
      default:
        throw new Error("Unknown EchoChamber request");
    }
    respond(userId, payload.id, result);
  } catch (error) {
    respond(userId, payload.id, null, error);
  }
});
spindle.log.info("Upstream EchoChamber bridge ready");
