const usersService = require('./users.service');

async function getMe(req, res) {
  try {
    const user = await usersService.getMe(req.user.userId);
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getWorkspaceMembers(req, res) {
  try {
    const members = await usersService.getWorkspaceMembers(
      req.user.userId,
      req.params.workspaceId
    );
    res.status(200).json({ members });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
}

async function updateMemberRole(req, res) {
  try {
    const member = await usersService.updateMemberRole(
      req.user.userId,
      req.params.workspaceId,
      req.params.userId,
      req.body.roleName
    );
    res.status(200).json({ message: 'Role updated', member });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
}

async function removeMember(req, res) {
  try {
    await usersService.removeMember(
      req.user.userId,
      req.params.workspaceId,
      req.params.userId
    );
    res.status(200).json({ message: 'Member removed successfully' });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
}

module.exports = { getMe, getWorkspaceMembers, updateMemberRole, removeMember };