/**
 * Stub for ``softDeletionSliceFilter``. In non-plugin builds the soft-deletion
 * concept does not exist, so this is a pass-through that leaves the slice list
 * unchanged.
 */
export function filterSoftDeletedSlices<T>(slices: T[]): T[] {
  return slices;
}
