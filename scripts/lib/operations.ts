// Multi-agent operations: a named flow of agents (steps) linked by arrows. An
// arrow passes the files one agent delivers (its outputs) to the next agent,
// either right away or after the user's approval. An arrow may hold a result
// ("when"): the operation follows it only when the agent ends with that result
// (an arrow without one is taken otherwise). Arrows may go back to an earlier
// step (a loop), up to maxRounds times per step. Inputs of a step that no arrow
// answers are asked when the operation starts (the initial form). Stored in
// workspace/library/operations/<id>.json (the user's, never versioned). One step
// runs at a time: no steps in parallel.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, SLUG, workspaceDir } from './repo.mjs';
import type { AgentContract } from './agents.ts';

export const GATES = ['auto', 'approval'] as const; // auto: the next step starts on its own; approval: after the user's OK
export const FROM_FORM = ''; // a link's map value for an input asked in the initial form instead
export const MAX_ROUNDS = 10;

export interface OperationStep { id: string; agent: string; x: number; y: number }
// map: input of the next step -> output (file name) of this step that answers it, or FROM_FORM.
// when: the result of this step that leads here ('' = always, or otherwise when other arrows hold results).
export interface OperationLink { from: string; to: string; gate: string; map: Record<string, string>; when: string }
// A lane: a named, coloured band of the board, left to right, to show the phases. Visual only: the arrows set the order.
export interface OperationLane { id: string; name: string; color: string; width: number }
export interface Operation {
  schemaVersion: 1; id: string; name: string; description: string;
  start: string; // the first step ('' = the one no arrow leads to)
  maxRounds: number; // how many times one step may run (loops)
  lanes: OperationLane[]; steps: OperationStep[]; links: OperationLink[];
}

// An agent an operation can use: from the library or installed for every project. key = "<source>:<name>".
export interface OperationAgent extends AgentContract { key: string; name: string; source: 'library' | 'global'; description: string; access: string }

export interface InitialInput { step: string; agent: string; input: string }
// A message in English with {placeholders}: the app translates the text and fills in the params.
export interface CheckMessage { text: string; params: Record<string, string> }
export const formatMessage = (m: CheckMessage): string => m.text.replace(/\{(\w+)\}/g, (all, k: string) => m.params[k] ?? all);
export interface OperationCheck {
  errors: CheckMessage[]; // the operation cannot be saved
  warnings: CheckMessage[]; // saved, but it will not run well until fixed
  start: string; // the first step
  order: string[]; // the steps reached from the first one, in order (arrows first, then their targets)
  initialInputs: InitialInput[]; // asked when it starts
  approvals: string[]; // steps that wait for the user before starting (an approval arrow, or an MCP that executes)
}

export const operationsDir = (root = ROOT): string => join(workspaceDir(root), 'library', 'operations');
const STEP_ID = /^s[0-9]{1,4}$/;
const LANE_ID = /^l[0-9]{1,4}$/;
const COLOR = /^#[0-9a-f]{6}$/i;
const MAX_STEPS = 30;
const MAX_LANES = 12;

// The outputs of an agent that answer an input, by shared words (e.g. "Test cases" ~ "test-cases.xlsx").
export function suggestOutput(input: string, outputs: string[]): string {
  const words = (s: string) => new Set(s.toLowerCase().replace(/\.[a-z0-9*]+$/, '').split(/[^a-z0-9]+/).filter((w) => w.length > 2));
  const want = words(input);
  let best = '';
  let score = 0;
  for (const o of outputs) {
    const shared = [...words(o)].filter((w) => want.has(w)).length;
    if (shared > score) { best = o; score = shared; }
  }
  return best;
}

// The first step: the chosen one, or the first that no arrow leads to.
export const startOf = (op: Operation): string => (op.steps.some((s) => s.id === op.start) ? op.start
  : op.steps.find((s) => !op.links.some((l) => l.to === s.id))?.id ?? op.steps[0]?.id ?? '');

// The arrow to follow when a step ends with a result: the one holding it, or the one without a result.
export function nextLink(links: OperationLink[], from: string, outcome: string): OperationLink | undefined {
  const out = links.filter((l) => l.from === from);
  const wanted = outcome.trim().toLowerCase();
  return out.find((l) => l.when && l.when.toLowerCase() === wanted) ?? out.find((l) => !l.when);
}

// Structure first (what a saved file must be), then the paths, then what will not run well.
export function checkOperation(op: Operation, agents: OperationAgent[]): OperationCheck {
  const errors: CheckMessage[] = [];
  const warnings: CheckMessage[] = [];
  const err = (text: string, params: Record<string, string> = {}) => errors.push({ text, params });
  const warn = (text: string, params: Record<string, string> = {}) => warnings.push({ text, params });
  const byKey = new Map(agents.map((a) => [a.key, a]));
  const steps = new Map(op.steps.map((s) => [s.id, s]));
  const agentOf = (id: string) => byKey.get(steps.get(id)?.agent ?? '');
  const label = (id: string) => agentOf(id)?.name ?? id;

  if (!op.name.trim()) err('Give the operation a name.');
  if (op.name.length > 80) err('Keep the name under 80 characters.');
  if (op.description.length > 1000) err('Keep the description under 1000 characters.');
  if (op.steps.length > MAX_STEPS) err('An operation has at most {n} steps.', { n: String(MAX_STEPS) });
  if (steps.size !== op.steps.length) err('Two steps have the same id.');
  if (op.lanes.length > MAX_LANES) err('An operation has at most {n} lanes.', { n: String(MAX_LANES) });
  for (const l of op.lanes) {
    if (!LANE_ID.test(l.id) || !COLOR.test(l.color)) err('Invalid lane "{name}".', { name: l.name });
    if (l.name.length > 40) err('Keep lane names under 40 characters.');
  }
  for (const s of op.steps) {
    if (!STEP_ID.test(s.id)) err('Invalid step id "{id}".', { id: s.id });
    if (!byKey.has(s.agent)) err('The agent "{agent}" is not available (removed, or not usable yet).', { agent: s.agent.replace(/^\w+:/, '') });
  }
  const valid = op.links.filter((l) => steps.has(l.from) && steps.has(l.to));
  if (valid.length < op.links.length) err('An arrow points to a step that is not there.');
  const seen = new Set<string>();
  for (const l of valid) {
    if (l.from === l.to) err('{agent} cannot pass its work to itself.', { agent: label(l.from) });
    if (!(GATES as readonly string[]).includes(l.gate)) err('Arrow {from} → {to}: unknown kind "{gate}".', { from: label(l.from), to: label(l.to), gate: l.gate });
    const key = `${l.from}>${l.to}>${l.when.toLowerCase()}`;
    if (seen.has(key)) err('Two arrows from {from} to {to}.', { from: label(l.from), to: label(l.to) });
    seen.add(key);
  }

  // Out of each step: at most one arrow without a result, one arrow per result, and only results its agent declares.
  for (const s of op.steps) {
    const out = valid.filter((l) => l.from === s.id);
    const agent = agentOf(s.id);
    const outcomes = agent?.outcomes ?? [];
    if (out.filter((l) => !l.when).length > 1) err('{agent} passes its work to two steps without a result to choose between them. Give each arrow a result.', { agent: label(s.id) });
    const whens = out.filter((l) => l.when).map((l) => l.when.toLowerCase());
    for (const w of new Set(whens.filter((x, i) => whens.indexOf(x) !== i))) err('{agent} has two arrows for the result "{when}".', { agent: label(s.id), when: w });
    for (const l of out.filter((x) => x.when)) {
      if (agent && !outcomes.some((o) => o.toLowerCase() === l.when.toLowerCase())) err('Arrow {from} → {to}: "{when}" is not a result of {from}.', { from: label(l.from), to: label(l.to), when: l.when });
    }
    if (whens.length && !out.some((l) => !l.when)) {
      for (const o of outcomes.filter((x) => !whens.includes(x.toLowerCase()))) warn('If {agent} ends with "{when}", the operation ends there.', { agent: label(s.id), when: o });
    }
  }

  // The steps reached from the first one; a loop must have a way out (an arrow chosen by a result).
  const start = startOf(op);
  const order: string[] = [];
  for (const queue = start ? [start] : []; queue.length;) {
    const at = queue.shift() as string;
    if (order.includes(at)) continue;
    order.push(at);
    for (const l of valid.filter((x) => x.from === at)) if (!order.includes(l.to)) queue.push(l.to);
  }
  const loose = op.steps.filter((s) => !order.includes(s.id));
  if (loose.length) warn('Steps not linked to the others: {agents}. Link them with an arrow, or remove them.', { agents: loose.map((s) => label(s.id)).join(', ') });
  if (!op.steps.length) warn('Add the agents of the operation and link them with arrows.');
  const forced = (id: string) => { const out = valid.filter((l) => l.from === id); return out.length === 1 && !out[0].when ? out[0].to : undefined; };
  for (const s of op.steps) {
    const path = [s.id];
    for (let at = forced(s.id); at && !path.includes(at); at = forced(at)) path.push(at);
    const last = forced(path[path.length - 1]);
    if (last === s.id) { err('The arrows make a loop with no result to leave it: the operation would never end.'); break; }
  }
  if (!Number.isInteger(op.maxRounds) || op.maxRounds < 1 || op.maxRounds > MAX_ROUNDS) err('A step may run from 1 to {n} times.', { n: String(MAX_ROUNDS) });

  // Inputs: from the arrows that lead to a step, or the initial form. Outputs: a step with arrows out must deliver something.
  const initialInputs: InitialInput[] = [];
  const approvals: string[] = [];
  for (const id of order) {
    const agent = agentOf(id);
    if (!agent) continue;
    const ins = valid.filter((l) => l.to === id && order.includes(l.from));
    for (const link of ins) {
      const from = agentOf(link.from);
      for (const [input, file] of Object.entries(link.map)) {
        if (!agent.inputs.includes(input)) err('Arrow {from} → {to}: "{input}" is not an input of {to}.', { from: label(link.from), to: agent.name, input });
        else if (from && !from.outputs.includes(file)) err('Arrow {from} → {to}: "{file}" is not an output of {from}.', { from: from.name, to: agent.name, file });
      }
    }
    for (const input of agent.inputs) {
      if (id === start || ins.some((l) => !l.map[input])) initialInputs.push({ step: id, agent: agent.name, input });
    }
    if (valid.some((l) => l.from === id) && !agent.outputs.length) warn('{agent} delivers no files, so the next step receives nothing from it. Give it outputs (Settings › Agents) or make it the last step.', { agent: agent.name });
    if (ins.some((l) => l.gate === 'approval') || agent.mcps.some((m) => m.mode === 'execute')) approvals.push(id);
  }
  return { errors, warnings, start, order, initialInputs, approvals };
}

// A file from disk or from the app, reduced to the known fields (positions rounded and kept on the board).
export function cleanOperation(raw: unknown): Operation {
  const r = (raw ?? {}) as Record<string, unknown>;
  const text = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max + 1);
  const at = (v: unknown) => Math.min(Math.max(Math.round(Number(v) || 0), 0), 4000);
  const steps = (Array.isArray(r.steps) ? r.steps : []).map((s) => {
    const x = (s ?? {}) as Record<string, unknown>;
    return { id: String(x.id ?? ''), agent: String(x.agent ?? ''), x: at(x.x), y: at(x.y) };
  });
  const lanes = (Array.isArray(r.lanes) ? r.lanes : []).map((l) => {
    const x = (l ?? {}) as Record<string, unknown>;
    return { id: String(x.id ?? ''), name: text(x.name, 40), color: String(x.color ?? '').toLowerCase(), width: Math.min(Math.max(Math.round(Number(x.width) || 280), 160), 1200) };
  });
  const links = (Array.isArray(r.links) ? r.links : []).map((l) => {
    const x = (l ?? {}) as Record<string, unknown>;
    const map = x.map && typeof x.map === 'object' ? Object.fromEntries(Object.entries(x.map as Record<string, unknown>).map(([k, v]) => [String(k), String(v ?? '')]).filter(([, v]) => v !== FROM_FORM)) : {};
    return { from: String(x.from ?? ''), to: String(x.to ?? ''), gate: String(x.gate ?? 'approval'), map, when: text(x.when, 40) };
  });
  const rounds = Number(r.maxRounds ?? 3);
  return {
    schemaVersion: 1, id: String(r.id ?? ''), name: text(r.name, 80), description: String(r.description ?? '').trim().slice(0, 1001),
    start: String(r.start ?? ''), maxRounds: Number.isFinite(rounds) ? Math.round(rounds) : 3, lanes, steps, links,
  };
}

export function listOperations(root = ROOT): Operation[] {
  const dir = operationsDir(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().flatMap((f) => {
    try {
      const op = cleanOperation(JSON.parse(readFileSync(join(dir, f), 'utf8')));
      return op.id === f.slice(0, -5) && SLUG.test(op.id) ? [op] : [];
    } catch { return []; }
  });
}

// The first time operations are listed, an example to learn from (templates/operations/, in the app's language).
// Deleted, it does not come back: the folder is there from then on.
export function seedExample(root = ROOT, language = 'en'): void {
  if (existsSync(operationsDir(root))) return;
  const file = join(root, 'templates', 'operations', `example.${language === 'pt-BR' ? 'pt-BR' : 'en'}.json`);
  if (!existsSync(file)) return;
  writeOperation(cleanOperation(JSON.parse(readFileSync(file, 'utf8'))), root);
}

export function writeOperation(op: Operation, root = ROOT): void {
  if (!SLUG.test(op.id)) throw new Error(`Invalid operation id "${op.id}".`);
  mkdirSync(operationsDir(root), { recursive: true });
  writeFileSync(join(operationsDir(root), `${op.id}.json`), `${JSON.stringify(op, null, 2)}\n`, 'utf8');
}

export function removeOperation(id: string, root = ROOT): void {
  if (!SLUG.test(id)) throw new Error(`Invalid operation id "${id}".`);
  rmSync(join(operationsDir(root), `${id}.json`), { force: true });
}
