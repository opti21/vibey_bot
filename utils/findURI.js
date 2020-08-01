module.export = function (object, property, value) {
  return (
    object[property] === value ||
    Object.keys(object).some(function (k) {
      return (
        object[k] &&
        typeof object[k] === 'object' &&
        findURI(object[k], property, value)
      );
    })
  );
};
