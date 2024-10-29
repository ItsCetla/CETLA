document.addEventListener('DOMContentLoaded', function() {
    Promise.all([
        fetch('drivers.json').then(response => response.json()),
        fetch('teams.json').then(response => response.json()),
        fetch('race_results.json').then(response => response.json())
    ]).then(([driversData, teamsData, raceData]) => {
        // Display team standings
        displayTeamStandings(teamsData);
        // Display driver standings
        displayDriverStandings(driversData);
        
        // Continue with existing race results and statistics handling
        // Tab switching functionality
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Load race results data
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
                raceSelect.addEventListener('change', function() {
                    const selectedRace = data.find(race => race.race_id === this.value);
                    displayRaceDetails(selectedRace);
                });

                // Display first race by default
                if (data.length > 0) {
                    displayRaceDetails(data[0]);
                }

                // Calculate and display statistics
                loadStatistics(data);
            })
            .catch(error => console.error('Error loading race data:', error));
    });
});

function displayRaceDetails(race) {
    // Update track image
    const trackImage = document.getElementById('track-image');
    trackImage.src = race.track_image;
    trackImage.alt = `${race.race_name} Track Layout`;

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

    // Update results table with driver colors
    fetch('drivers.json')
        .then(response => response.json())
        .then(driversData => {
            const driverColors = {};
            driversData.forEach(driver => {
                driverColors[driver.name] = driver.color;
            });

            const tableBody = document.querySelector('#race-details .table-container tbody');
            tableBody.innerHTML = race.results.map(result => `
                <tr class="table-row">
                    <td>
                        <span class="position">${result.position}</span>
                        <span class="driver-name" style="border-left: 4px solid ${driverColors[result.driver] || '#ccc'}">${result.driver}</span>
                    </td>
                    <td>
                        <span class="points">${result.points} PTS</span>
                    </td>
                </tr>
            `).join('');
        });
}

function loadStatistics(raceData) {
    fetch('drivers.json')
        .then(response => response.json())
        .then(driversData => {
            const driverColors = {};
            driversData.forEach(driver => {
                driverColors[driver.name] = driver.color;
            });

            const stats = calculateStats(raceData);
            displayStats(stats, driverColors);
        });
}

function calculateStats(raceData) {
    const stats = {
        wins: {},
        podiums: {},
        avgPoints: {},
        avgPlacement: {},
        raceCount: {}
    };

    // First, count races for each driver
    raceData.forEach(race => {
        race.results.forEach(result => {
            const driver = result.driver;
            stats.raceCount[driver] = (stats.raceCount[driver] || 0) + 1;
        });
    });

    // Initialize stats only for eligible drivers (3+ races)
    const eligibleDrivers = Object.entries(stats.raceCount)
        .filter(([_, count]) => count >= 3)
        .map(([driver]) => driver);

    // Calculate stats only for eligible drivers
    raceData.forEach(race => {
        race.results.forEach(result => {
            const driver = result.driver;
            
            if (eligibleDrivers.includes(driver)) {
                // Initialize stats for eligible drivers
                if (!stats.wins[driver]) stats.wins[driver] = 0;
                if (!stats.podiums[driver]) stats.podiums[driver] = 0;
                if (!stats.avgPoints[driver]) stats.avgPoints[driver] = { total: 0, races: 0 };
                if (!stats.avgPlacement[driver]) stats.avgPlacement[driver] = { total: 0, races: 0 };

                // Count wins and podiums
                if (result.position === 1) stats.wins[driver]++;
                if (result.position <= 3) stats.podiums[driver]++;

                // Sum points and placements
                stats.avgPoints[driver].total += result.points;
                stats.avgPoints[driver].races++;
                stats.avgPlacement[driver].total += result.position;
                stats.avgPlacement[driver].races++;
            }
        });
    });

    // Calculate averages for eligible drivers
    eligibleDrivers.forEach(driver => {
        stats.avgPoints[driver] = Math.round((stats.avgPoints[driver].total / stats.avgPoints[driver].races) * 10) / 10;
        stats.avgPlacement[driver] = Math.round(stats.avgPlacement[driver].total / stats.avgPlacement[driver].races);
    });

    return stats;
}

function displayStats(stats, driverColors) {
    // Most Wins (top 5)
    document.getElementById('most-wins').innerHTML = generateStatsList(stats.wins, driverColors, '', false, 5);
    
    // Most Podiums (top 5)
    document.getElementById('most-podiums').innerHTML = generateStatsList(stats.podiums, driverColors, '', false, 5);
    
    // Average Points (top 5)
    document.getElementById('avg-points').innerHTML = generateStatsList(stats.avgPoints, driverColors, ' pts', false, 5);
    
    // Average Placement (all eligible drivers, multi-column)
    document.getElementById('avg-placement').innerHTML = generateStatsListMultiColumn(stats.avgPlacement, driverColors);
}

function generateStatsList(data, colors, suffix = '', ascending = false, limit = 5) {
    return Object.entries(data)
        .filter(([_, value]) => value > 0)  // Filter out zero values
        .sort(([,a], [,b]) => ascending ? a - b : b - a)
        .slice(0, limit)
        .map(([driver, value]) => `
            <div class="stat-row">
                <span class="driver-name" style="border-left: 4px solid ${colors[driver] || '#ccc'}">${driver}</span>
                <span class="stat-value">${value}${suffix}</span>
            </div>
        `).join('');
}

function generateStatsListMultiColumn(data, colors) {
    const sortedEntries = Object.entries(data)
        .sort(([,a], [,b]) => a - b);  // Sort ascending for placement
    
    // Split the data into groups of 5
    const groupSize = 5;
    const groups = [];
    for (let i = 0; i < sortedEntries.length; i += groupSize) {
        groups.push(sortedEntries.slice(i, i + groupSize));
    }
    
    return groups.map(group => `
        <div class="stat-card">
            ${group.map(([driver, value]) => `
                <div class="stat-row">
                    <span class="driver-name" style="border-left: 4px solid ${colors[driver] || '#ccc'}">${driver}</span>
                    <span class="stat-value">${value}</span>
                </div>
            `).join('')}
        </div>
    `).join('');
}

function displayTeamStandings(teamsData) {
    const tableBody = document.querySelector('#team-standings .table-container tbody');
    if (!tableBody) return;

    const sortedTeams = teamsData.sort((a, b) => b.points - a.points);
    
    tableBody.innerHTML = sortedTeams.map(team => `
        <tr class="table-row">
            <td>
                <span class="driver-name" style="border-left: 4px solid ${team.color}">${team.name}</span>
            </td>
            <td>
                <span class="points">${team.points} PTS</span>
            </td>
        </tr>
    `).join('');
}

function displayDriverStandings(driversData) {
    const tableBody = document.querySelector('#driver-standings .table-container tbody');
    if (!tableBody) return;

    const sortedDrivers = driversData.sort((a, b) => b.points - a.points);
    
    tableBody.innerHTML = sortedDrivers.map(driver => `
        <tr class="table-row">
            <td>
                <span class="driver-name" style="border-left: 4px solid ${driver.color}">${driver.name}</span>
            </td>
            <td>
                <span class="points">${driver.points} PTS</span>
            </td>
        </tr>
    `).join('');
}