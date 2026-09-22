const planColumns = [
  'id, user_id, name, duration_minutes, status, version, request_hash, deleted_at,',
  "DATE_FORMAT(plan_date, '%Y-%m-%d') AS plan_date,",
  "DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS created_at,",
  "DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at,",
  "DATE_FORMAT(completed_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS completed_at"
].join(' ')

const itemColumns = [
  'pe.id, pe.exercise_id, pe.exercise_variant_id, pe.sort_order, pe.sets, pe.reps, pe.weight,',
  'pe.actual_sets, pe.actual_reps, pe.actual_weight, pe.body_part,',
  'pe.record_methods, pe.target_metrics, pe.actual_groups,',
  'pe.rest_seconds, pe.notes,',
  "DATE_FORMAT(pe.created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS created_at,",
  "DATE_FORMAT(pe.updated_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at,",
  'COALESCE(NULLIF(uep.display_name,\'\'),e.default_display_name_zh,e.name) AS exercise_name,',
  'e.standard_name_en AS exercise_standard_name, e.default_display_name_zh AS exercise_default_display_name,',
  'e.category AS exercise_category, e.body_parts AS exercise_body_parts, e.record_methods AS exercise_record_methods,',
  'e.muscle_group AS exercise_muscle_group, e.equipment AS exercise_equipment,',
  'e.is_system AS exercise_is_system, e.deleted_at AS exercise_deleted_at,',
  'ev.default_display_name_zh AS variant_name, ev.standard_name_en AS variant_standard_name,',
  `(SELECT JSON_ARRAYAGG(JSON_OBJECT('id',v.id,'code',v.variant_code,'name',v.default_display_name_zh,
    'standardName',v.standard_name_en,'primaryMuscles',v.primary_muscles,
    'secondaryMuscles',v.secondary_muscles)) FROM exercise_variants v
    WHERE v.exercise_id=e.id AND v.deleted_at IS NULL) AS exercise_variants`
].join(' ')

async function inTransaction(pool, callback) {
  const connection = await pool.getConnection()
  let started = false
  try {
    await connection.beginTransaction()
    started = true
    const result = await callback(connection)
    if (result === false) {
      await connection.rollback()
      started = false
      return false
    }
    await connection.commit()
    started = false
    return result
  } catch (error) {
    if (started) await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

function createTrainingPlansRepository(pool) {
  async function insertItems(connection, planId, userId, items) {
    for (const item of items) {
      const actual = item.actual || { kg: null, reps: null, sets: null }
      const [result] = await connection.execute(
        ['INSERT INTO training_plan_exercises',
          '(id, training_plan_id, exercise_id, exercise_variant_id, sort_order, sets, reps, weight,',
          'actual_sets, actual_reps, actual_weight, body_part, record_methods, target_metrics, actual_groups, rest_seconds, notes, created_at, updated_at)',
          'SELECT ?, p.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3)',
          'FROM training_plans p WHERE p.id = ? AND p.user_id = ?',
          'AND p.status = ? AND p.deleted_at IS NULL'].join(' '),
        [item.id, item.exerciseId, item.variantId, item.sortOrder, item.sets, item.reps,
          item.weight, actual.sets, actual.reps, actual.kg, item.bodyPart,
          item.recordMethods ? JSON.stringify(item.recordMethods) : null,
          item.targetMetrics ? JSON.stringify(item.targetMetrics) : null,
          item.actualGroups ? JSON.stringify(item.actualGroups) : null,
          item.restSeconds, item.notes, planId, userId, 'draft']
      )
      if (result.affectedRows !== 1) throw new Error('Could not insert plan exercise')
    }
  }

  return {
    async findOwnedById(userId, id) {
      const [rows] = await pool.execute(
        ['SELECT', planColumns, 'FROM training_plans',
          'WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1'].join(' '),
        [id, userId]
      )
      return rows[0] || null
    },
    async findByDate(userId, date) {
      const [rows] = await pool.execute(
        ['SELECT', planColumns, 'FROM training_plans',
          'WHERE user_id = ? AND plan_date = ? AND deleted_at IS NULL LIMIT 1'].join(' '),
        [userId, date]
      )
      return rows[0] || null
    },
    async findByIdempotencyKey(userId, key) {
      const [rows] = await pool.execute(
        ['SELECT', planColumns, 'FROM training_plans',
          'WHERE user_id = ? AND idempotency_key = ? LIMIT 1'].join(' '),
        [userId, key]
      )
      return rows[0] || null
    },
    async list(userId, filters) {
      const conditions = ['user_id = ?', 'deleted_at IS NULL']
      const params = [userId]
      if (filters.date) {
        conditions.push('plan_date = ?')
        params.push(filters.date)
      }
      if (filters.startDate) {
        conditions.push('plan_date >= ?')
        params.push(filters.startDate)
      }
      if (filters.endDate) {
        conditions.push('plan_date <= ?')
        params.push(filters.endDate)
      }
      if (filters.status) {
        conditions.push('status = ?')
        params.push(filters.status)
      }
      const where = 'WHERE ' + conditions.join(' AND ')
      const [countRows] = await pool.execute(
        'SELECT COUNT(*) AS total FROM training_plans ' + where, params
      )
      const [rows] = await pool.execute(
        ['SELECT', planColumns, 'FROM training_plans', where,
          'ORDER BY plan_date DESC, id DESC LIMIT ? OFFSET ?'].join(' '),
        [...params, filters.pageSize, (filters.page - 1) * filters.pageSize]
      )
      return { rows, total: Number(countRows[0].total) }
    },
    async listExercises(userId, planId) {
      const [rows] = await pool.execute(
        ['SELECT', itemColumns, 'FROM training_plan_exercises pe',
          'JOIN training_plans p ON p.id = pe.training_plan_id',
          'JOIN exercises e ON e.id = pe.exercise_id',
          'LEFT JOIN user_exercise_preferences uep ON uep.exercise_id=e.id AND uep.user_id=? AND uep.deleted_at IS NULL',
          'LEFT JOIN exercise_variants ev ON ev.id=pe.exercise_variant_id AND ev.exercise_id=pe.exercise_id AND ev.deleted_at IS NULL',
          'WHERE p.id = ? AND p.user_id = ? AND p.deleted_at IS NULL',
          'AND pe.deleted_at IS NULL ORDER BY pe.sort_order ASC, pe.id ASC'].join(' '),
        [userId, planId, userId]
      )
      return rows
    },
    async create(record, items) {
      return inTransaction(pool, async (connection) => {
        await connection.execute(
          ['INSERT INTO training_plans',
            '(id, user_id, plan_date, name, duration_minutes, status, version,',
            'idempotency_key, request_hash, created_at, updated_at)',
            "VALUES (?, ?, ?, ?, ?, 'draft', 1, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))"].join(' '),
          [record.id, record.userId, record.planDate, record.name,
            record.durationMinutes, record.idempotencyKey, record.requestHash]
        )
        await insertItems(connection, record.id, record.userId, items)
        return true
      })
    },
    async update(userId, id, version, record, items) {
      return inTransaction(pool, async (connection) => {
        const [result] = await connection.execute(
          ['UPDATE training_plans SET plan_date = ?, name = ?, duration_minutes = ?,',
            'version = version + 1, updated_at = UTC_TIMESTAMP(3)',
            "WHERE id = ? AND user_id = ? AND version = ? AND status = 'draft'",
            'AND deleted_at IS NULL'].join(' '),
          [record.planDate, record.name, record.durationMinutes, id, userId, version]
        )
        if (result.affectedRows !== 1) return false
        await connection.execute(
          ['UPDATE training_plan_exercises pe',
            'JOIN training_plans p ON p.id = pe.training_plan_id',
            'SET pe.deleted_at = UTC_TIMESTAMP(3), pe.updated_at = UTC_TIMESTAMP(3)',
            'WHERE pe.training_plan_id = ? AND p.user_id = ? AND pe.deleted_at IS NULL'].join(' '),
          [id, userId]
        )
        await insertItems(connection, id, userId, items)
        return true
      })
    },
    async softDelete(userId, id, version) {
      return inTransaction(pool, async (connection) => {
        const [result] = await connection.execute(
          ['UPDATE training_plans SET deleted_at = UTC_TIMESTAMP(3),',
            'updated_at = UTC_TIMESTAMP(3), version = version + 1',
            'WHERE id = ? AND user_id = ? AND version = ? AND deleted_at IS NULL'].join(' '),
          [id, userId, version]
        )
        if (result.affectedRows !== 1) return false
        await connection.execute(
          ['UPDATE training_plan_exercises pe',
            'JOIN training_plans p ON p.id = pe.training_plan_id',
            'SET pe.deleted_at = UTC_TIMESTAMP(3), pe.updated_at = UTC_TIMESTAMP(3)',
            'WHERE pe.training_plan_id = ? AND p.user_id = ? AND pe.deleted_at IS NULL'].join(' '),
          [id, userId]
        )
        await connection.execute(
          ['UPDATE training_sessions SET deleted_at = UTC_TIMESTAMP(3),',
            'updated_at = UTC_TIMESTAMP(3), version = version + 1',
            'WHERE training_plan_id = ? AND user_id = ? AND deleted_at IS NULL'].join(' '),
          [id, userId]
        )
        return true
      })
    }
  }
}

function defaultRepository() {
  return createTrainingPlansRepository(require('../config/db'))
}

module.exports = {
  createTrainingPlansRepository,
  findOwnedById: (...args) => defaultRepository().findOwnedById(...args),
  findByDate: (...args) => defaultRepository().findByDate(...args),
  findByIdempotencyKey: (...args) => defaultRepository().findByIdempotencyKey(...args),
  list: (...args) => defaultRepository().list(...args),
  listExercises: (...args) => defaultRepository().listExercises(...args),
  create: (...args) => defaultRepository().create(...args),
  update: (...args) => defaultRepository().update(...args),
  softDelete: (...args) => defaultRepository().softDelete(...args)
}
