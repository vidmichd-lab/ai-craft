export type AuditActor = {
  id?: string | null;
  email?: string | null;
  role?: string | null;
};

export const auditLog = (payload: {
  action: string;
  actor?: AuditActor | null;
  teamId?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) => {
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      scope: 'audit',
      action: payload.action,
      actorId: payload.actor?.id || null,
      actorEmail: payload.actor?.email || null,
      actorRole: payload.actor?.role || null,
      teamId: payload.teamId || null,
      targetId: payload.targetId || null,
      metadata: payload.metadata || {}
    })
  );
};
