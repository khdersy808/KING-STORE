export function safeJsonStringify(obj: any): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }

      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }

        // Catch Window, DOM elements, Events
        if (
          typeof window !== 'undefined' &&
          (value === window || value instanceof HTMLElement || 'nodeType' in value || ('target' in value && 'type' in value && 'preventDefault' in value))
        ) {
          return '[DOM/Event]';
        }

        // Handle Firestore Timestamps
        if (typeof value.seconds === 'number' && typeof value.toDate === 'function') {
          try {
            return value.toDate().toISOString();
          } catch (e) {
            return '[Invalid Date]';
          }
        }

        // Check if object is a plain Object, Array, or Date
        const isPlainObject = value.constructor === Object || value.constructor === undefined;
        const isArray = Array.isArray(value);
        const isDate = value instanceof Date;

        if (!isPlainObject && !isArray && !isDate) {
          // If custom object has a toJSON method, try calling it safely
          if (typeof value.toJSON === 'function') {
            try {
              return value.toJSON();
            } catch (e) {
              return '[Unserializable]';
            }
          }

          // Safe fallback string for Firebase User, DocumentReference, Snapshots, etc.
          const className = value.constructor?.name || 'Class';
          return `[Object ${className}]`;
        }

        seen.add(value);
      }
      return value;
    });
  } catch (error) {
    console.warn('[safeJsonStringify Suppressed Error]:', error);
    return '{}';
  }
}

export function safeLocalStorageSetItem(key: string, value: any) {
  try {
    const stringified = typeof value === 'string' ? value : safeJsonStringify(value);
    localStorage.setItem(key, stringified);
  } catch (error) {
    console.warn(`[LocalStorage Suppressed Error] Failed to serialize or save key "${key}":`, error);
  }
}
