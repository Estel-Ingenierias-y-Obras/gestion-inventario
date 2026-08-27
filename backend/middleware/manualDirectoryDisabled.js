const manualDirectoryDisabled = (_req, res) => res.status(409).json({
  success: false,
  code: 'MANUAL_DIRECTORY_MANAGEMENT_DISABLED',
  message: 'Las personas y departamentos se gestionan mediante Microsoft Entra ID.',
});

module.exports = manualDirectoryDisabled;
