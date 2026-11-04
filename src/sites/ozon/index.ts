import type { DiagnosticIssue } from '../../core/diagnostics';
import { improveButtons } from './buttons';
import { improveAuth } from './auth';
import { improveCart } from './cart';
import { improveFilters } from './filters';
import { improveLinks } from './links';
import { improveProducts } from './products';
import { improveStructure } from './structure';

export function createOzonProcessor(document: Document, errors: DiagnosticIssue[]): (root: ParentNode) => void {
  return (root) => {
    const rules = [
      ['auth', () => improveAuth(root)],
      ['buttons', () => improveButtons(root)],
      ['cart', () => improveCart(root)],
      ['filters', () => improveFilters(root)],
      ['products', () => improveProducts(root)],
      ['links', () => improveLinks(root)],
      ['structure', () => improveStructure(document)],
    ] as const;
    for (const [name, rule] of rules) {
      try { rule(); }
      catch (error) {
        errors.push({ kind: 'rule-error', message: `${name}: ${error instanceof Error ? error.message : String(error)}` });
      }
    }
  };
}
