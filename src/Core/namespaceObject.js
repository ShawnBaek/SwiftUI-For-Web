/**
 * Builds a plain object with one read-only, enumerable getter per string
 * export of a module namespace (skipping `default`). The library entries use
 * it to make their default export from the same list as their named exports.
 *
 * @param {object} namespace - A module namespace object
 * @returns {object}
 */
export function namespaceObject(namespace) {
  const object = {};
  for (const key of Reflect.ownKeys(namespace)) {
    if (typeof key !== 'string' || key === 'default') continue;
    Object.defineProperty(object, key, {
      enumerable: true,
      get: () => namespace[key],
    });
  }
  return object;
}
