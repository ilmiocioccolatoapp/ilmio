const { fail, text, money } = require('./http');

const optionId = (value, label) => {
  const id = text(value, label, 80);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) fail(400, label + ' must contain only letters, numbers, underscores, or hyphens.');
  return id;
};

function uniqueId(id, ids) {
  if (ids.has(id)) fail(400, 'Option identifiers must be unique within a product.');
  ids.add(id);
}

function normalizeSizes(value, ids = new Set()) {
  if (!Array.isArray(value) || value.length > 20) fail(400, 'Sizes must be a list of at most 20 entries.');
  return value.map((size, index) => {
    if (!size || typeof size !== 'object' || Array.isArray(size)) fail(400, 'Each size must include an identifier, name, and price.');
    const id = optionId(size.id, 'Size identifier');
    uniqueId(id, ids);
    return {
      id,
      name: text(size.name, 'Size name', 60),
      priceAmount: money(size.priceAmount)
    };
  });
}

function normalizeAddOnGroups(value, ids = new Set()) {
  if (!Array.isArray(value) || value.length > 20) fail(400, 'Add-on groups must be a list of at most 20 groups.');
  let optionCount = 0;
  return value.map(group => {
    if (!group || typeof group !== 'object' || Array.isArray(group)) fail(400, 'Each add-on group must include a name and options.');
    const id = optionId(group.id, 'Add-on group identifier');
    uniqueId(id, ids);
    if (!['single', 'multiple'].includes(group.selection)) fail(400, 'Add-on selection must be single or multiple.');
    if (!Array.isArray(group.options) || !group.options.length) fail(400, 'Each add-on group must have at least one option.');
    optionCount += group.options.length;
    if (optionCount > 100) fail(400, 'A product cannot have more than 100 add-on options.');
    return {
      id,
      name: text(group.name, 'Add-on group name', 60),
      selection: group.selection,
      options: group.options.map(option => {
        if (!option || typeof option !== 'object' || Array.isArray(option)) fail(400, 'Each add-on must include an identifier, name, and price.');
        const optionIdValue = optionId(option.id, 'Add-on identifier');
        uniqueId(optionIdValue, ids);
        return {
          id: optionIdValue,
          name: text(option.name, 'Add-on name', 60),
          priceAmount: money(option.priceAmount)
        };
      })
    };
  });
}

function normalizeUnavailableOptionIds(value, optionIds) {
  if (!Array.isArray(value) || value.length > optionIds.size) fail(400, 'Unavailable options must be a list of valid product option identifiers.');
  const seen = new Set();
  return value.map(valueId => {
    const id = optionId(valueId, 'Unavailable option identifier');
    if (!optionIds.has(id) || seen.has(id)) fail(400, 'Unavailable options must be unique identifiers belonging to this product.');
    seen.add(id);
    return id;
  });
}

module.exports = { normalizeSizes, normalizeAddOnGroups, normalizeUnavailableOptionIds };
