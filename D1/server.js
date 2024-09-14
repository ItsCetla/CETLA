// server.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

// Endpoint to handle standings update
app.post('/update-standings', (req, res) => {
    const updatedData = req.body;
    console.log('Received updated data:', updatedData);

    fs.writeFile(path.join(__dirname, 'public', 'standings.json'), JSON.stringify(updatedData, null, 2), (err) => {
        if (err) {
            console.error('Error writing file:', err);
            res.status(500).json({ message: 'Error saving data' });
        } else {
            res.json({ message: 'Data saved successfully' });
        }
    });
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});