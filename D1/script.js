// script.js

document.addEventListener('DOMContentLoaded', function () {
    // Modal functionality
    var modal = document.getElementById('schedule-modal');
    var btn = document.getElementById('view-schedule');
    var span = document.getElementById('close-modal');

    // Open the modal when the button is clicked
    btn.onclick = function () {
        modal.style.display = 'block';
    };

    // Close the modal when the close icon is clicked
    span.onclick = function () {
        modal.style.display = 'none';
    };

    // Close the modal when clicking outside of it
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    // Tab functionality
    var tabButtons = document.querySelectorAll('.tab-button');
    var tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            // Remove 'active' class from all buttons and contents
            tabButtons.forEach(function (btn) {
                btn.classList.remove('active');
            });
            tabContents.forEach(function (content) {
                content.classList.remove('active');
            });

            // Add 'active' class to clicked button and corresponding content
            this.classList.add('active');
            var tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Fetch and render standings
    fetch('standings.json')
        .then(response => response.json())
        .then(data => {
            renderStandings(data);
        })
        .catch(error => console.error('Error fetching data:', error));
});

function renderStandings(data) {
    renderTable('team-standings-table', data.teams, 'team');
    renderTable('driver-standings-table', data.drivers, 'driver');
}

function renderTable(tableId, standings, type) {
    const table = document.getElementById(tableId);
    const tbody = document.createElement('tbody');

    standings.sort((a, b) => a.position - b.position);

    standings.forEach(entry => {
        const tr = document.createElement('tr');
        tr.classList.add('table-row');

        tr.innerHTML = `
            <td>
                <span class="position" style="border-right-color: ${entry.color};">${entry.position}</span>
                <span class="${type}-name">${entry.name}</span>
            </td>
            <td>
                <span class="points">${entry.points} PTS</span><i class="fas fa-chevron-right"></i>
            </td>
        `;

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
}