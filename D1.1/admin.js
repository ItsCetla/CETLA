// admin.js

document.addEventListener('DOMContentLoaded', function () {
    fetch('standings.json')
        .then(response => response.json())
        .then(data => {
            populateForm(data);
        })
        .catch(error => console.error('Error fetching data:', error));

    document.getElementById('update-form').addEventListener('submit', function (e) {
        e.preventDefault();

        const updatedData = {
            teams: getFormData('team'),
            drivers: getFormData('driver')
        };

        fetch('/update-standings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        })
        .then(response => response.json())
        .then(data => {
            alert('Standings updated successfully!');
        })
        .catch(error => console.error('Error updating standings:', error));
    });

    document.getElementById('add-team').addEventListener('click', function () {
        addEntry('team', {});
    });

    document.getElementById('add-driver').addEventListener('click', function () {
        addEntry('driver', {});
    });
});

function populateForm(data) {
    data.teams.forEach(team => addEntry('team', team));
    data.drivers.forEach(driver => addEntry('driver', driver));
}

function addEntry(type, entry) {
    const container = document.getElementById(`${type}s-container`);
    const div = document.createElement('div');
    div.classList.add('entry');

    div.innerHTML = `
        <label>Position: <input type="number" name="${type}-position" value="${entry.position || ''}" required></label>
        <label>Name: <input type="text" name="${type}-name" value="${entry.name || ''}" required></label>
        <label>Points: <input type="number" name="${type}-points" value="${entry.points || ''}" required></label>
        <label>Color: <input type="text" name="${type}-color" value="${entry.color || ''}" required></label>
        <button type="button" class="remove-entry">Remove</button>
        <hr>
    `;

    div.querySelector('.remove-entry').addEventListener('click', function () {
        container.removeChild(div);
    });

    container.appendChild(div);
}

function getFormData(type) {
    const entries = [];
    const containers = document.querySelectorAll(`#${type}s-container .entry`);
    containers.forEach(container => {
        const position = container.querySelector(`input[name="${type}-position"]`).value;
        const name = container.querySelector(`input[name="${type}-name"]`).value;
        const points = container.querySelector(`input[name="${type}-points"]`).value;
        const color = container.querySelector(`input[name="${type}-color"]`).value;

        entries.push({
            position: parseInt(position),
            name: name,
            points: parseInt(points),
            color: color
        });
    });
    return entries;
}