// script.js

document.addEventListener('DOMContentLoaded', function () {
    // Modal functionality remains the same
    var modal = document.getElementById('schedule-modal');
    var btn = document.getElementById('view-schedule');
    var span = document.getElementById('close-modal');

    btn.onclick = function () {
        modal.style.display = 'block';
    };

    span.onclick = function () {
        modal.style.display = 'none';
    };

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    // Tab functionality remains the same
    var tabButtons = document.querySelectorAll('.tab-button');
    var tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            tabButtons.forEach(function (btn) {
                btn.classList.remove('active');
            });
            tabContents.forEach(function (content) {
                content.classList.remove('active');
            });
            this.classList.add('active');
            var tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Fetch and display driver standings
    fetch('drivers.json')
        .then(response => response.json())
        .then(data => {
            // Sort drivers by points in descending order
            data.sort((a, b) => b.points - a.points);

            // Generate driver standings table
            const driverStandingsTable = document.querySelector('#driver-standings .table-container tbody');
            driverStandingsTable.innerHTML = ''; // Clear existing content

            data.forEach((driver, index) => {
                const row = document.createElement('tr');
                row.classList.add('table-row');

                // Set CSS variable for dash color
                row.style.setProperty('--dash-color', driver.color);

                row.innerHTML = `
                    <td>
                        <span class="position">${index + 1}</span>
                        <span class="driver-name">${driver.name}</span>
                    </td>
                    <td>
                        <span class="points">${driver.points} PTS</span><i class="fas fa-chevron-right"></i>
                    </td>
                `;

                driverStandingsTable.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error fetching driver data:', error);
        });

    // Fetch and display team standings
    fetch('teams.json')
        .then(response => response.json())
        .then(data => {
            // Sort teams by points in descending order
            data.sort((a, b) => b.points - a.points);

            // Generate team standings table
            const teamStandingsTable = document.querySelector('#team-standings .table-container tbody');
            teamStandingsTable.innerHTML = ''; // Clear existing content

            data.forEach((team, index) => {
                const row = document.createElement('tr');
                row.classList.add('table-row', 'team-row');

                // Set CSS variables for border and dash colors
  
                row.style.setProperty('--dash-color', team.color);

                row.innerHTML = `
                    <td>
                        <span class="position">${index + 1}</span>
                        <span class="team-name">${team.name}</span>
                    </td>
                    <td>
                        <span class="points">${team.points} PTS</span><i class="fas fa-chevron-right"></i>
                    </td>
                `;

                teamStandingsTable.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error fetching team data:', error);
        });
});