const EmailSchedule = require('../models/EmailSchedule');
const EmailReportRun = require('../models/EmailReportRun');
const { getZonedParts, zonedDateToUtc, sendEmailReport } = require('./emailReportService');

const weekdayNumbers = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const LOCK_MS = 30 * 60 * 1000;

const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const getLatestOccurrence = (schedule, now = new Date()) => {
  const parts = getZonedParts(now);
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const [hour, minute] = schedule.hour.split(':').map(Number);

  if (schedule.frequency === 'weekly') {
    const daysBack = (weekdayNumbers[parts.weekday] - schedule.dayOfWeek + 7) % 7;
    const localCandidate = new Date(Date.UTC(year, month - 1, day - daysBack));
    let occurrence = zonedDateToUtc(localCandidate.getUTCFullYear(), localCandidate.getUTCMonth() + 1, localCandidate.getUTCDate(), hour, minute);
    if (occurrence > now) occurrence = new Date(occurrence.getTime() - (7 * 24 * 60 * 60 * 1000));
    const occurrenceParts = getZonedParts(occurrence);
    return { occurrence, periodKey: `weekly:${occurrenceParts.year}-${occurrenceParts.month}-${occurrenceParts.day}` };
  }

  const scheduledDay = Math.min(schedule.dayOfMonth, daysInMonth(year, month));
  let occurrence = zonedDateToUtc(year, month, scheduledDay, hour, minute);
  if (occurrence > now) {
    const previous = new Date(Date.UTC(year, month - 2, 1));
    const previousDay = Math.min(schedule.dayOfMonth, daysInMonth(previous.getUTCFullYear(), previous.getUTCMonth() + 1));
    occurrence = zonedDateToUtc(previous.getUTCFullYear(), previous.getUTCMonth() + 1, previousDay, hour, minute);
  }
  const occurrenceParts = getZonedParts(occurrence);
  return { occurrence, periodKey: `monthly:${occurrenceParts.year}-${occurrenceParts.month}` };
};

const claimRun = async (schedule, periodKey, now) => {
  try {
    return await EmailReportRun.create({
      schedule: schedule._id, periodKey, status: 'processing', lockedUntil: new Date(now.getTime() + LOCK_MS),
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }

  return EmailReportRun.findOneAndUpdate(
    {
      schedule: schedule._id,
      periodKey,
      status: { $ne: 'sent' },
      $or: [{ status: 'failed' }, { status: 'processing', lockedUntil: { $lt: now } }],
    },
    { $set: { status: 'processing', lockedUntil: new Date(now.getTime() + LOCK_MS), lastError: '' } },
    { new: true }
  );
};

const listPendingEmailSchedules = async (now = new Date()) => {
  const schedules = await EmailSchedule.find({ active: true });
  const candidates = schedules.map((schedule) => ({ schedule, ...getLatestOccurrence(schedule, now) }))
    .filter(({ schedule, occurrence }) => !schedule.createdAt || occurrence >= schedule.createdAt);
  const existingRuns = candidates.length ? await EmailReportRun.find({
    $or: candidates.map(({ schedule, periodKey }) => ({ schedule: schedule._id, periodKey })),
  }).lean() : [];
  const runs = new Map(existingRuns.map((run) => [`${run.schedule}:${run.periodKey}`, run]));

  return candidates.filter(({ schedule, periodKey }) => {
    const run = runs.get(`${schedule._id}:${periodKey}`);
    return !run || run.status === 'failed' || (run.status === 'processing' && run.lockedUntil < now);
  }).map(({ schedule, occurrence, periodKey }) => ({
    _id: schedule._id,
    email: schedule.email,
    frequency: schedule.frequency,
    dayOfWeek: schedule.dayOfWeek,
    dayOfMonth: schedule.dayOfMonth,
    hour: schedule.hour,
    scheduledFor: occurrence,
    periodKey,
  }));
};

const sendPendingEmailSchedule = async (schedule, { user, req, now = new Date() }) => {
  const { occurrence, periodKey } = getLatestOccurrence(schedule, now);
  if (schedule.createdAt && occurrence < schedule.createdAt) {
    return { sent: false, reason: 'NOT_DUE', periodKey };
  }
  const run = await claimRun(schedule, periodKey, now);
  if (!run) return { sent: false, reason: 'ALREADY_SENT_OR_PROCESSING', periodKey };

  try {
    const report = await sendEmailReport(schedule, {
      user, req, reportDate: occurrence, reportPeriod: periodKey,
      idempotencyKey: `email-schedule:${schedule._id}:${periodKey}`,
    });
    run.status = 'sent'; run.sentAt = new Date(); run.lockedUntil = null;
    await run.save();
    return { sent: true, periodKey, ...report };
  } catch (error) {
    run.status = 'failed'; run.lockedUntil = null; run.lastError = error.message;
    await run.save();
    throw error;
  }
};

module.exports = { getLatestOccurrence, listPendingEmailSchedules, sendPendingEmailSchedule };
