const directionLabel = {
  asc: 'ascending',
  desc: 'descending',
};

function SortableHeader({ label, sortKey, sortConfig, onSort, className = '' }) {
  const active = sortConfig.key === sortKey;
  const ariaSort = active ? directionLabel[sortConfig.direction] : 'none';

  return (
    <th className={`${className}${active ? ' sortable-header--active' : ''}`} aria-sort={ariaSort}>
      <button className="sortable-header__button" type="button" onClick={() => onSort(sortKey)}>
        <span>{label}</span>
        <span className={`sortable-header__indicator${active ? ' sortable-header__indicator--active' : ''}`} aria-hidden="true">
          {active ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}

export default SortableHeader;
