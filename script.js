document.addEventListener('DOMContentLoaded', function() {
    // Get modal elements
    const modal = document.getElementById('schedule-modal');
    const viewScheduleBtn = document.getElementById('view-schedule');
    const closeBtn = document.getElementById('close-modal');

    // Open modal when View Schedule button is clicked
    if (viewScheduleBtn) {
        viewScheduleBtn.addEventListener('click', function() {
            modal.style.display = "block";
        });
    }

    // Close modal when X is clicked
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = "none";
            // Remove expanded class from all team rows
            const teamRows = document.querySelectorAll('.team-row');
            teamRows.forEach(row => row.classList.remove('expanded'));
        });
    }

    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });

    // Set up tab switching functionality once
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Season selection handling
    const seasonSelect = document.getElementById('season-select');
    let currentSeason = 'session3'; // Set default season to Multi-Car

    // Function to get the correct path for season data
    function getSeasonPath(season) {
        switch(season) {
            case 'session4html':
                return 'session4html/session4';  // Path for People Pick season
            case 'session3':
                return 'session3';  // Path for Multi-Car season
            case 'session4':
            default:
                return season;  // Path for current season (Road Cars)
        }
    }

    if (seasonSelect) {
        seasonSelect.addEventListener('change', function() {
            currentSeason = this.value;
            clearCurrentData();
            loadSeasonData(currentSeason);
        });
    }

    // Initial load for the default season
    loadSeasonData(currentSeason);

    // Function to clear current data
    function clearCurrentData() {
        // Clear team standings
        const teamStandingsBody = document.querySelector('#team-standings .table-container tbody');
        if (teamStandingsBody) teamStandingsBody.innerHTML = '';

        // Clear driver standings
        const driverStandingsBody = document.querySelector('#driver-standings .table-container tbody');
        if (driverStandingsBody) driverStandingsBody.innerHTML = '';

        // Clear race selector if it exists
        const raceSelect = document.getElementById('race-select');
        if (raceSelect) raceSelect.innerHTML = '';

        // Clear statistics if they exist
        const statsElements = ['most-wins', 'most-podiums', 'avg-points', 'avg-placement'];
        statsElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) element.innerHTML = '';
        });
    }

    // Function to calculate team points based on driver colors
    function calculateTeamPoints(driversData, teamsData) {
        const teamPoints = {};

        // Initialize team points
        teamsData.forEach(team => {
            teamPoints[team.name] = 0;
        });

        // Aggregate points for each team based on driver colors
        driversData.forEach(driver => {
            const team = teamsData.find(team => team.color === driver.color);
            if (team) {
                teamPoints[team.name] += driver.points;
            }
        });

        return teamPoints;
    }

    // Function to display team standings with calculated points
    function displayTeamStandingsWithPoints(teamsData, driversData) {
        const teamPoints = calculateTeamPoints(driversData, teamsData);
        const tableBody = document.querySelector('#team-standings .table-container tbody');
        if (!tableBody) return;

        const teamsWithDrivers = teamsData.map(team => {
            return {
                ...team,
                drivers: driversData.filter(driver => driver.color === team.color)
            };
        });

        const sortedTeams = teamsWithDrivers.sort((a, b) => teamPoints[b.name] - teamPoints[a.name]);

        tableBody.innerHTML = sortedTeams.map(team => `
            <tr class="table-row team-row" data-team="${team.name}">
                <td>
                    <span class="driver-name" style="border-left: 4px solid ${team.color}">${team.name}</span>
                </td>
                <td>
                    <span class="points">${teamPoints[team.name]} PTS</span>
                </td>
            </tr>
            <tr class="driver-details hidden" data-team="${team.name}">
                <td colspan="2">
                    <div class="team-drivers">
                        ${team.drivers.map(driver => `
                            <div class="team-driver">
                                <span class="driver-name" style="border-left: 4px solid ${driver.color}">${driver.name}</span>
                                <span class="points">${driver.points} PTS</span>
                            </div>
                        `).join('')}
                    </div>
                </td>
            </tr>
        `).join('');

        // Add click event listeners to team rows
        const teamRows = tableBody.querySelectorAll('.team-row');
        teamRows.forEach(row => {
            row.addEventListener('click', () => {
                const teamName = row.dataset.team;
                const driverDetails = tableBody.querySelector(`.driver-details[data-team="${teamName}"]`);
                row.classList.toggle('expanded');
                driverDetails.classList.toggle('hidden');
            });
        });
    }

    // Function to load data for the selected season
    function loadSeasonData(season) {
        const seasonPath = getSeasonPath(season);
        Promise.all([
            fetch(`${seasonPath}/drivers.json`).then(response => response.json()),
            fetch(`${seasonPath}/teams.json`).then(response => response.json()),
            fetch(`${seasonPath}/race_results.json`).then(response => response.json())
        ]).then(([driversData, teamsData, raceData]) => {
            // Display team standings with calculated points
            displayTeamStandingsWithPoints(teamsData, driversData);
            // Display driver standings
            displayDriverStandings(driversData);
            
            // Load race results data
            displayRaceResults(raceData, seasonPath);
            
            // Calculate and display statistics
            loadStatistics(raceData, seasonPath);
        }).catch(error => {
            console.error('Error loading season data:', error);
            const errorMessage = `Error loading data for ${season}. Please try again.`;
            alert(errorMessage);
        });
    }

    // Function to display race results
    function displayRaceResults(raceData, season) {
        const raceSelect = document.getElementById('race-select');
        if (raceSelect) {
            raceSelect.innerHTML = ''; // Clear existing options
            raceData.forEach(race => {
                const option = document.createElement('option');
                option.value = race.race_id;
                option.textContent = race.race_name;
                raceSelect.appendChild(option);
            });

            // Remove existing event listeners by cloning and replacing
            const newRaceSelect = raceSelect.cloneNode(true);
            raceSelect.parentNode.replaceChild(newRaceSelect, raceSelect);

            // Add new event listener
            newRaceSelect.addEventListener('change', function() {
                const selectedRace = raceData.find(race => race.race_id === this.value);
                if (selectedRace) {
                    displayRaceDetails(selectedRace, season);
                }
            });

            // Display first race by default
            if (raceData.length > 0) {
                displayRaceDetails(raceData[0], season);
            }
        }
    }
});

function displayRaceDetails(race, season) {
    const seasonPath = getSeasonPath(season);
    // Update track image
    const trackImage = document.getElementById('track-image');
    if (trackImage) {
        trackImage.src = race.track_image;
        trackImage.alt = `${race.race_name} Track Layout`;
    }

    // Update race settings
    const raceSettings = document.getElementById('race-settings');
    if (raceSettings) {
        raceSettings.innerHTML = `
            <h2>Race Settings</h2>
            <ul>
                <li><strong>Car:</strong> ${race.settings.car}</li>
                <li><strong>Weather:</strong> ${race.settings.weather}</li>
                <li><strong>Laps:</strong> ${race.settings.laps}</li>
                <li><strong>Other Settings:</strong> ${race.settings.other_settings}</li>
            </ul>
        `;
    }

    // Update results table with driver colors
    fetch(`${seasonPath}/drivers.json`)
        .then(response => response.json())
        .then(driversData => {
            const driverColors = {};
            driversData.forEach(driver => {
                driverColors[driver.name] = driver.color;
            });

            const tableBody = document.querySelector('#race-details .table-container tbody');
            if (tableBody) {
                tableBody.innerHTML = race.results.map(result => `
                    <tr class="table-row">
                        <td>
                            <span class="position">${result.position}</span>
                            <span class="driver-name" style="border-left: 4px solid ${driverColors[result.driver] || '#ccc'}">
                                ${result.driver}
                                ${result.car ? `<br><small style="font-size: 0.8em; color: #666;">${result.car}${result.fastest_lap ? `&emsp;Fastest Lap: ${result.fastest_lap}` : ''}</small>` : ''}
                            </span>
                        </td>
                        <td>
                            <span class="points">${result.points} PTS</span>
                        </td>
                    </tr>
                `).join('');
            }
        });
}

function loadStatistics(raceData, season) {
    const seasonPath = getSeasonPath(season);
    fetch(`${seasonPath}/drivers.json`)
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

// Helper function to get season path
function getSeasonPath(season) {
    switch(season) {
        case 'session4html':
            return 'session4html/session4';  // Path for People Pick season
        case 'session3':
            return 'session3';  // Path for Multi-Car season
        case 'session4':
        default:
            return season;  // Path for current season (Road Cars)
    }
}