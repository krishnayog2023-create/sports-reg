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
app.post('/register', async (req, res) => {
    try {
        // Frontend form se aane wale alag-alag field names ko check karega
        const participantValue = 
            req.body.participants || 
            req.body.participantName || 
            req.body.name || 
            req.body.fullName || 
            'Unknown Player';

        const { data, error } = await supabase
            .from('registrations')
            .insert([
                {
                    category: req.body.category || 'Individual',
                    sport: req.body.sport || '',
                    participants: participantValue // Ab yahan sahi name/data save hoga
                }
            ]);

        if (error) {
            console.error('Supabase Error:', error);
            return res.status(400).json({ success: false, error: error.message });
        }

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Server Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});