app.post('/register', async (req, res) => {
    try {
        // Frontend ke 'members' array ya alag fields se player ka naam nikalega
        let participantValue = 'Unknown Player';
        if (req.body.members && Array.isArray(req.body.members) && req.body.members.length > 0) {
            participantValue = req.body.members.map(m => m.name || m.fullName).filter(Boolean).join(', ');
        } else {
            participantValue = req.body.participants || req.body.participantName || req.body.name || req.body.fullName || 'Unknown Player';
        }

        // 'primary_code' ya 'reg_code' ko properly extract karega, duplicate se bachne ke liye fallback bhi hai
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

        res.status(200).json({ success: true, data, reg_code: regCodeValue });
    } catch (err) {
        console.error('Server Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});