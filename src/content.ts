import { diagnose, publishDiagnostics, type DiagnosticIssue } from './core/diagnostics';
import { observeAddedContent } from './core/observer';
import { createOzonProcessor } from './sites/ozon';

const errors: DiagnosticIssue[] = [];
const process = createOzonProcessor(document, errors);
process(document);
observeAddedContent(document, process);

const report = () => publishDiagnostics(diagnose(document, errors));
report();
window.addEventListener('load', report, { once: true });

declare global {
  interface Window { __ozonAccessReport?: ReturnType<typeof diagnose>; }
}
