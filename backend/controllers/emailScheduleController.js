const EmailSchedule = require('../models/EmailSchedule');
const auditLogger = require('../utils/auditLogger');
const { sendEmailReport } = require('../services/emailReportService');
const { listPendingEmailSchedules, sendPendingEmailSchedule } = require('../services/emailScheduleProcessor');
const { testSmtpDelivery } = require('../services/smtpTestService');

const listEmailSchedules = async (req, res, next) => {
  try {
    const schedules = await EmailSchedule.find().sort({ createdAt: -1 });
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

const sendScheduledReport = async (req, res, next) => {
  try {
    const schedule = await EmailSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Programación no encontrada.' });
    const result = req.query.force === 'true'
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

const testSmtp = async (req, res) => {
  try {
    const result = await testSmtpDelivery();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[SMTP TEST]', {
      code: error.code,
      responseCode: error.responseCode,
      command: error.command,
      message: error.message,
    });
    return res.status(502).json({
      success: false,
      message: 'La prueba SMTP ha fallado.',
      error: {
        code: error.code || 'SMTP_TEST_FAILED',
        responseCode: error.responseCode || null,
        command: error.command || null,
      },
    });
  }
};

module.exports = {
  listEmailSchedules, listPendingSchedules, createEmailSchedule, deleteEmailSchedule, sendScheduledReport, testSmtp,
};
