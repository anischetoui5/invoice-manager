const aiService = require('./ai.service');

async function chat(req, res) {
  try {
    const workspaceId = req.params.workspace_id;
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const reply = await aiService.chat(workspaceId, messages);
    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ error: 'AI service unavailable. Please try again.' });
  }
}

module.exports = { chat };
