// server.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

// Endpoint to handle standings update
app.post('/update-standings', (req, res) => {
    const updatedData = req.body;

    fs.writeFile(path.join(__dirname, 'public', 'standings.json'), JSON.stringify(updatedData, null, 2), (err) => {
        if (err) {
            console.error('Error writing file:', err);
            res.status(500).send('Error saving data');
        } else {
            res.send({ message: 'Data saved successfully' });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});