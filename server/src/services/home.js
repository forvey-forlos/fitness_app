const { HttpError } = require('../utils/response')
const { localDate, shiftDate, startOfLocalDate, sqlUtc } = require('../utils/bodyTime')
const { presentBodyProfile } = require('./bodyProfiles')
const { createBodyMeasurementsService, presentBodyMeasurement } = require('./bodyMeasurements')
const { presentTrainingPlan, presentTrainingPlanExercise } = require('./trainingPlans')
const { createTrainingSessionsService } = require('./trainingSessions')

function mondayOf(date) {
  const weekday = new Date(date + 'T00:00:00.000Z').getUTCDay()
  return shiftDate(date, 1 - (weekday || 7))
}

function librarySummary(rows) {
  const partCounts = {}
  let systemCount = 0
  let customCount = 0
  for (const row of rows) {
    const system = Number(row.system_count)
    const custom = Number(row.custom_count)
    systemCount += system
    customCount += custom
    partCounts[row.category] = system + custom
  }
  return {
    systemCount, customCount, totalCount: systemCount + customCount,
    activePartCount: Object.keys(partCounts).length, partCounts
  }
}

function createHomeService(options = {}) {
  const usersRepository = options.usersRepository || require('../repositories/users')
  const profilesRepository = options.bodyProfilesRepository || require('../repositories/bodyProfiles')
  const measurementsRepository = options.bodyMeasurementsRepository || require('../repositories/bodyMeasurements')
  const plansRepository = options.trainingPlansRepository || require('../repositories/trainingPlans')
  const sessionsRepository = options.trainingSessionsRepository || require('../repositories/trainingSessions')
  const exercisesRepository = options.exercisesRepository || require('../repositories/exercises')
  const now = options.now || (() => new Date())
  const measurementsService = options.bodyMeasurementsService ||
    createBodyMeasurementsService({
      bodyMeasurementsRepository: measurementsRepository, usersRepository, now
    })
  const sessionsService = options.trainingSessionsService ||
    createTrainingSessionsService({ trainingSessionsRepository: sessionsRepository, usersRepository, now })

  async function currentStreak(userId, timezone, today) {
    const beforeUtc = sqlUtc(startOfLocalDate(shiftDate(today, 1), timezone))
    let cursor = null
    let expected = today
    let streak = 0
    let previousDate = null
    for (;;) {
      const rows = await sessionsRepository.listRecentCompletions(userId, beforeUtc, cursor, 100)
      if (!rows.length) return streak
      for (const row of rows) {
        const date = localDate(new Date(row.completed_at), timezone)
        if (date === previousDate) continue
        previousDate = date
        if (streak === 0 && date !== expected) {
          expected = shiftDate(expected, -1)
          if (date !== expected) return 0
        }
        if (date !== expected) return streak
        streak += 1
        expected = shiftDate(expected, -1)
      }
      if (rows.length < 100) return streak
      const last = rows.at(-1)
      cursor = { completedAt: sqlUtc(last.completed_at), id: last.id }
    }
  }

  return {
    async summary(userId, query = {}) {
      const user = await usersRepository.findActiveById(userId)
      if (!user) throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')
      const timezone = user.timezone || 'Asia/Shanghai'
      if (query.timezone && query.timezone !== timezone) {
        throw new HttpError(400, 'VALIDATION_ERROR', '时区必须与当前用户资料一致')
      }
      const date = query.date || localDate(now(), timezone)
      const [profileRow, latestRow, weightTrendSummary, planRow, weekTraining,
        exerciseLibrary, streak] = await Promise.all([
        profilesRepository.findByUserId(userId),
        measurementsRepository.findLatestByUserId(userId),
        measurementsService.weightTrendForUser(userId, user, 'week'),
        plansRepository.findByDate(userId, date),
        sessionsService.weeklyForUser(userId, user, mondayOf(date)),
        exercisesRepository.countVisibleByCategory(userId).then(librarySummary),
        currentStreak(userId, timezone, date)
      ])
      const todayPlan = planRow
        ? {
          ...presentTrainingPlan(planRow),
          exercises: (await plansRepository.listExercises(userId, planRow.id))
            .map(presentTrainingPlanExercise)
        }
        : null
      if (todayPlan) {
        todayPlan.totalActionCount = todayPlan.exercises.length
        todayPlan.completedActionCount = todayPlan.status === 'completed'
          ? todayPlan.exercises.length : 0
      }
      const profile = profileRow ? presentBodyProfile(profileRow) : null
      const latestMeasurement = latestRow ? presentBodyMeasurement(latestRow) : null
      const height = profile?.height ?? null
      const weight = latestMeasurement?.weight ?? profile?.weight ?? null
      const bmi = height !== null && weight !== null
        ? Math.round(weight / ((height / 100) ** 2) * 10) / 10 : null
      const body = {
        profile, latestMeasurement, weightTrendSummary,
        height, weight, bmi, lastWeightChange: weightTrendSummary.change,
        latestMeasuredAt: latestMeasurement?.measuredAt ?? null
      }
      const safeUser = {
        id: user.id, username: user.username,
        avatarUrl: user.avatar_url, timezone
      }
      const week = { ...weekTraining, currentStreak: streak }
      return {
        user: safeUser, streakDays: streak, body, todayPlan,
        weekTraining: week, weeklyTraining: week,
        exerciseLibrary, actionLibrary: exerciseLibrary
      }
    }
  }
}

module.exports = { createHomeService }
