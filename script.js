// script.js

document.addEventListener('DOMContentLoaded', function () {
    // Modal functionality (on index.html)
    var modal = document.getElementById('schedule-modal');
    var btn = document.getElementById('view-schedule');
    var span = document.getElementById('close-modal');

    if (btn && modal && span) {
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
    }

    // Tab functionality (on index.html)
    var tabButtons = document.querySelectorAll('.tab-button');
    var tabContents = document.querySelectorAll('.tab-content');

    if (tabButtons.length && tabContents.length) {
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
    }

    // Fetch and display driver standings (on index.html)
    if (document.querySelector('#driver-standings')) {
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
    }

    // Fetch and display team standings (on index.html)
    if (document.querySelector('#team-standings')) {
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
    }

    if (document.getElementById('race-results')) {
        // Fetch race results data
        fetch('race_results.json')
            .then(response => response.json())
            .then(data => {
                // Populate race selector
                const raceSelect = document.getElementById('race-select');
                data.forEach(race => {
                    const option = document.createElement('option');
                    option.value = race.race_id;
                    option.textContent = race.race_name;
                    raceSelect.appendChild(option);
                });

                // Event listener for race selection
                raceSelect.addEventListener('change', function () {
                    const selectedRaceId = this.value;
                    const selectedRace = data.find(race => race.race_id === selectedRaceId);
                    displayRaceDetails(selectedRace);
                });

                // Display the first race by default
                if (data.length > 0) {
                    raceSelect.value = data[0].race_id;
                    displayRaceDetails(data[0]);
                }
            })
            .catch(error => {
                console.error('Error fetching race results data:', error);
            });

        function displayRaceDetails(race) {
            // Update track image
            const trackImage = document.getElementById('track-image');
            trackImage.src = race.track_image;
            trackImage.alt = race.race_name;

            // Update race settings
            const raceSettings = document.getElementById('race-settings');
            raceSettings.innerHTML = `
                <h2>Race Settings</h2>
                <ul>
                    <li><strong>Car:</strong> ${race.settings.car}</li>
                    <li><strong>Weather:</strong> ${race.settings.weather}</li>
                    <li><strong>Laps:</strong> ${race.settings.laps}</li>
                    <li><strong>Other Settings:</strong> ${race.settings.other_settings}</li>
                </ul>
            `;

            // Update race points table
            const racePointsTable = document.querySelector('#race-details .table-container tbody');
            racePointsTable.innerHTML = ''; // Clear existing content

            // Sort results by position
            race.results.sort((a, b) => a.position - b.position);

            race.results.forEach(result => {
                const row = document.createElement('tr');
                row.classList.add('table-row');

                row.innerHTML = `
                    <td>
                        <span class="position">${result.position}</span>
                        <span class="driver-name">${result.driver}</span>
                    </td>
                    <td>
                        <span class="points">${result.points} PTS</span>
                    </td>
                `;
                racePointsTable.appendChild(row);
            });
        }
    }

});