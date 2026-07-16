function shallowEqual(objectA, objectB) {
  if (Object.is(objectA, objectB)) {
    return true;
  }
  if (
    typeof objectA !== "object" ||
    objectA === null ||
    typeof objectB !== "object" ||
    objectB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objectA);
  const keysB = Object.keys(objectB);
  if (keysA.length !== keysB.length) {
    return false;
  }
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (
      !Object.prototype.hasOwnProperty.call(objectB, key) ||
      !Object.is(objectA[key], objectB[key])
    ) {
      return false;
    }
  }
  return true;
}

export { shallowEqual };
