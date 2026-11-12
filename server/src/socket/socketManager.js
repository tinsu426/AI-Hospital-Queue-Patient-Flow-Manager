const { Server } = require('socket.io');
const events = require('./events');

let io = null;

function initSocket(server, corsOrigin) {
  io = new Server(server, {
    cors: {
      origin: corsOrigin || '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Department Room
    socket.on(events.JOIN_DEPARTMENT, (departmentId) => {
      socket.join(`department:${departmentId}`);
    });

    socket.on(events.LEAVE_DEPARTMENT, (departmentId) => {
      socket.leave(`department:${departmentId}`);
    });

    // Doctor Personal Room
    socket.on(events.JOIN_DOCTOR, (doctorId) => {
      socket.join(`doctor:${doctorId}`);
    });

    // Public TV Billboard Room
    socket.on(events.JOIN_BILLBOARD, () => {
      socket.join('billboard:public');
    });

    // Laboratory Workbench Room
    socket.on(events.JOIN_LAB, () => {
      socket.join('lab:main');
    });

    socket.on('disconnect', () => {
      // console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

// Broadcasting Helper Functions
function emitTicketCreated(ticket) {
  if (!io) return;
  io.to(`department:${ticket.department_id}`).emit(events.TICKET_CREATED, ticket);
  io.to('billboard:public').emit(events.TICKET_CREATED, {
    ticket_number: ticket.ticket_number,
    department_id: ticket.department_id,
    status: ticket.status
  });
}

function emitTicketCalled(payload) {
  if (!io) return;
  // payload: { ticket_id, ticket_number, room_number, department_name, doctor_name }
  io.to('billboard:public').emit(events.TICKET_CALLED, payload);
  if (payload.department_id) {
    io.to(`department:${payload.department_id}`).emit(events.TICKET_CALLED, payload);
  }
}

function emitQueueStatusUpdated(ticket) {
  if (!io) return;
  io.to(`department:${ticket.department_id}`).emit(events.STATUS_UPDATED, ticket);
  if (ticket.doctor_id) {
    io.to(`doctor:${ticket.doctor_id}`).emit(events.STATUS_UPDATED, ticket);
  }
  io.to('billboard:public').emit(events.STATUS_UPDATED, {
    ticket_id: ticket.id,
    ticket_number: ticket.ticket_number,
    status: ticket.status,
    room_number: ticket.room_number
  });
}

function emitPriorityEscalated(ticket) {
  if (!io) return;
  io.to(`department:${ticket.department_id}`).emit(events.PRIORITY_ESCALATED, ticket);
  if (ticket.doctor_id) {
    io.to(`doctor:${ticket.doctor_id}`).emit(events.PRIORITY_ESCALATED, ticket);
  }
}

function emitDoctorStatusChanged(doctor) {
  if (!io) return;
  io.emit(events.DOCTOR_STATUS_CHANGED, doctor);
}

function emitReferralCreated(referral) {
  if (!io) return;
  io.to('lab:main').emit(events.REFERRAL_CREATED, referral);
  if (referral.referring_doctor_id) {
    io.to(`doctor:${referral.referring_doctor_id}`).emit(events.REFERRAL_CREATED, referral);
  }
}

function emitReferralStatusUpdated(referral) {
  if (!io) return;
  io.to('lab:main').emit(events.REFERRAL_STATUS_UPDATED, referral);
  if (referral.referring_doctor_id) {
    io.to(`doctor:${referral.referring_doctor_id}`).emit(events.REFERRAL_STATUS_UPDATED, referral);
  }
}

function emitReferralCompleted(referral) {
  if (!io) return;
  io.to('lab:main').emit(events.REFERRAL_COMPLETED, referral);
  if (referral.referring_doctor_id) {
    io.to(`doctor:${referral.referring_doctor_id}`).emit(events.REFERRAL_COMPLETED, referral);
  }
}

function emitOvercrowdingAlert(alert) {
  if (!io) return;
  io.emit(events.AI_OVERCROWDING_ALERT, alert);
}

module.exports = {
  initSocket,
  getIO,
  emitTicketCreated,
  emitTicketCalled,
  emitQueueStatusUpdated,
  emitPriorityEscalated,
  emitDoctorStatusChanged,
  emitReferralCreated,
  emitReferralStatusUpdated,
  emitReferralCompleted,
  emitOvercrowdingAlert,
};
