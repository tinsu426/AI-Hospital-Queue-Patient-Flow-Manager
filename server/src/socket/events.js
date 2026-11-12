module.exports = {
  // Client -> Server
  JOIN_DEPARTMENT: 'join:department',
  LEAVE_DEPARTMENT: 'leave:department',
  JOIN_DOCTOR: 'join:doctor',
  JOIN_BILLBOARD: 'join:billboard',
  JOIN_LAB: 'join:lab',

  // Server -> Client
  TICKET_CREATED: 'queue:ticket-created',
  TICKET_CALLED: 'queue:ticket-called',
  STATUS_UPDATED: 'queue:status-updated',
  PRIORITY_ESCALATED: 'queue:priority-escalated',
  DOCTOR_STATUS_CHANGED: 'doctor:status-changed',
  REFERRAL_CREATED: 'referral:created',
  REFERRAL_STATUS_UPDATED: 'referral:status-updated',
  REFERRAL_COMPLETED: 'referral:completed',
  AI_OVERCROWDING_ALERT: 'ai:overcrowding-alert',
};
