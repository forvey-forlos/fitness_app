const sessionColumns = [
  's.id, s.user_id, s.training_plan_id, s.plan_name_snapshot,',
  's.duration_minutes, s.plan_version, s.version,',
  "DATE_FORMAT(s.plan_date, '%Y-%m-%d') AS plan_date,",
  "DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS started_at,",
  "DATE_FORMAT(s.completed_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS completed_at,",
  "DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS created_at"
].join(' ')

const exerciseColumns = [
  'id, exercise_id, exercise_name_snapshot, category_snapshot,',
  'muscle_group_snapshot, equipment_snapshot, sort_order, sets, reps,',
  'weight, rest_seconds, notes'
].join(' ')

function createTrainingSessionsRepository(pool) {
  return {
    async findByKey(userId, key) {
      const [rows] = await pool.execute(
        'SELECT id, training_plan_id, request_hash FROM training_sessions WHERE user_id = ? AND idempotency_key = ? LIMIT 1',
        [userId, key]
      )
      return rows[0] || null
    },
    async withTransaction(callback) {
      const connection = await pool.getConnection()
      let active = false
      try {
        await connection.beginTransaction()
        active = true
        const tx = {
          async findByPlan(userId, planId) {
            const [rows] = await connection.execute(
              'SELECT id, training_plan_id, idempotency_key, request_hash FROM training_sessions WHERE user_id = ? AND training_plan_id = ? LIMIT 1 FOR UPDATE',
              [userId, planId]
            )
            return rows[0] || null
          },
          async lockPlan(userId, planId) {
            const [rows] = await connection.execute(
              ["SELECT id, user_id, name, duration_minutes, status, version, deleted_at,",
                "DATE_FORMAT(plan_date, '%Y-%m-%d') AS plan_date",
                'FROM training_plans WHERE id = ? AND user_id = ? FOR UPDATE'].join(' '),
              [planId, userId]
            )
            return rows[0] || null
          },
          async listPlanExercises(userId, planId) {
            const [rows] = await connection.execute(
              ['SELECT pe.exercise_id, pe.sort_order, pe.sets, pe.reps, pe.weight,',
                'pe.rest_seconds, pe.notes, e.name AS exercise_name,',
                'e.category, e.muscle_group, e.equipment',
                'FROM training_plan_exercises pe',
                'JOIN training_plans p ON p.id = pe.training_plan_id',
                'JOIN exercises e ON e.id = pe.exercise_id',
                'WHERE p.id = ? AND p.user_id = ? AND p.deleted_at IS NULL',
                'AND pe.deleted_at IS NULL ORDER BY pe.sort_order ASC, pe.id ASC'].join(' '),
              [planId, userId]
            )
            return rows
          },
          async insertSession(record) {
            await connection.execute(
              ['INSERT INTO training_sessions',
                '(id, user_id, training_plan_id, plan_date, plan_name_snapshot,',
                'started_at, completed_at, duration_minutes, plan_version, idempotency_key,',
                'request_hash, created_at, updated_at)',
                'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))'].join(' '),
              [record.id, record.userId, record.planId, record.planDate,
                record.name, record.startedAt, record.completedAt,
                record.durationMinutes, record.planVersion, record.key, record.hash]
            )
          },
          async insertExercises(sessionId, items) {
            for (const item of items) {
              await connection.execute(
                ['INSERT INTO training_session_exercises',
                  '(id, session_id, exercise_id, exercise_name_snapshot, category_snapshot,',
                  'muscle_group_snapshot, equipment_snapshot, sort_order, sets, reps,',
                  'weight, rest_seconds, notes, created_at)',
                  'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))'].join(' '),
                [item.id, sessionId, item.exercise_id, item.exercise_name,
                  item.category, item.muscle_group, item.equipment, item.sort_order,
                  item.sets, item.reps, item.weight, item.rest_seconds, item.notes]
              )
            }
          },
          async markCompleted(userId, planId, version, completedAt) {
            const [result] = await connection.execute(
              ["UPDATE training_plans SET status = 'completed', completed_at = ?,",
                'version = version + 1, updated_at = UTC_TIMESTAMP(3)',
                "WHERE id = ? AND user_id = ? AND version = ? AND status = 'draft'",
                'AND deleted_at IS NULL'].join(' '),
              [completedAt, planId, userId, version]
            )
            return result.affectedRows === 1
          }
        }
        const result = await callback(tx)
        await connection.commit()
        active = false
        return result
      } catch (error) {
        if (active) await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    },
    async findOwnedById(userId, id) {
      const [rows] = await pool.execute(
        ['SELECT', sessionColumns, 'FROM training_sessions s',
          'WHERE s.id = ? AND s.user_id = ? AND s.deleted_at IS NULL LIMIT 1'].join(' '),
        [id, userId]
      )
      return rows[0] || null
    },
    async listExercises(userId, sessionId) {
      const [rows] = await pool.execute(
        ['SELECT', exerciseColumns, 'FROM training_session_exercises',
          'WHERE session_id = ? AND EXISTS (SELECT 1 FROM training_sessions s',
          'WHERE s.id = ? AND s.user_id = ? AND s.deleted_at IS NULL)',
          'ORDER BY sort_order ASC, id ASC'].join(' '),
        [sessionId, sessionId, userId]
      )
      return rows
    },
    async list(userId, filters) {
      const conditions = ['s.user_id = ?', 's.deleted_at IS NULL']
      const params = [userId]
      if (filters.startUtc) {
        conditions.push('s.completed_at >= ?')
        params.push(filters.startUtc)
      }
      if (filters.endUtc) {
        conditions.push('s.completed_at < ?')
        params.push(filters.endUtc)
      }
      const where = 'WHERE ' + conditions.join(' AND ')
      const [counts] = await pool.execute(
        'SELECT COUNT(*) AS total FROM training_sessions s ' + where, params
      )
      const [rows] = await pool.execute(
        ['SELECT', sessionColumns, 'FROM training_sessions s', where,
          'ORDER BY s.completed_at DESC, s.id DESC LIMIT ? OFFSET ?'].join(' '),
        [...params, filters.pageSize, (filters.page - 1) * filters.pageSize]
      )
      return { rows, total: Number(counts[0].total) }
    },
    async listCompletedInRange(userId, startUtc, endUtc) {
      const [rows] = await pool.execute(
        ['SELECT s.id,',
          "DATE_FORMAT(s.completed_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS completed_at",
          'FROM training_sessions s WHERE s.user_id = ? AND s.deleted_at IS NULL',
          'AND s.completed_at >= ? AND s.completed_at < ?',
          'ORDER BY s.completed_at ASC, s.id ASC'].join(' '),
        [userId, startUtc, endUtc]
      )
      return rows
    },
    async listRecentCompletions(userId, beforeUtc, cursor, limit) {
      const conditions = [
        'user_id = ?', 'deleted_at IS NULL', 'completed_at < ?'
      ]
      const params = [userId, beforeUtc]
      if (cursor) {
        conditions.push('(completed_at < ? OR (completed_at = ? AND id < ?))')
        params.push(cursor.completedAt, cursor.completedAt, cursor.id)
      }
      const [rows] = await pool.execute(
        ["SELECT id, DATE_FORMAT(completed_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS completed_at",
          'FROM training_sessions WHERE', conditions.join(' AND '),
          'ORDER BY completed_at DESC, id DESC LIMIT ?'].join(' '),
        [...params, limit]
      )
      return rows
    }
  }
}

function defaultRepository() {
  return createTrainingSessionsRepository(require('../config/db'))
}

module.exports = {
  createTrainingSessionsRepository,
  findByKey: (...args) => defaultRepository().findByKey(...args),
  withTransaction: (...args) => defaultRepository().withTransaction(...args),
  findOwnedById: (...args) => defaultRepository().findOwnedById(...args),
  listExercises: (...args) => defaultRepository().listExercises(...args),
  list: (...args) => defaultRepository().list(...args),
  listCompletedInRange: (...args) => defaultRepository().listCompletedInRange(...args),
  listRecentCompletions: (...args) => defaultRepository().listRecentCompletions(...args)
}
