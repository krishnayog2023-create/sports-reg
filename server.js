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

// 1. Register Endpoint with Same-Sport Primary Code & 3-Girls Validation
app.post('/register', async (req, res) => {
    try {
        const sportName = (req.body.sport || '').trim();
        const membersArray = req.body.members || [];

        // Enforce restriction: Box Cricket and Volleyball require at least 3 girls
        const lowerSport = sportName.toLowerCase();
        if (lowerSport.includes('box cricket') || lowerSport.includes('volleyball')) {
            let girlCount = membersArray.filter(m => {
                const g = (m.gender || '').toLowerCase();
                return g === 'girl' || g === 'female' || g === 'g';
            }).length;

            if (girlCount < 3) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Validation Error: Box Cricket and Volleyball teams must include at least 3 female participants.' 
                });
            }
        }

        let participantValue = 'Unknown Player';
        if (membersArray.length > 0) {
            participantValue = membersArray
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

        // Extract incoming reg_code or primary_code
        let regCodeValue = req.body.reg_code || req.body.primary_code;
        if (!regCodeValue && membersArray.length > 0) {
            regCodeValue = membersArray[0].primary_code || membersArray[0].reg_code;
        }

        // Ensure reg_code exists or fallback to unique timestamp
        if (!regCodeValue || String(regCodeValue).trim() === '' || regCodeValue === 'undefined' || regCodeValue === 'null') {
            regCodeValue = 'REG-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900);
        } else {
            regCodeValue = String(regCodeValue).trim();
        }

        // CHECK: Same primary code cannot register twice in the SAME sport
        const { data: duplicateCheck, error: checkError } = await supabase
            .from('registrations')
            .select('reg_code, sport')
            .eq('reg_code', regCodeValue)
            .ilike('sport', sportName)
            .maybeSingle();

        if (duplicateCheck) {
            return res.status(400).json({ 
                success: false, 
                error: `Registration Error: Primary code '${regCodeValue}' is already registered for '${sportName}'. You can use this code for other sports, but not twice in the same game.` 
            });
        }

        const { data, error } = await supabase
            .from('registrations')
            .insert([
                {
                    category: req.body.category || 'Individual',
                    sport: sportName,
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

// 2. Admin Get Endpoint
app.get('/api/registrations', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('registrations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Admin Delete Endpoint
app.delete('/api/registrations/:reg_code', async (req, res) => {
    try {
        const { reg_code } = req.params;
        const { error } = await supabase
            .from('registrations')
            .delete()
            .eq('reg_code', reg_code);

        if (error) throw error;
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Admin Update Endpoint
app.put('/api/registrations/:reg_code', async (req, res) => {
    try {
        const { reg_code } = req.params;
        const { sport, category, participants } = req.body;

        const { error } = await supabase
            .from('registrations')
            .update({ sport, category, participants })
            .eq('reg_code', reg_code);

        if (error) throw error;
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});