import type { RiskSeverity } from './risk-engine.service';

// ─── Input Types ────────────────────────────────────────────

export type ComplaintCategory =
  | 'CAMERA_ISSUE'
  | 'CONNECTION_LOSS'
  | 'TAB_SWITCH_FALSE_POSITIVE'
  | 'SCORE_DISPUTE'
  | 'TIME_EXTENSION'
  | 'SYSTEM_ERROR'
  | 'OTHER';

export interface SystemLogEntry {
  event_type: string;
  severity: RiskSeverity;
  risk_points: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ComplaintInput {
  complaintCategory: ComplaintCategory;
  complaintText: string;
  systemLogs: SystemLogEntry[];
  attemptMeta?: {
    riskScore: number;
    riskLevel: string;
    status: string;
    elapsedMs: number;
    timerMinutes: number;
    cameraStatus?: string;
    totalStrikes?: number;
  };
}

// ─── Output Types ───────────────────────────────────────────

export type Verdict = 'APPROVED' | 'REJECTED' | 'REVIEW';

export interface AdjudicationResult {
  verdict: Verdict;
  reason: string;
  confidence: number;
}

// ─── Constants ──────────────────────────────────────────────

const VIOLATION_EVENTS = new Set([
  'TAB_SWITCH',
  'REPEATED_TAB_SWITCH',
  'COPY_ATTEMPT',
  'PASTE_ATTEMPT',
  'PRINT_ATTEMPT',
  'MULTI_FACE',
  'FAST_COMPLETION',
  'IDENTICAL_ESSAY',
  'HIGH_ESSAY_SIMILARITY',
  'PIP_ACTIVE',
  'REPEATED_BACK_PRESS',
]);

const TECHNICAL_EVENTS = new Set([
  'SYSTEM_EVENT',
  'WINDOW_BLUR',
  'OVERLAY_INDICATION',
]);

const CAMERA_EVENTS = new Set(['NO_FACE', 'MULTI_FACE']);

const CONNECTION_INDICATORS = ['RECOVERY', 'HEALTH_CHECK', 'reconnect', 'timeout', 'network'];

// ─── Core Engine ────────────────────────────────────────────

export function adjudicateComplaint(input: ComplaintInput): AdjudicationResult {
  const { complaintCategory, systemLogs, attemptMeta } = input;

  switch (complaintCategory) {
    case 'CAMERA_ISSUE':
      return adjudicateCameraIssue(systemLogs, attemptMeta);
    case 'CONNECTION_LOSS':
      return adjudicateConnectionLoss(systemLogs, attemptMeta);
    case 'TAB_SWITCH_FALSE_POSITIVE':
      return adjudicateTabSwitch(systemLogs, attemptMeta);
    case 'SCORE_DISPUTE':
      return adjudicateScoreDispute(systemLogs, attemptMeta);
    case 'TIME_EXTENSION':
      return adjudicateTimeExtension(systemLogs, attemptMeta);
    case 'SYSTEM_ERROR':
      return adjudicateSystemError(systemLogs, attemptMeta);
    default:
      return adjudicateGeneric(systemLogs, attemptMeta);
  }
}

// ─── Category Handlers ──────────────────────────────────────

function adjudicateCameraIssue(
  logs: SystemLogEntry[],
  meta?: ComplaintInput['attemptMeta']
): AdjudicationResult {
  const cameraLogs = logs.filter(l => CAMERA_EVENTS.has(l.event_type));
  const noFaceLogs = cameraLogs.filter(l => l.event_type === 'NO_FACE');
  const multiFaceLogs = cameraLogs.filter(l => l.event_type === 'MULTI_FACE');

  if (multiFaceLogs.length > 0) {
    return {
      verdict: 'REJECTED',
      reason: `MULTI_FACE detected ${multiFaceLogs.length} time(s). Multiple faces indicate unauthorized assistance, not a camera malfunction.`,
      confidence: 90,
    };
  }

  if (noFaceLogs.length === 0) {
    return {
      verdict: 'REJECTED',
      reason: 'No camera-related events found in logs. Claim unsupported by system data.',
      confidence: 85,
    };
  }

  // Check if NO_FACE events are clustered (likely a genuine camera glitch)
  const clustered = areEventsClustered(noFaceLogs, 30_000);
  const hasOtherViolations = logs.some(l => VIOLATION_EVENTS.has(l.event_type) && !CAMERA_EVENTS.has(l.event_type));

  if (clustered && !hasOtherViolations) {
    return {
      verdict: 'APPROVED',
      reason: `NO_FACE events are clustered (${noFaceLogs.length} events in short window), consistent with temporary camera failure. No other violations detected.`,
      confidence: 80,
    };
  }

  if (clustered && hasOtherViolations) {
    return {
      verdict: 'REVIEW',
      reason: `Camera events appear clustered but other violations exist in the log. Manual review required.`,
      confidence: 55,
    };
  }

  return {
    verdict: 'REJECTED',
    reason: `NO_FACE events (${noFaceLogs.length}) are spread across the session, inconsistent with a single camera failure.`,
    confidence: 75,
  };
}

function adjudicateConnectionLoss(
  logs: SystemLogEntry[],
  meta?: ComplaintInput['attemptMeta']
): AdjudicationResult {
  const connectionLogs = logs.filter(l =>
    CONNECTION_INDICATORS.some(keyword =>
      l.event_type.toLowerCase().includes(keyword) ||
      JSON.stringify(l.metadata || {}).toLowerCase().includes(keyword)
    ) || l.event_type === 'SYSTEM_EVENT'
  );

  const totalViolations = logs.filter(l => VIOLATION_EVENTS.has(l.event_type));

  if (connectionLogs.length >= 2 && totalViolations.length === 0) {
    return {
      verdict: 'APPROVED',
      reason: `${connectionLogs.length} connection/recovery events found with zero violation events. Consistent with genuine network disruption.`,
      confidence: 85,
    };
  }

  if (connectionLogs.length >= 2 && totalViolations.length <= 2) {
    return {
      verdict: 'REVIEW',
      reason: `Connection events present (${connectionLogs.length}) but ${totalViolations.length} violation(s) also logged. Cannot conclusively determine cause.`,
      confidence: 50,
    };
  }

  if (connectionLogs.length === 0 && totalViolations.length > 0) {
    return {
      verdict: 'REJECTED',
      reason: `No connection-related events in logs. ${totalViolations.length} violation event(s) present. Claim contradicts system data.`,
      confidence: 90,
    };
  }

  return {
    verdict: 'REVIEW',
    reason: 'Insufficient log data to confirm or deny connection loss. Manual review required.',
    confidence: 40,
  };
}

function adjudicateTabSwitch(
  logs: SystemLogEntry[],
  meta?: ComplaintInput['attemptMeta']
): AdjudicationResult {
  const tabLogs = logs.filter(l =>
    l.event_type === 'TAB_SWITCH' || l.event_type === 'REPEATED_TAB_SWITCH'
  );
  const blurLogs = logs.filter(l => l.event_type === 'WINDOW_BLUR');
  const overlayLogs = logs.filter(l => l.event_type === 'OVERLAY_INDICATION');

  if (tabLogs.length === 0) {
    return {
      verdict: 'REJECTED',
      reason: 'No tab switch events found in logs. Complaint has no basis in system data.',
      confidence: 90,
    };
  }

  // Single blur event with no tab switch could be a system notification
  if (tabLogs.length === 1 && blurLogs.length <= 1 && overlayLogs.length === 0) {
    const otherViolations = logs.filter(l =>
      VIOLATION_EVENTS.has(l.event_type) && l.event_type !== 'TAB_SWITCH'
    );
    if (otherViolations.length === 0) {
      return {
        verdict: 'APPROVED',
        reason: 'Single tab switch with no other violations. Consistent with accidental focus loss or system notification.',
        confidence: 70,
      };
    }
  }

  if (tabLogs.length >= 3) {
    return {
      verdict: 'REJECTED',
      reason: `${tabLogs.length} tab switch events recorded. Pattern indicates intentional navigation away from exam.`,
      confidence: 85,
    };
  }

  return {
    verdict: 'REVIEW',
    reason: `${tabLogs.length} tab switch event(s) detected. Insufficient data for automated ruling.`,
    confidence: 50,
  };
}

function adjudicateScoreDispute(
  logs: SystemLogEntry[],
  meta?: ComplaintInput['attemptMeta']
): AdjudicationResult {
  if (!meta) {
    return {
      verdict: 'REVIEW',
      reason: 'No attempt metadata provided. Cannot evaluate score validity without context.',
      confidence: 30,
    };
  }

  const cheatingFlags = logs.filter(l => VIOLATION_EVENTS.has(l.event_type));
  const isCheated = meta.status === 'CHEATED' || meta.riskLevel === 'AUTO_FLAGGED';
  const isFailedEffort = meta.status === 'FAILED_EFFORT';

  if (isCheated && cheatingFlags.length >= 3) {
    return {
      verdict: 'REJECTED',
      reason: `Score set to 0 due to ${cheatingFlags.length} violation events. Risk level: ${meta.riskLevel}, risk score: ${meta.riskScore}. System flagging is justified.`,
      confidence: 95,
    };
  }

  if (isFailedEffort) {
    const tooFast = meta.elapsedMs < 5 * 60 * 1000;
    return {
      verdict: 'REJECTED',
      reason: `Status FAILED_EFFORT: ${tooFast ? 'completed in under 5 minutes' : 'insufficient answer quality'}. Scoring rules applied correctly.`,
      confidence: 90,
    };
  }

  if (isCheated && cheatingFlags.length <= 1) {
    return {
      verdict: 'REVIEW',
      reason: `Status is ${meta.status} but only ${cheatingFlags.length} violation event(s) in logs. Possible edge case — teacher review recommended.`,
      confidence: 45,
    };
  }

  return {
    verdict: 'REVIEW',
    reason: 'Score dispute requires manual comparison of answers and scoring rubric. Automated adjudication not applicable.',
    confidence: 35,
  };
}

function adjudicateTimeExtension(
  logs: SystemLogEntry[],
  meta?: ComplaintInput['attemptMeta']
): AdjudicationResult {
  if (!meta) {
    return {
      verdict: 'REVIEW',
      reason: 'No attempt metadata. Cannot evaluate time claim.',
      confidence: 30,
    };
  }

  const connectionLogs = logs.filter(l =>
    l.event_type === 'SYSTEM_EVENT' ||
    CONNECTION_INDICATORS.some(k => JSON.stringify(l.metadata || {}).toLowerCase().includes(k))
  );

  const elapsedMinutes = Math.round(meta.elapsedMs / 60_000);
  const allocatedMinutes = meta.timerMinutes;
  const usedRatio = elapsedMinutes / allocatedMinutes;

  if (connectionLogs.length >= 3 && usedRatio < 0.5) {
    return {
      verdict: 'APPROVED',
      reason: `Student used ${elapsedMinutes}/${allocatedMinutes} min with ${connectionLogs.length} connection disruptions. Time loss corroborated by logs.`,
      confidence: 75,
    };
  }

  if (usedRatio >= 0.8) {
    return {
      verdict: 'REJECTED',
      reason: `Student used ${elapsedMinutes}/${allocatedMinutes} min (${Math.round(usedRatio * 100)}% of allocated time). No significant time loss.`,
      confidence: 85,
    };
  }

  return {
    verdict: 'REVIEW',
    reason: `Used ${elapsedMinutes}/${allocatedMinutes} min with ${connectionLogs.length} system event(s). Manual verification needed.`,
    confidence: 45,
  };
}

function adjudicateSystemError(
  logs: SystemLogEntry[],
  meta?: ComplaintInput['attemptMeta']
): AdjudicationResult {
  const systemLogs = logs.filter(l => l.event_type === 'SYSTEM_EVENT' || l.risk_points === 0);
  const violationLogs = logs.filter(l => VIOLATION_EVENTS.has(l.event_type));

  if (systemLogs.length > 0 && violationLogs.length === 0) {
    return {
      verdict: 'APPROVED',
      reason: `${systemLogs.length} system event(s) with zero violations. Evidence supports a genuine system-side issue.`,
      confidence: 80,
    };
  }

  if (systemLogs.length === 0) {
    return {
      verdict: 'REJECTED',
      reason: 'No system-level events recorded. Logs show normal exam activity only.',
      confidence: 85,
    };
  }

  return {
    verdict: 'REVIEW',
    reason: `${systemLogs.length} system event(s) and ${violationLogs.length} violation(s) coexist. Cannot separate system error from user behavior.`,
    confidence: 45,
  };
}

function adjudicateGeneric(
  logs: SystemLogEntry[],
  meta?: ComplaintInput['attemptMeta']
): AdjudicationResult {
  const violationLogs = logs.filter(l => VIOLATION_EVENTS.has(l.event_type));
  const totalRisk = logs.reduce((sum, l) => sum + l.risk_points, 0);

  if (violationLogs.length === 0 && totalRisk === 0) {
    return {
      verdict: 'REVIEW',
      reason: 'No violations in logs but complaint category is unstructured. Requires manual evaluation.',
      confidence: 40,
    };
  }

  if (totalRisk >= 90) {
    return {
      verdict: 'REJECTED',
      reason: `Cumulative risk score ${totalRisk} (threshold: 90). ${violationLogs.length} violation event(s) recorded. Logs contradict claim.`,
      confidence: 85,
    };
  }

  return {
    verdict: 'REVIEW',
    reason: `Risk score ${totalRisk} with ${violationLogs.length} violation(s). Complaint does not match a known pattern — manual review needed.`,
    confidence: 45,
  };
}

// ─── Utility ────────────────────────────────────────────────

function areEventsClustered(logs: SystemLogEntry[], windowMs: number): boolean {
  if (logs.length < 2) return true;

  const timestamps = logs
    .map(l => new Date(l.created_at).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => a - b);

  if (timestamps.length < 2) return true;

  const span = timestamps[timestamps.length - 1] - timestamps[0];
  return span <= windowMs;
}
