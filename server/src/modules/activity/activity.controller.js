const activityService = require('./activity.service');

async function getActivity(req, res) {
  try {
    const { workspace_id } = req.params;
    const { page, limit, entity_type } = req.query;
    const role = req.role;
    const userId = req.user.id;

    const data = await activityService.getWorkspaceActivity(workspace_id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 30,
      role,
      userId,
      entity_type,
    });

    res.json(data);
  } catch (err) {
    console.error('getActivity error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getActivity };
