const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 10000;

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Register Endpoint
app.post('/register', async (req, res) => {
    try {
        // Extract player names from members array or fallback fields
        let participantValue = 'Unknown Player';
        if (req.body.members && Array.isArray(req.body.members) && req.body.members.length > 0) {
            participantValue = req.body.members
                .map(m => m.name || m.fullName)
                .filter(Boolean)
                .join(', ');
        } else {
            participantValue = 
                req.body.participants || 
                req.body.participantName || 
                req.body.name || 
                req.body.fullName || 
                'Unknown Player';
        }

        // Extract or generate unique reg_code to avoid duplicate key errors
        let regCodeValue = req.body.reg_code || req.body.primary_code;
        if (!regCodeValue && req.body.members && Array.isArray(req.body.members) && req.body.members.length > 0) {
            regCodeValue = req.body.members[0].primary_code || req.body.members[0].reg_code;
        }
        if (!regCodeValue) {
            regCodeValue = 'REG-' + Math.floor(100000 + Math.random() * 900000);
        }

        const { data, error } = await supabase
            .from('registrations')
            .insert([
                {
                    category: req.body.category || 'Individual',
                    sport: req.body.sport || '',
                    participants: participantValue,
                    reg_code: regCodeValue
                }
            ]);

        if (error) {
            console.error('Supabase Error:', error);
            return res.status(400).json({ success: false, error: error.message });
        }

        return res.status(200).json({ success: true, data, reg_code: regCodeValue });
    } catch (err) {
        console.error('Server Error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});