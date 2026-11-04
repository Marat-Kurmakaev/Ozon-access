export type Confidence = 'confirmed' | 'strong-inference' | 'unknown';
export type Safety = 'passive' | 'confirmed-safe' | 'manual-review' | 'forbidden';

export interface SvgMetadata {
  count: number;
  title: string;
  viewBox: string;
  pathCount: number;
  signature: string;
}

export interface ElementRecord {
  id: string;
  state: string;
  frame: string;
  tag: string;
  domPath: string;
  selectors: string[];
  outerHtml: string;
  text: string;
  computedRole: string;
  computedName: string;
  computedDescription: string;
  axIgnored: boolean;
  axStates: Record<string, string | number | boolean>;
  ariaLabel: string;
  ariaLabelledby: string;
  title: string;
  alt: string;
  tabindex: number | null;
  href: string;
  svg: SvgMetadata;
  parentContext: { tag: string; widget: string; text: string };
  visible: boolean;
  disabled: boolean;
  bounds: { x: number; y: number; width: number; height: number } | null;
  focusable: boolean;
  interactiveSource: string[];
  eventListeners: string[];
  ancestorEventListeners: string[];
  componentGroup: string;
  groupFingerprint: string;
  purpose: string;
  evidence: string;
  confidence: Confidence;
  safety: Safety;
}

export interface ComponentGroup {
  id: string;
  fingerprint: string;
  count: number;
  tag: string;
  role: string;
  accessibleName: string;
  context: string;
  svg: string;
  purpose: string;
  evidence: string;
  confidence: Confidence;
  safety: Safety;
  elementIds: string[];
}

export interface KeyboardResult {
  tabStops: Array<{ order: number; id: string; tag: string; role: string; name: string }>;
  reverseStops: string[];
  repeatedFocus: string[];
  possibleTrap: boolean;
  notes: string[];
}

export interface BehaviorResult {
  mode: string;
  interactionsAllowed: boolean;
  states: Array<{ name: string; url: string; elementCount: number; axNodeCount: number; notes: string[] }>;
  interactions: Array<Record<string, unknown>>;
  network: Array<{ method: string; resourceType: string; origin: string }>;
  errors: string[];
}

export interface AuditResult {
  mode: string;
  source: string;
  generatedAt: string;
  elements: ElementRecord[];
  groups: ComponentGroup[];
  accessibilityTree: string;
  axe: Record<string, unknown>;
  keyboard: KeyboardResult;
  behavior: BehaviorResult;
  limitations: string[];
}

export interface TargetGroupObservation {
  groupId: string;
  expectedPurpose: string;
  expectedSvgSignature: string;
  matches: number;
  found: boolean;
  url: string;
  tag: string;
  domPath: string;
  outerHtml: string;
  computedRole: string;
  computedName: string;
  computedDescription: string;
  axIgnored: boolean;
  axStates: Record<string, string | number | boolean>;
  svg: { signature: string; viewBox: string; paths: string[]; title: string };
  parentContext: { tag: string; widget: string; text: string; productName: string; productPath: string };
  attributes: Record<string, string | boolean | null>;
  eventListeners: string[];
  ancestorEventListeners: Array<{ level: number; tag: string; listeners: string[] }>;
  interaction?: { attempted: boolean; safeGuard: string; urlChanged: boolean; imageChanged: boolean; before: string[]; after: string[]; error?: string };
  conclusion: string;
}

export interface TargetedAuditResult {
  mode: 'live-groups';
  generatedAt: string;
  source: string;
  requestedGroups: string[];
  arrowInteractionsAllowed: boolean;
  observations: TargetGroupObservation[];
  errors: string[];
  limitations: string[];
}
