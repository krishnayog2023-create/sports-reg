const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 10000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/register', async (req, res) => {
    try {
        const sportName = (req.body.sport || '').trim();
        const categoryName = (req.body.category || 'Student').trim();
        const membersArray = req.body.members || [];
        const lowerSport = sportName.toLowerCase();
        const captainInput = (req.body.primary_code || '').trim();

        if (!captainInput) {
            return res.status(400).json({ 
                success: false, 
                error: 'Validation Error: Primary identifier (Student ID or Phone Number) is required.' 
            });
        }

        // 1. Box Cricket Validation: Exactly 10 players & Min 3 girls
        if (lowerSport.includes('box cricket')) {
            if (membersArray.length !== 10) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Validation Error: Box Cricket team must have exactly 10 players.' 
                });
            }
            let girlCount = membersArray.filter(m => {
                const g = (m.gender || '').toLowerCase();
                return g === 'girl' || g === 'female' || g === 'g';
            }).length;

            if (girlCount < 3) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Validation Error: Box Cricket team must include at least 3 female participants.' 
                });
            }
        }

        // 2. Volleyball Validation: Exactly 8 players & Min 3 girls
        if (lowerSport.includes('volleyball')) {
            if (membersArray.length !== 8) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Validation Error: Volleyball team must have exactly 8 players.' 
                });
            }
            let girlCount = membersArray.filter(m => {
                const g = (m.gender || '').toLowerCase();
                return g === 'girl' || g === 'female' || g === 'g';
            }).length;

            if (girlCount < 3) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Validation Error: Volleyball team must include at least 3 female participants.' 
                });
            }
        }

        // 3. Kabaddi Validation: 7 to 10 players
        if (lowerSport.includes('kabaddi')) {
            if (membersArray.length < 7 || membersArray.length > 10) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Validation Error: Kabaddi team must have between 7 and 10 players.' 
                });
            }
        }

        // 4. Format participant names and IDs for Excel mapping
        let participantValue = 'Unknown Player';
        if (membersArray.length > 0) {
            participantValue = membersArray
                .map(m => `${m.name} [ID: ${m.student_id || 'N/A'}]`)
                .filter(Boolean)
                .join(', ');
        } else {
            participantValue = req.body.participants || 'Unknown Player';
        }

        // 5. Generate Sport Prefix for Serial Reg Code (e.g. BC01, VB02, KB03)
        let prefix = 'GEN';
        if (lowerSport.includes('box cricket')) prefix = 'BC';
        else if (lowerSport.includes('volleyball')) prefix = 'VB';
        else if (lowerSport.includes('kabaddi')) prefix = 'KB';
        else if (lowerSport.includes('table tennis')) prefix = 'TT';
        else if (lowerSport.includes('carrom')) prefix = 'CR';

        const { count, error: countError } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .ilike('sport', sportName);

        if (countError) throw countError;
        const nextSerial = (count || 0) + 1;
        const regCodeValue = `${prefix}${String(nextSerial).padStart(2, '0')}`;

        // 6. STRICT CHECK: Same identifier cannot register twice in the SAME sport
        const { data: allSportRegs } = await supabase
            .from('registrations')
            .select('participants')
            .ilike('sport', sportName);

        let alreadyExists = false;
        if (allSportRegs) {
            allSportRegs.forEach(reg => {
                if (reg.participants && reg.participants.includes(captainInput)) {
                    alreadyExists = true;
                }
            });
        }

        if (alreadyExists) {
            return res.status(400).json({ 
                success: false, 
                error: `Registration Error: This ID/Phone number is already registered for '${sportName}'. You cannot register twice for the same game.` 
            });
        }

        // 7. Insert into Supabase
        const { data, error } = await supabase
            .from('registrations')
            .insert([
                {
                    category: categoryName,
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