const modeCards = Array.from(document.querySelectorAll(".mode-card"));
const analyzeButton = document.getElementById("analyzeButton");
const sampleButton = document.getElementById("sampleButton");
const downloadButton = document.getElementById("downloadButton");
const copyPromptButton = document.getElementById("copyPromptButton");
const circuitJson = document.getElementById("circuitJson");
const analysisPanel = document.getElementById("analysisPanel");
const analysisModeLabel = document.getElementById("analysisMode");
const analysisEmblem = document.getElementById("analysisEmblem");
const activeModeBadge = document.getElementById("activeModeBadge");
const useLmStudio = document.getElementById("useLmStudio");
const lmEndpoint = document.getElementById("lmEndpoint");
const lmModel = document.getElementById("lmModel");
const circuitPreview = document.getElementById("circuitPreview");
const circuitSummary = document.getElementById("circuitSummary");
const circuitKindBadge = document.getElementById("circuitKindBadge");

const modes = {
  basic: {
    label: "Modo Básico",
    badge: "⚡ Básico",
    emblem: "⚡",
    prompt: "Validación básica: detecta cortos, conexiones faltantes y polaridad incorrecta. Responde con errores críticos, causa probable y arreglo sugerido.",
  },
  advanced: {
    label: "Modo Avanzado",
    badge: "🚀 Avanzado",
    emblem: "🚀",
    prompt: "Optimización avanzada: sugiere valores de resistencias, componentes equivalentes más eficientes y mejoras de topología. Prioriza cambios prácticos.",
  },
  complete: {
    label: "Modo Completo",
    badge: "🌌 Completo",
    emblem: "🌌",
    prompt: "Análisis integral: primero lista errores críticos y después propone optimizaciones de diseño. Separa errores de sugerencias.",
  },
};

const sampleCircuit = {
  description: "Demo Nebula: fuente, LED y divisor simple",
  nodes: [0, 1, 2, 3],
  parts: [
    { type: "voltage source", value: "9V", nodes: [0, 1] },
    { type: "wire", value: "direct", nodes: [1, 2] },
    { type: "led", value: "red", nodes: [2, 0], polarity: "unknown" },
    { type: "resistor", value: "220", nodes: [1, 3] },
    { type: "resistor", value: "220", nodes: [3, 0] },
    { type: "electrolytic capacitor", value: "100uF", nodes: [1, 0], polarity: "check" },
  ],
};

let selectedMode = "basic";

function setMode(mode) {
  selectedMode = mode;
  modeCards.forEach((card) => card.classList.toggle("active", card.dataset.mode === mode));
  analysisModeLabel.textContent = modes[mode].label;
  analysisEmblem.textContent = modes[mode].emblem;
  activeModeBadge.textContent = modes[mode].badge;
  analyzeButton.textContent = `${modes[mode].emblem} Analizar`;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

function normalizeParts(data) {
  if (Array.isArray(data.parts)) return data.parts;
  if (Array.isArray(data.elements)) return data.elements;
  if (Array.isArray(data.components)) return data.components;
  if (Array.isArray(data.circuit)) return data.circuit;
  return [];
}

function getType(part) {
  return String(part.type || part.name || part.kind || "").toLowerCase();
}

function getNodes(part) {
  if (Array.isArray(part.nodes)) return part.nodes;
  if (Array.isArray(part.connections)) return part.connections;
  if (part.nodeA !== undefined && part.nodeB !== undefined) return [part.nodeA, part.nodeB];
  return [];
}

function parseResistance(value) {
  if (typeof value === "number") return value;
  const text = String(value || "").trim().toLowerCase();
  const match = text.match(/^([\d.]+)\s*([kmg]?)/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const multiplier = { "": 1, k: 1000, m: 1000000, g: 1000000000 }[match[2]] ?? 1;
  return amount * multiplier;
}

function parseCircuitText(input) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("$") && !line.startsWith("#"));

  const typeMap = {
    w: "wire",
    r: "resistor",
    c: "capacitor",
    l: "inductor",
    d: "diode",
    v: "voltage source",
    V: "voltage source",
    i: "current source",
    g: "ground",
    s: "switch",
    p: "probe",
    t: "transistor",
    a: "op amp",
  };

  const parts = [];
  const nodeIds = new Map();

  function nodeFor(x, y) {
    const key = `${x},${y}`;
    if (!nodeIds.has(key)) nodeIds.set(key, nodeIds.size);
    return nodeIds.get(key);
  }

  lines.forEach((line, index) => {
    const tokens = line.split(/\s+/);
    const elementCode = tokens[0];
    const type = typeMap[elementCode] || `circuitjs:${elementCode}`;
    const x1 = Number(tokens[1]);
    const y1 = Number(tokens[2]);
    const x2 = Number(tokens[3]);
    const y2 = Number(tokens[4]);
    const hasTwoPoints = [x1, y1, x2, y2].every(Number.isFinite);

    if (!hasTwoPoints) return;

    const value =
      tokens.slice(5).find((token) => /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(token)) ||
      tokens.slice(5).join(" ");

    parts.push({
      type,
      value,
      nodes: [nodeFor(x1, y1), nodeFor(x2, y2)],
      x1,
      y1,
      x2,
      y2,
      source: "CircuitJS1 text",
      raw: line,
      line: index + 1,
    });
  });

  if (!parts.length) {
    throw new Error("No pude reconocer componentes en el texto exportado desde CircuitJS1.");
  }

  return {
    description: "Circuito importado desde texto de CircuitJS1",
    format: "circuitjs-text",
    nodes: Array.from({ length: nodeIds.size }, (_, id) => id),
    parts,
  };
}

function parseCircuitXml(input) {
  const parser = new DOMParser();
  const documentXml = parser.parseFromString(input, "application/xml");
  const parserError = documentXml.querySelector("parsererror");

  if (parserError) {
    throw new Error("El XML no se pudo leer. Revisa que hayas copiado el contenido completo.");
  }

  const root = documentXml.querySelector("cir");
  if (!root) {
    throw new Error("El XML no contiene una etiqueta principal <cir>.");
  }

  const serializer = new XMLSerializer();
  const typeMap = {
    w: "wire",
    r: "resistor",
    R: "rail",
    c: "capacitor",
    l: "inductor",
    d: "diode",
    LED: "led",
    g: "ground",
    s: "switch",
    I: "logic input",
    And: "and gate",
    Or: "or gate",
    Xor: "xor gate",
    Not: "not gate",
    ssd: "seven segment display",
  };

  const parts = [];
  const nodeIds = new Map();

  function nodeFor(x, y) {
    const key = `${x},${y}`;
    if (!nodeIds.has(key)) nodeIds.set(key, nodeIds.size);
    return nodeIds.get(key);
  }

  Array.from(root.children).forEach((element, index) => {
    const tag = element.tagName;
    const coordinates = (element.getAttribute("x") || "")
      .trim()
      .split(/\s+/)
      .map(Number);

    if (coordinates.length < 4 || coordinates.some((value) => !Number.isFinite(value))) {
      return;
    }

    const [x1, y1, x2, y2] = coordinates;
    const attributes = {};
    Array.from(element.attributes).forEach((attribute) => {
      attributes[attribute.name] = attribute.value;
    });

    const value =
      attributes.r ||
      attributes.maxv ||
      attributes.o ||
      attributes.mo ||
      attributes.bi ||
      attributes.hi ||
      "";

    parts.push({
      type: typeMap[tag] || `xml:${tag}`,
      value,
      nodes: [nodeFor(x1, y1), nodeFor(x2, y2)],
      x1,
      y1,
      x2,
      y2,
      attributes,
      source: "CircuitJS XML",
      raw: serializer.serializeToString(element),
      line: index + 1,
    });
  });

  if (!parts.length) {
    throw new Error("No pude reconocer componentes dentro del XML.");
  }

  return {
    description: "Circuito importado desde XML de CircuitJS",
    format: "circuitjs-xml",
    settings: Object.fromEntries(Array.from(root.attributes).map((attribute) => [attribute.name, attribute.value])),
    nodes: Array.from({ length: nodeIds.size }, (_, id) => id),
    parts,
  };
}

function parseCircuitInput(input) {
  if (!input.trim()) {
    throw new Error("El campo del circuito está vacío.");
  }

  try {
    const parsed = JSON.parse(input);
    return { ...parsed, parts: normalizeParts(parsed) };
  } catch {
    if (input.trim().startsWith("<")) {
      return parseCircuitXml(input);
    }
    return parseCircuitText(input);
  }
}

function getPartPosition(part, index = 0) {
  const x1 = Number(part.x1 ?? part.x ?? part.left);
  const y1 = Number(part.y1 ?? part.y ?? part.top);
  const x2 = Number(part.x2 ?? part.xEnd ?? part.right);
  const y2 = Number(part.y2 ?? part.yEnd ?? part.bottom);

  if ([x1, y1, x2, y2].every(Number.isFinite)) {
    return { x1, y1, x2, y2 };
  }

  const col = index % 6;
  const row = Math.floor(index / 6);
  return {
    x1: 80 + col * 130,
    y1: 90 + row * 90,
    x2: 150 + col * 130,
    y2: 90 + row * 90,
  };
}

function createDisjointSet(size) {
  const parent = Array.from({ length: Math.max(size, 1) }, (_, index) => index);

  function find(value) {
    if (parent[value] !== value) parent[value] = find(parent[value]);
    return parent[value];
  }

  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  }

  return { find, union };
}

function interpretCircuit(data) {
  const parts = (data.parts || []).map((part, index) => ({
    ...part,
    id: part.id || `${getType(part) || "part"}-${index + 1}`,
    position: getPartPosition(part, index),
  }));

  const nodeCount = Math.max(
    data.nodes?.length || 0,
    ...parts.flatMap((part) => getNodes(part)).map((node) => Number(node) + 1).filter(Number.isFinite),
    1
  );
  const disjointSet = createDisjointSet(nodeCount);

  parts.forEach((part) => {
    const nodes = getNodes(part);
    if (["wire", "line"].includes(getType(part)) && nodes.length >= 2) {
      disjointSet.union(Number(nodes[0]), Number(nodes[1]));
    }
  });

  const nodeGroups = new Map();
  parts.forEach((part) => {
    getNodes(part).forEach((node) => {
      const root = disjointSet.find(Number(node));
      if (!nodeGroups.has(root)) nodeGroups.set(root, []);
      nodeGroups.get(root).push(part.id);
    });
  });

  const typeCounts = parts.reduce((counts, part) => {
    const type = getType(part) || "unknown";
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

  const digitalTypes = /and gate|or gate|xor gate|not gate|logic input|seven segment|flip|clock|xml:/;
  const analogTypes = /resistor|capacitor|inductor|diode|led|voltage|current|ground|transistor|op amp/;
  const hasDigital = parts.some((part) => digitalTypes.test(getType(part)));
  const hasAnalog = parts.some((part) => analogTypes.test(getType(part)));
  const kind = hasDigital && hasAnalog ? "Mixto" : hasDigital ? "Digital" : hasAnalog ? "Analógico" : "Desconocido";

  const connectedNodeCount = nodeGroups.size;
  const floatingGroups = Array.from(nodeGroups.entries()).filter(([, members]) => members.length === 1);
  const warnings = [];

  if (floatingGroups.length) {
    warnings.push(`${floatingGroups.length} nodo(s) quedan conectados a un solo terminal tras unir cables.`);
  }

  if (parts.some((part) => /led|seven segment/.test(getType(part))) && !parts.some((part) => /resistor/.test(getType(part)))) {
    warnings.push("Hay LED/display sin resistencias detectadas en la red importada.");
  }

  if (hasDigital && !parts.some((part) => /logic input|voltage source|switch/.test(getType(part)))) {
    warnings.push("Se detecta lógica digital, pero no entradas claras.");
  }

  return {
    ...data,
    parts,
    interpretation: {
      format: data.format || "json",
      kind,
      componentCount: parts.length,
      originalNodeCount: data.nodes?.length || nodeCount,
      connectedNodeCount,
      wireCount: parts.filter((part) => ["wire", "line"].includes(getType(part))).length,
      typeCounts,
      warnings,
    },
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderCircuitSummary(data) {
  const info = data.interpretation;
  circuitKindBadge.textContent = info.kind;
  circuitSummary.innerHTML = `
    <div class="summary-pill">Componentes: ${info.componentCount}</div>
    <div class="summary-pill">Nodos unidos: ${info.connectedNodeCount}</div>
    <div class="summary-pill">Formato: ${info.format}</div>
  `;
}

function renderCircuitPreview(data) {
  const parts = data.parts || [];
  if (!parts.length) {
    circuitPreview.innerHTML = '<div class="empty-preview">No hay componentes para visualizar.</div>';
    return;
  }

  const positions = parts.map((part, index) => getPartPosition(part, index));
  const minX = Math.min(...positions.flatMap((position) => [position.x1, position.x2]));
  const minY = Math.min(...positions.flatMap((position) => [position.y1, position.y2]));
  const maxX = Math.max(...positions.flatMap((position) => [position.x1, position.x2]));
  const maxY = Math.max(...positions.flatMap((position) => [position.y1, position.y2]));
  const padding = 48;
  const width = Math.max(620, maxX - minX + padding * 2);
  const height = Math.max(280, maxY - minY + padding * 2);
  const offsetX = padding - minX;
  const offsetY = padding - minY;

  const wireMarkup = [];
  const partMarkup = [];
  const nodeMarkup = [];
  const seenNodes = new Set();

  parts.forEach((part, index) => {
    const type = getType(part);
    const position = getPartPosition(part, index);
    const x1 = position.x1 + offsetX;
    const y1 = position.y1 + offsetY;
    const x2 = position.x2 + offsetX;
    const y2 = position.y2 + offsetY;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const label = escapeHtml(type.replace("circuitjs:", "").replace("xml:", "") || "part");

    [`${x1},${y1}`, `${x2},${y2}`].forEach((key) => {
      if (!seenNodes.has(key)) {
        seenNodes.add(key);
        nodeMarkup.push(`<circle class="preview-node" cx="${key.split(",")[0]}" cy="${key.split(",")[1]}" r="4" />`);
      }
    });

    if (["wire", "line"].includes(type)) {
      wireMarkup.push(`<line class="preview-wire" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`);
      return;
    }

    const className = /and gate|or gate|xor gate|not gate|logic input/.test(type)
      ? "preview-part digital"
      : /led|seven segment/.test(type)
        ? "preview-part output"
        : "preview-part";

    partMarkup.push(`
      <line class="preview-wire" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" opacity="0.35" />
      <rect class="${className}" x="${midX - 34}" y="${midY - 16}" width="68" height="32" rx="8" />
      <text class="preview-label" x="${midX}" y="${midY + 4}" text-anchor="middle">${label}</text>
    `);
  });

  circuitPreview.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Vista previa del circuito interpretado">
      ${wireMarkup.join("")}
      ${partMarkup.join("")}
      ${nodeMarkup.join("")}
    </svg>
  `;
}

function analyzeInterpretation(data) {
  const info = data.interpretation;
  const typeSummary = Object.entries(info.typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([type, count]) => `${type}: ${count}`)
    .join(", ");

  const details = [
    `Tipo probable: ${info.kind}.`,
    `Componentes: ${info.componentCount}; nodos eléctricos tras unir cables: ${info.connectedNodeCount}.`,
    typeSummary ? `Componentes principales: ${typeSummary}.` : "No hay tipos principales para resumir.",
    ...info.warnings,
  ];

  return [{ type: "complete", title: "Circuito interpretado", details, meta: "Motor Nebula" }];
}

function buildPrompt(data) {
  return [
    "Eres Nebula AI, asistente técnico para análisis de circuitos exportados desde CircuitJS1.",
    modes[selectedMode].prompt,
    "Devuelve una respuesta en español con secciones claras. Usa bullets breves y accionables.",
    "Nebula ya interpretó el circuito; usa el resumen y la red normalizada para razonar.",
    "Circuito normalizado:",
    JSON.stringify(data, null, 2),
  ].join("\n\n");
}

function addResult(results, type, title, details, meta = "Análisis local") {
  if (details.length) {
    results.push({ type, title, details, meta });
  }
}

function analyzeBasic(data) {
  const results = [];
  const errors = [];
  const parts = data.parts || [];

  if (!parts.length) {
    errors.push("No se detectaron componentes. Revisa que el JSON incluya `parts`, `elements` o `components`.");
  }

  const nodeUse = new Map();
  parts.forEach((part, index) => {
    const nodes = getNodes(part);
    if (nodes.length < 2) {
      errors.push(`El componente ${index + 1} (${getType(part) || "sin tipo"}) no tiene dos nodos definidos.`);
    }
    nodes.forEach((node) => nodeUse.set(node, (nodeUse.get(node) || 0) + 1));
  });

  const looseNodes = Array.from(nodeUse.entries()).filter(([, count]) => count === 1);
  if (looseNodes.length) {
    errors.push(`Hay ${looseNodes.length} nodo(s) con una sola conexión: posible conexión faltante.`);
  }

  const directWires = parts.filter((part) => ["wire", "line"].includes(getType(part)) && getNodes(part).length >= 2);
  if (directWires.length >= 3) {
    errors.push("Se detectan varias conexiones directas por cable. Verifica que no unan alimentación y tierra accidentalmente.");
  }

  const polarityParts = parts.filter((part) => /diode|led|electrolytic|polarized/.test(getType(part)));
  if (polarityParts.some((part) => !part.polarity || String(part.polarity).toLowerCase() === "unknown")) {
    errors.push("Hay componentes polarizados sin orientación confirmada. Revisa ánodo/cátodo o terminal positivo/negativo.");
  }

  addResult(results, "error", "Errores comunes detectados", errors);
  return results;
}

function analyzeAdvanced(data) {
  const results = [];
  const suggestions = [];
  const parts = data.parts || [];
  const resistors = parts.filter((part) => getType(part).includes("resistor"));
  const leds = parts.filter((part) => getType(part).includes("led"));

  resistors.forEach((resistor, index) => {
    const ohms = parseResistance(resistor.value);
    if (ohms !== null && ![100, 220, 330, 470, 1000, 4700, 10000, 47000, 100000].includes(Math.round(ohms))) {
      suggestions.push(`Resistor ${index + 1}: considera un valor estándar cercano para facilitar prototipo y reemplazo.`);
    }
  });

  if (leds.length && resistors.length < leds.length) {
    suggestions.push("Cada LED debería tener una resistencia limitadora dedicada para evitar sobrecorriente.");
  }

  if (parts.some((part) => /divider|potentiometer/.test(getType(part)))) {
    suggestions.push("Si buscas una salida estable, evalúa un regulador DC en lugar de un divisor resistivo.");
  }

  if (!parts.some((part) => /capacitor/.test(getType(part)))) {
    suggestions.push("Agrega condensadores de desacoplo cerca de ICs o reguladores para mejorar estabilidad.");
  }

  if (parts.some((part) => /voltage source|battery|supply/.test(getType(part))) && !parts.some((part) => /switch|fuse|protection/.test(getType(part)))) {
    suggestions.push("Considera protección básica de entrada: interruptor, fusible o diodo de polaridad inversa.");
  }

  if (parts.some((part) => /and gate|or gate|xor gate|not gate|logic input|seven segment/.test(getType(part)))) {
    suggestions.push("En lógica digital, etiqueta entradas y salidas para que el diagnóstico pueda explicar mejor la tabla de verdad.");
  }

  if (parts.some((part) => /seven segment/.test(getType(part))) && !parts.some((part) => /resistor/.test(getType(part)))) {
    suggestions.push("Un display de 7 segmentos normalmente necesita resistencias limitadoras por segmento o un driver dedicado.");
  }

  if (!suggestions.length && parts.length) {
    suggestions.push("La topología no muestra mejoras obvias con el análisis local. LM Studio puede hacer una revisión más contextual.");
  }

  addResult(results, "suggestion", "Sugerencias de diseño", suggestions);
  return results;
}

function analyzeComplete(data) {
  const combined = [...analyzeBasic(data), ...analyzeAdvanced(data)];
  if (!combined.length) {
    return [{
      type: "complete",
      title: "Circuito saludable",
      details: ["No se detectaron problemas inmediatos en el análisis local."],
      meta: "Análisis local",
    }];
  }
  return combined;
}

function renderResults(results) {
  analysisPanel.innerHTML = "";

  if (!results.length) {
    analysisPanel.innerHTML = `
      <div class="empty-state">
        <strong>Sin hallazgos</strong>
        <p>El circuito no generó alertas para este modo.</p>
      </div>
    `;
    return;
  }

  const icons = { error: "⚠", suggestion: "✦", complete: "✓" };
  results.forEach((item) => {
    const card = document.createElement("article");
    card.className = `result-card ${item.type}`;

    const title = document.createElement("h3");
    title.textContent = `${icons[item.type] || "•"} ${item.title}`;

    const meta = document.createElement("p");
    meta.className = "result-meta";
    meta.textContent = item.meta || modes[selectedMode].label;

    const list = document.createElement("ul");
    item.details.forEach((detail) => {
      const li = document.createElement("li");
      li.textContent = detail;
      list.appendChild(li);
    });

    card.append(title, meta, list);
    analysisPanel.appendChild(card);
  });
}

function parseLmStudioText(data) {
  const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text;
  if (!content) return null;
  return [{
    type: selectedMode === "advanced" ? "suggestion" : selectedMode === "basic" ? "error" : "complete",
    title: "Respuesta de LM Studio",
    details: content.split("\n").map((line) => line.replace(/^[-*]\s*/, "").trim()).filter(Boolean),
    meta: "LM Studio",
  }];
}

async function analyzeWithLmStudio(data) {
  const response = await fetch(lmEndpoint.value, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: lmModel.value || "local-model",
      messages: [
        { role: "system", content: "Eres Nebula AI, experto en electrónica y protoboard. Responde siempre en español." },
        { role: "user", content: buildPrompt(data) },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`LM Studio respondió con estado ${response.status}.`);
  }

  const payload = await response.json();
  return parseLmStudioText(payload) || [];
}

function runLocalAnalysis(data) {
  const interpretation = analyzeInterpretation(data);
  if (selectedMode === "basic") return [...interpretation, ...analyzeBasic(data)];
  if (selectedMode === "advanced") return [...interpretation, ...analyzeAdvanced(data)];
  return [...interpretation, ...analyzeComplete(data)];
}

async function handleAnalyze() {
  try {
    const parsed = interpretCircuit(parseCircuitInput(circuitJson.value));
    renderCircuitSummary(parsed);
    renderCircuitPreview(parsed);
    renderResults([{
      type: "complete",
      title: "Analizando circuito",
      details: [useLmStudio.checked ? "Consultando LM Studio..." : "Ejecutando diagnóstico local..."],
      meta: modes[selectedMode].label,
    }]);

    if (useLmStudio.checked) {
      try {
        const aiResults = await analyzeWithLmStudio(parsed);
        renderResults(aiResults.length ? aiResults : runLocalAnalysis(parsed));
        return;
      } catch (error) {
        const localResults = runLocalAnalysis(parsed);
        localResults.unshift({
          type: "error",
          title: "LM Studio no respondió",
          details: [`${error.message} Se muestra análisis local de respaldo.`],
          meta: "Conexión IA",
        });
        renderResults(localResults);
        return;
      }
    }

    renderResults(runLocalAnalysis(parsed));
  } catch (error) {
    renderResults([{ type: "error", title: "No se pudo analizar", details: [error.message], meta: "Validación" }]);
  }
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

modeCards.forEach((card) => card.addEventListener("click", () => setMode(card.dataset.mode)));
analyzeButton.addEventListener("click", handleAnalyze);

sampleButton.addEventListener("click", () => {
  circuitJson.value = JSON.stringify(sampleCircuit, null, 2);
  showToast("Demo cargada.");
});

downloadButton.addEventListener("click", () => downloadJson("nebula-circuit-template.json", sampleCircuit));

copyPromptButton.addEventListener("click", async () => {
  try {
    const parsed = interpretCircuit(parseCircuitInput(circuitJson.value));
    await navigator.clipboard.writeText(buildPrompt(parsed));
    showToast("Prompt copiado al portapapeles.");
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelectorAll("[data-export]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.export === "json") {
      try {
        const data = circuitJson.value.trim() ? interpretCircuit(parseCircuitInput(circuitJson.value)) : interpretCircuit(sampleCircuit);
        downloadJson("nebula-current-circuit.json", data);
      } catch (error) {
        showToast(error.message);
      }
      return;
    }
    showToast(`Exportación ${button.dataset.export.toUpperCase()} preparada para la siguiente etapa.`);
  });
});

setMode("basic");
