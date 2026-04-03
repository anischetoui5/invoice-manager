const authService = require('./auth.service');

async function register(req, res) {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json({ message: 'Login successful', ...result });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

module.exports = { register, login };