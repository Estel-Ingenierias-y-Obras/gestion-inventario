const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export const nextSortConfig = (current, key, defaultDirection = 'asc') => ({
  key,
  direction: current.key === key
    ? (current.direction === 'asc' ? 'desc' : 'asc')
    : defaultDirection,
});

export const sortRows = (rows, sortConfig, columnTypes = {}) => {
  const type = columnTypes[sortConfig.key] || 'text';
  const factor = sortConfig.direction === 'asc' ? 1 : -1;

  return [...rows].sort((left, right) => {
    const leftValue = left[sortConfig.key];
    const rightValue = right[sortConfig.key];
    let result;

    if (type === 'number') {
      result = Number(leftValue || 0) - Number(rightValue || 0);
    } else if (type === 'date') {
      result = new Date(leftValue || 0).getTime() - new Date(rightValue || 0).getTime();
    } else {
      result = collator.compare(String(leftValue || ''), String(rightValue || ''));
    }

    if (result !== 0) return result * factor;
    return collator.compare(String(left._id || ''), String(right._id || ''));
  });
};
