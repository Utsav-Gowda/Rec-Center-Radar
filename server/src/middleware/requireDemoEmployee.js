// Sprint demonstration only: the caller selects a role, so this is not authentication.
// Replace this adapter with the verified employee identity from US6 when available.
module.exports = function requireDemoEmployee(req, res, next) {
  if (process.env.DEMO_EMPLOYEE_MODE !== 'true') {
    return res.status(403).json({ error: 'Demo employee access is disabled on this server.' });
  }
  if (req.get('X-Demo-Role') !== 'employee') {
    return res.status(403).json({ error: 'Select the demo employee role to register equipment.' });
  }
  req.employee = { id: 'demo-employee' };
  next();
};
