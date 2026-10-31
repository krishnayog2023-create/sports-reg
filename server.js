const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 10000;

// Initialize Supabase Client (HTTP/REST API based, no SSL certificate errors)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Register Endpoint
app.post('/api/register', async (req, res) => {
  try {
    console.log("Form data received:", req.body); // Terminal mein check karne ke liye
    
    const { sport, category, fullName, name, participantName, participants, primaryCode, gender } = req.body;
    
    // Frontend se jo bhi sahi naam aaye, use pakad lo
    const playerName = fullName || participantName || name || (typeof participants === 'string' ? participants : null) || "Unknown Player";
    const reg_code = 'NKT-' + Math.floor(100000 + Math.random() * 900000);

    const { data, error } = await supabase
      .from('registrations')
      .insert([{ 
        reg_code, 
        sport, 
        category, 
        participants: playerName 
      }]);

    if (error) throw error;

    res.status(200).json({ success: true, reg_code });
  } catch (err) {
    console.error("Database error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});