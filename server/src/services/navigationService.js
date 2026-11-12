const db = require('../config/db');

/**
 * Hospital Navigation Service
 * Computes shortest clinical routes, waypoint paths, and step-by-step text guidance
 */

async function getDepartmentDirectory() {
  const query = `
    SELECT 
      d.id, d.code, d.name, d.description, d.average_service_time_minutes,
      d.floor_number, d.wing, d.room_number, d.map_x, d.map_y,
      COUNT(CASE WHEN qt.status = 'WAITING' AND qt.issued_at::DATE = CURRENT_DATE THEN 1 END) as waiting_count,
      COUNT(DISTINCT doc.id) as doctor_count
    FROM departments d
    LEFT JOIN queue_tickets qt ON d.id = qt.department_id
    LEFT JOIN doctors doc ON d.id = doc.department_id AND doc.status = 'AVAILABLE' AND doc.is_active = TRUE
    WHERE d.is_active = TRUE
    GROUP BY d.id
    ORDER BY d.floor_number ASC, d.name ASC;
  `;
  const res = await db.query(query);
  return res.rows;
}

async function getAllWaypoints(floorNumber = null) {
  let query = 'SELECT * FROM hospital_waypoints WHERE is_active = TRUE';
  const params = [];
  if (floorNumber) {
    params.push(floorNumber);
    query += ' AND floor_number = $1';
  }
  query += ' ORDER BY floor_number ASC, name ASC;';
  const res = await db.query(query, params);
  return res.rows;
}

async function updateDepartmentLocation(departmentId, data) {
  const { floor_number, wing, room_number, map_x, map_y } = data;
  const res = await db.query(`
    UPDATE departments
    SET floor_number = COALESCE($1, floor_number),
        wing = COALESCE($2, wing),
        room_number = COALESCE($3, room_number),
        map_x = COALESCE($4, map_x),
        map_y = COALESCE($5, map_y)
    WHERE id = $6
    RETURNING *;
  `, [floor_number, wing, room_number, map_x, map_y, departmentId]);

  if (res.rows.length === 0) {
    throw new Error('Department not found.');
  }

  // Also update corresponding waypoint if code matches
  const dept = res.rows[0];
  const wpCode = `${dept.code}_F${dept.floor_number}`;
  await db.query(`
    UPDATE hospital_waypoints
    SET floor_number = $1, wing = $2, room_number = $3, map_x = $4, map_y = $5
    WHERE code = $6;
  `, [dept.floor_number, dept.wing, dept.room_number, dept.map_x, dept.map_y, wpCode]);

  return dept;
}

/**
 * Calculate route between two locations
 * Supports:
 * - Direct floor navigation
 * - Cross-floor navigation via Elevators / Central Stairs
 * - Standard hospital flows (Reception -> Doctor, Doctor -> Lab, Lab -> Doctor)
 */
async function calculateRoute(fromCode, toCode) {
  // Resolve from and to nodes
  const nodesRes = await db.query(`
    SELECT * FROM hospital_waypoints WHERE code IN ($1, $2);
  `, [fromCode, toCode]);

  let fromNode = nodesRes.rows.find(n => n.code === fromCode);
  let toNode = nodesRes.rows.find(n => n.code === toCode);

  // Fallback lookup if passed a department code (e.g. 'LAB', 'GEN')
  if (!fromNode) {
    const deptFrom = await db.query("SELECT * FROM departments WHERE code = $1", [fromCode]);
    if (deptFrom.rows.length > 0) {
      const d = deptFrom.rows[0];
      fromNode = {
        code: `${d.code}_F${d.floor_number}`,
        name: d.name,
        floor_number: d.floor_number,
        wing: d.wing,
        room_number: d.room_number,
        map_x: d.map_x,
        map_y: d.map_y,
      };
    }
  }

  if (!toNode) {
    const deptTo = await db.query("SELECT * FROM departments WHERE code = $1", [toCode]);
    if (deptTo.rows.length > 0) {
      const d = deptTo.rows[0];
      toNode = {
        code: `${d.code}_F${d.floor_number}`,
        name: d.name,
        floor_number: d.floor_number,
        wing: d.wing,
        room_number: d.room_number,
        map_x: d.map_x,
        map_y: d.map_y,
      };
    }
  }

  if (!fromNode || !toNode) {
    throw new Error(`Route locations not found for ${fromCode} -> ${toCode}`);
  }

  const steps = [];
  const waypoints = [];
  let totalDistanceMeters = 0;

  const isCrossFloor = fromNode.floor_number !== toNode.floor_number;

  // Step 1: Start
  steps.push({
    step_number: 1,
    floor: fromNode.floor_number,
    instruction: `Start at ${fromNode.name} (${fromNode.wing}, ${fromNode.room_number || 'Entrance'}).`,
    icon: 'start',
  });
  waypoints.push({ x: fromNode.map_x, y: fromNode.map_y, floor: fromNode.floor_number, name: fromNode.name });

  if (!isCrossFloor) {
    // Same floor navigation
    const dx = Math.abs(toNode.map_x - fromNode.map_x);
    const dy = Math.abs(toNode.map_y - fromNode.map_y);
    totalDistanceMeters = Math.round(Math.sqrt(dx * dx + dy * dy) * 0.15 + 15);

    // Midpoint corridor waypoint
    const midX = (fromNode.map_x + toNode.map_x) / 2;
    const midY = 240; // Central corridor line
    waypoints.push({ x: midX, y: midY, floor: fromNode.floor_number, name: 'Main Concourse' });

    steps.push({
      step_number: 2,
      floor: fromNode.floor_number,
      instruction: `Walk along the main ${toNode.wing} corridor toward ${toNode.room_number}.`,
      icon: 'walk',
    });

    steps.push({
      step_number: 3,
      floor: toNode.floor_number,
      instruction: `Arrive at ${toNode.name} (${toNode.room_number}). Please check in or present your ticket.`,
      icon: 'destination',
    });
    waypoints.push({ x: toNode.map_x, y: toNode.map_y, floor: toNode.floor_number, name: toNode.name });
  } else {
    // Cross-floor navigation (via Central Elevators / Stairs)
    const elevatorF1 = { x: 350, y: 340 };
    const elevatorF2 = { x: 350, y: 240 };

    totalDistanceMeters = 65; // includes elevator transition

    // From origin to elevator on current floor
    const elevatorCurrentFloor = fromNode.floor_number === 1 ? elevatorF1 : elevatorF2;
    waypoints.push({ x: elevatorCurrentFloor.x, y: elevatorCurrentFloor.y, floor: fromNode.floor_number, name: 'Elevators A & B' });

    steps.push({
      step_number: 2,
      floor: fromNode.floor_number,
      instruction: `Head to the Central Elevator Bank / Stairs in the Central Atrium on Floor ${fromNode.floor_number}.`,
      icon: 'elevator',
    });

    steps.push({
      step_number: 3,
      floor: toNode.floor_number,
      instruction: `Take Elevator A/B or Central Stairs to Floor ${toNode.floor_number}.`,
      icon: 'level-up',
    });

    const elevatorTargetFloor = toNode.floor_number === 1 ? elevatorF1 : elevatorF2;
    waypoints.push({ x: elevatorTargetFloor.x, y: elevatorTargetFloor.y, floor: toNode.floor_number, name: `Floor ${toNode.floor_number} Lobby` });

    steps.push({
      step_number: 4,
      floor: toNode.floor_number,
      instruction: `Exit elevator on Floor ${toNode.floor_number} and proceed into ${toNode.wing} toward ${toNode.room_number}.`,
      icon: 'walk',
    });

    steps.push({
      step_number: 5,
      floor: toNode.floor_number,
      instruction: `Arrive at ${toNode.name} (${toNode.room_number}).`,
      icon: 'destination',
    });
    waypoints.push({ x: toNode.map_x, y: toNode.map_y, floor: toNode.floor_number, name: toNode.name });
  }

  const estimatedWalkingMinutes = Math.max(1, Math.ceil(totalDistanceMeters / 40));

  return {
    origin: fromNode,
    destination: toNode,
    is_cross_floor: isCrossFloor,
    total_distance_meters: totalDistanceMeters,
    estimated_walk_minutes: estimatedWalkingMinutes,
    steps,
    waypoints,
  };
}

module.exports = {
  getDepartmentDirectory,
  getAllWaypoints,
  updateDepartmentLocation,
  calculateRoute,
};
