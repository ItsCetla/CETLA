const apiKey = '7e1db0abf8d464e52111f52c34b87fa3'; // Replace with your API Key
const apiUrl = `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?regions=us2,us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=${apiKey}`;

let currentMarket = 'h2h'; // Default to moneylines
let previousOdds = {}; // Store previous odds to compare
let refreshInterval = 10000; // Default refresh interval (10 seconds)
let refreshTimer = null; // To store the interval ID

// Fetch odds function
async function fetchOdds() {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        const oddsTable = document.querySelector('#oddsTable tbody');
        oddsTable.innerHTML = ''; // Clear the table before populating

        let rowIndex = 0; // Track rows for alternating background

        data.forEach(game => {
            const rowClass = (rowIndex % 4 < 2) ? 'lighter-blue' : 'darker-blue';

            const awayTeam = game.away_team;
            const homeTeam = game.home_team;

            if (currentMarket === 'totals') {
                // Handle totals, similar logic applies for other markets
            } else {
                // Process odds for away and home teams
                addOddsRow(game, awayTeam, rowClass, 'away');
                addOddsRow(game, homeTeam, rowClass, 'home');
            }

            rowIndex += 2; // Increment by 2 for the next game
        });
    } catch (error) {
        console.error('Error fetching odds:', error);
    }
}

// Add odds row function
function addOddsRow(game, team, rowClass, teamType) {
    const teamRow = document.createElement('tr');
    teamRow.classList.add(rowClass);

    const teamCell = document.createElement('td');
    teamCell.textContent = team;
    teamCell.classList.add('team-cell');
    teamRow.appendChild(teamCell);

    ['DraftKings', 'Fliff', 'BetOnline.ag'].forEach(bookmakerName => {
        const bookmaker = game.bookmakers.find(b => b.title === bookmakerName);
        const oddsCell = document.createElement('td');
        oddsCell.classList.add('odds-cell');

        if (bookmaker) {
            const market = bookmaker.markets.find(market => market.key === currentMarket);
            const outcome = market.outcomes.find(outcome => outcome.name === team);
            let displayValue = currentMarket === 'h2h' ? outcome.price : `${outcome.point} (${outcome.price})`;

            // Format odds and compare with previous odds
            if (currentMarket === 'h2h' && outcome.price > 0) {
                displayValue = `+${outcome.price}`;
            }

            const previousPrice = previousOdds[team]?.[bookmakerName];
            oddsCell.textContent = displayValue;

            if (previousPrice !== undefined) {
                if (outcome.price > previousPrice) {
                    oddsCell.classList.add('highlight-green');
                } else if (outcome.price < previousPrice) {
                    oddsCell.classList.add('highlight-red');
                }

                // Remove the highlight class after 1 second to simulate a flash effect
                setTimeout(() => {
                    oddsCell.classList.remove('highlight-green', 'highlight-red');
                }, 1000);
            }

            // Save the current odds for comparison later
            if (!previousOdds[team]) previousOdds[team] = {};
            previousOdds[team][bookmakerName] = outcome.price;

        } else {
            oddsCell.textContent = '-';
        }

        teamRow.appendChild(oddsCell);
    });

    document.querySelector('#oddsTable tbody').appendChild(teamRow);
}

// Manual refresh function
document.querySelector('#manual-refresh-btn').addEventListener('click', () => {
    fetchOdds();
});

// Handle auto-refresh logic
function handleAutoRefresh() {
    const isDisabled = document.querySelector('#disable-auto-refresh').checked;
    const intervalInput = document.querySelector('#refresh-interval').value;

    if (refreshTimer) {
        clearInterval(refreshTimer); // Clear existing timer
    }

    if (!isDisabled) {
        const interval = parseInt(intervalInput) * 1000; // Convert to milliseconds
        refreshInterval = interval >= 5000 ? interval : 10000; // Minimum 5 seconds
        refreshTimer = setInterval(fetchOdds, refreshInterval);
    }
}

// Detect when auto-refresh toggle or interval input changes
document.querySelector('#refresh-interval').addEventListener('input', handleAutoRefresh);
document.querySelector('#disable-auto-refresh').addEventListener('change', handleAutoRefresh);

// Tab switching logic remains the same
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        currentMarket = button.dataset.tab === 'moneylines' ? 'h2h' : button.dataset.tab === 'spreads' ? 'spreads' : 'totals';

        fetchOdds(); // Fetch odds for the selected market
    });
});

// Initial fetch and auto-refresh setup
fetchOdds();
refreshTimer = setInterval(fetchOdds, refreshInterval);
