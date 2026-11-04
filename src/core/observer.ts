export type RootProcessor = (root: ParentNode) => void;

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
      for (const node of record.addedNodes) if (node instanceof Element) pending.add(node);
    }
    if (!scheduled && pending.size) {
      scheduled = true;
      queueMicrotask(flush);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return observer;
}
