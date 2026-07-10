export function safeJsonStringify(obj: any): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      // Handle Firestore classes or circular references
      if (value.constructor && (
        value.constructor.name === 'Query' || 
        value.constructor.name === 'DocumentReference' || 
        value.constructor.name === 'Firestore' || 
        value.constructor.name === 'QuerySnapshot' || 
        value.constructor.name === 'DocumentSnapshot'
      )) {
        return `[Firestore ${value.constructor.name}]`;
      }
      
      // Also catch any objects that might be circular like HTML elements or Event targets
      if ('nodeType' in value || value instanceof HTMLElement) {
        return '[HTMLElement]';
      }
      
      seen.add(value);
    }
    return value;
  });
}

export function safeLocalStorageSetItem(key: string, value: any) {
  try {
    const stringified = typeof value === 'string' ? value : safeJsonStringify(value);
    localStorage.setItem(key, stringified);
  } catch (error) {
    console.error(`[LocalStorage Error] Failed to serialize or save key "${key}":`, error);
  }
}
