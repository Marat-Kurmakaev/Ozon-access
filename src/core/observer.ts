export type RootProcessor = (root: ParentNode) => void;

const OBSERVED_ATTRIBUTES = [
  'alt', 'aria-expanded', 'aria-label', 'aria-pressed', 'aria-selected', 'checked',
  'class', 'd', 'disabled', 'href', 'role', 'src', 'tabindex', 'title', 'value',
];

function isOwnAttributeMutation(record: MutationRecord): boolean {
  if (record.type !== 'attributes' || !(record.target instanceof Element) || !record.attributeName) return false;
  if (record.attributeName === 'data-ozon-access' || record.attributeName.startsWith('data-ozon-access-')) return true;
  return record.target.hasAttribute(`data-ozon-access-${record.attributeName}`);
}

export function observeAddedContent(document: Document, process: RootProcessor): MutationObserver {
  const pending = new Set<Element>();
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    for (const element of pending) process(element);
    pending.clear();
  };
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (isOwnAttributeMutation(record)) continue;
      if (record.type === 'attributes' && record.target instanceof Element) pending.add(record.target);
      if (record.type === 'characterData' && record.target.parentElement) pending.add(record.target.parentElement);
      if (record.type === 'childList' && record.target instanceof Element) {
        pending.add(record.target);
        for (const node of record.addedNodes) if (node instanceof Element) pending.add(node);
      }
    }
    if (!scheduled && pending.size) {
      scheduled = true;
      queueMicrotask(flush);
    }
  });
  observer.observe(document.documentElement, {
    attributeFilter: OBSERVED_ATTRIBUTES,
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });
  return observer;
}
