import { useMemo, useState } from 'react';

/**
 * Provides combined text-search and single-field filter logic for a list.
 *
 * @template T
 * @param {T[]} data              - Source array.
 * @param {string[]} searchFields - Object keys to include in text search.
 * @param {Object}  filterDefs    - Map of { filterKey: dataKey } for select filters.
 * @returns {{
 *   filtered:      T[],
 *   searchQuery:   string,
 *   setSearchQuery: Function,
 *   filterValues:  Object,
 *   setFilterValue: Function,
 *   resetFilters:  Function,
 * }}
 */
export function useTableFilter(data, searchFields = [], filterDefs = {}) {
  const [searchQuery,  setSearchQuery]  = useState('');
  const [filterValues, setFilterValues] = useState({});

  function setFilterValue(key, value) {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }

  function resetFilters() {
    setSearchQuery('');
    setFilterValues({});
  }

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return data.filter((row) => {
      // Text search across specified fields
      const matchesSearch =
        !query ||
        searchFields.some((field) =>
          String(row[field] ?? '').toLowerCase().includes(query)
        );

      // Dropdown filter matching
      const matchesFilters = Object.entries(filterDefs).every(([filterKey, dataKey]) => {
        const selected = filterValues[filterKey];
        return !selected || String(row[dataKey]).toLowerCase() === selected.toLowerCase();
      });

      return matchesSearch && matchesFilters;
    });
  }, [data, searchQuery, searchFields, filterDefs, filterValues]);

  return {
    filtered,
    searchQuery,
    setSearchQuery,
    filterValues,
    setFilterValue,
    resetFilters,
  };
}
