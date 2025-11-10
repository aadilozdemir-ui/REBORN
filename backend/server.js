const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Route for button click
app.post('/api/button/click', (req, res) => {
  const { action, level, timestamp } = req.body;
  console.log('LevelUp App - Button clicked:', {
    action,
    level,
    timestamp: timestamp || new Date().toISOString()
  });
  res.json({ 
    success: true, 
    message: 'Button click received',
    timestamp: new Date().toISOString(),
    level: level || null
  });
});

// Route for button long press (2 seconds)
app.post('/api/button/longpress', (req, res) => {
  const { action, level, timestamp } = req.body;
  console.log('LevelUp App - Button long-pressed (2 seconds):', {
    action,
    level,
    timestamp: timestamp || new Date().toISOString()
  });
  res.json({ 
    success: true, 
    message: 'Button long-press (2 seconds) received',
    timestamp: new Date().toISOString(),
    level: level || null
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

