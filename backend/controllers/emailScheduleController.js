const EmailSchedule = require('../models/EmailSchedule');
const auditLogger = require('../utils/auditLogger');
const { sendEmailReport } = require('../services/emailReportService');
const { listPendingEmailSchedules, sendPendingEmailSchedule } = require('../services/emailScheduleProcessor');
const { testGraphMail } = require('../services/graphMailService');

const listEmailSchedules = async (req, res, next) => {
  try {
    const schedules = await EmailSchedule.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    return next(error);
  }
};

const createEmailSchedule = async (req, res, next) => {
  try {
    const isWeekly = req.body.frequency === 'weekly';
    const schedule = await EmailSchedule.create({
      email: req.body.email,
      frequency: req.body.frequency,
      dayOfWeek: isWeekly ? req.body.dayOfWeek : null,
      dayOfMonth: isWeekly ? null : req.body.dayOfMonth,
      hour: req.body.hour,
      active: true,
      createdBy: req.user.email,
    });

    await auditLogger({
      action: 'EMAIL_SCHEDULE_CREATED', entity: 'EmailSchedule', user: req.user,
      details: { recipientEmail: schedule.email, reportType: schedule.frequency }, req,
    });
    return res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, code: 'DUPLICATE_SCHEDULE', message: 'Esta programación ya existe.' });
    }
    return next(error);
  }
};

const deleteEmailSchedule = async (req, res, next) => {
  try {
    const schedule = await EmailSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Programación no encontrada.' });

    await schedule.deleteOne();
    await auditLogger({
      action: 'EMAIL_SCHEDULE_DELETED', entity: 'EmailSchedule', user: req.user,
      details: { recipientEmail: schedule.email, reportType: schedule.frequency }, req,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

const scheduleConfiguration = (schedule) => ({
  email: schedule.email,
  frequency: schedule.frequency,
  dayOfWeek: schedule.dayOfWeek,
  dayOfMonth: schedule.dayOfMonth,
  hour: schedule.hour,
  active: schedule.active,
});

const configurationChanges = (previousConfiguration, currentConfiguration) => Object.fromEntries(
  Object.keys(currentConfiguration)
    .filter((key) => previousConfiguration[key] !== currentConfiguration[key])
    .map((key) => [key, { from: previousConfiguration[key], to: currentConfiguration[key] }])
);

const updateEmailSchedule = async (req, res, next) => {
  try {
    const schedule = await EmailSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Programación no encontrada.' });

    const previousConfiguration = scheduleConfiguration(schedule);
    const isWeekly = req.body.frequency === 'weekly';
    schedule.email = req.body.email;
    schedule.frequency = req.body.frequency;
    schedule.dayOfWeek = isWeekly ? req.body.dayOfWeek : null;
    schedule.dayOfMonth = isWeekly ? null : req.body.dayOfMonth;
    schedule.hour = req.body.hour;
    await schedule.save();

    const currentConfiguration = scheduleConfiguration(schedule);
    await auditLogger({
      action: 'EMAIL_SCHEDULE_UPDATED',
      entity: 'EmailSchedule',
      user: req.user,
      details: {
        scheduleId: String(schedule._id),
        recipientEmail: schedule.email,
        reportType: schedule.frequency,
        previousConfiguration,
        currentConfiguration,
        changes: configurationChanges(previousConfiguration, currentConfiguration),
      },
      req,
    });
    return res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, code: 'DUPLICATE_SCHEDULE', message: 'Esta programación ya existe.' });
    }
    return next(error);
  }
};

const sendScheduledReport = async (req, res, next) => {
  try {
    const schedule = await EmailSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Programación no encontrada.' });
    const result = !req.automation && req.query.force === 'true'
      ? await sendEmailReport(schedule, { user: req.user, req, reportPeriod: 'manual' })
      : await sendPendingEmailSchedule(schedule, { user: req.user, req });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

const listPendingSchedules = async (req, res, next) => {
  try {
    const schedules = await listPendingEmailSchedules();
    return res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    return next(error);
  }
};

const testGraph = async (req, res) => {
  try {
    const result = await testGraphMail();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[GRAPH TEST]', {
      status: error.graphStatus || error.statusCode,
      code: error.graphCode || error.name,
    });
    return res.status(502).json({
      success: false,
      message: 'La prueba de Microsoft Graph ha fallado.',
      error: {
        status: error.graphStatus || null,
        code: error.graphCode || error.name || 'GRAPH_TEST_FAILED',
      },
    });
  }
};

module.exports = {
  listEmailSchedules, listPendingSchedules, createEmailSchedule, updateEmailSchedule, deleteEmailSchedule,
  sendScheduledReport, testGraph,
};
