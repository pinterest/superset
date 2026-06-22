/**
 * Identifiers for the Warden anomaly detection algorithms exposed in Superset.
 *
 * Kept in a dependency-free module so both the control panel section and the
 * post-processing operator can share it without pulling in heavier imports.
 */
export enum AnomalyDetectionAlgorithm {
  IsolationForest = 'isolation_forest',
  ZScore = 'z_score',
}
