const usersService = require('./users.service');


async function getAllUsers(req, res) {
  try {
    const users = await usersService.getAllUsers();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getMe(req, res) {
  try {
    const user = await usersService.getMe(req.user.userId);
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateMe(req, res) {
  try {
    const { name, email } = req.body;
    if (!name && !email) {
      return res.status(400).json({ error: 'Nothing to update' });
    }
    const user = await usersService.updateMe(req.user.userId, { name, email });
    res.status(200).json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required' });
    }
    await usersService.updatePassword(req.user.userId, { currentPassword, newPassword });
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getWorkspaceMembers(req, res) {
  try {
    const members = await usersService.getWorkspaceMembers(req.user.userId, req.params.workspaceId);
    res.status(200).json({ members });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
}

async function updateMemberRole(req, res) {
  try {
    const member = await usersService.updateMemberRole(
      req.user.userId, req.params.workspaceId, req.params.userId, req.body.roleName
    );
    res.status(200).json({ message: 'Role updated', member });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
}

async function removeMember(req, res) {
  try {
    await usersService.removeMember(req.user.userId, req.params.workspaceId, req.params.userId);
    res.status(200).json({ message: 'Member removed successfully' });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
}

module.exports = { getMe, updateMe, updatePassword, getWorkspaceMembers, updateMemberRole, removeMember, getAllUsers };