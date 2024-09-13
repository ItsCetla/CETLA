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

            if (currentMarket === 'totals') {
                // Handle totals for both Over and Under in two separate rows
                addTotalsRow(game, rowClass);
            } else {
                // Process odds for away and home teams
                const awayTeam = game.away_team;
                const homeTeam = game.home_team;
                addOddsRow(game, awayTeam, rowClass, 'away');
                addOddsRow(game, homeTeam, rowClass, 'home');
            }

            rowIndex += (currentMarket === 'totals') ? 2 : 2; // Increment accordingly for totals or regular odds
        });
    } catch (error) {
        console.error('Error fetching odds:', error);
    }
}

// Add totals row function to handle the totals market (Over on top, Under below)
function addTotalsRow(game, rowClass) {
    // Create two rows, one for Over and one for Under

    // Over Row
    const overRow = document.createElement('tr');
    overRow.classList.add(rowClass);

    const overLabelCell = document.createElement('td');
    overLabelCell.textContent = `${game.away_team} vs. ${game.home_team} (Over)`;
    overLabelCell.classList.add('team-cell');
    overRow.appendChild(overLabelCell);

    let bestOverOdds = -Infinity;
    let bestOverIndex = null;

    // Under Row
    const underRow = document.createElement('tr');
    underRow.classList.add(rowClass);

    const underLabelCell = document.createElement('td');
    underLabelCell.textContent = `${game.away_team} vs. ${game.home_team} (Under)`;
    underLabelCell.classList.add('team-cell');
    underRow.appendChild(underLabelCell);

    let bestUnderOdds = -Infinity;
    let bestUnderIndex = null;

    // Process both Over and Under for each bookmaker
    ['DraftKings', 'Fliff', 'BetOnline.ag'].forEach((bookmakerName, index) => {
        const bookmaker = game.bookmakers.find(b => b.title === bookmakerName);
        
        // Over odds cell
        const overOddsCell = document.createElement('td');
        overOddsCell.classList.add('odds-cell');
        
        // Under odds cell
        const underOddsCell = document.createElement('td');
        underOddsCell.classList.add('odds-cell');

        if (bookmaker) {
            const market = bookmaker.markets.find(market => market.key === 'totals');
            const overOutcome = market.outcomes.find(outcome => outcome.name === 'Over');
            const underOutcome = market.outcomes.find(outcome => outcome.name === 'Under');

            // Display the Over odds
            if (overOutcome) {
                let overDisplayValue = `O${overOutcome.point} (${overOutcome.price})`;
                overOddsCell.textContent = overDisplayValue;

                // Track best Over odds
                if (overOutcome.price > bestOverOdds) {
                    bestOverOdds = overOutcome.price;
                    bestOverIndex = index;
                }
            } else {
                overOddsCell.textContent = '-';
            }

            // Display the Under odds
            if (underOutcome) {
                let underDisplayValue = `U${underOutcome.point} (${underOutcome.price})`;
                underOddsCell.textContent = underDisplayValue;

                // Track best Under odds
                if (underOutcome.price > bestUnderOdds) {
                    bestUnderOdds = underOutcome.price;
                    bestUnderIndex = index;
                }
            } else {
                underOddsCell.textContent = '-';
            }
        } else {
            overOddsCell.textContent = '-';
            underOddsCell.textContent = '-';
        }

        // Append the Over and Under odds cells to their respective rows
        overRow.appendChild(overOddsCell);
        underRow.appendChild(underOddsCell);
    });

    // Highlight the best Over and Under odds
    if (bestOverIndex !== null) {
        const overCells = overRow.querySelectorAll('.odds-cell');
        overCells[bestOverIndex].classList.add('highlight-green-box');
    }
    if (bestUnderIndex !== null) {
        const underCells = underRow.querySelectorAll('.odds-cell');
        underCells[bestUnderIndex].classList.add('highlight-green-box');
    }

    // Append the Over and Under rows to the table
    document.querySelector('#oddsTable tbody').appendChild(overRow);
    document.querySelector('#oddsTable tbody').appendChild(underRow);
}

// Add odds row function for other markets (unchanged)
function addOddsRow(game, team, rowClass, teamType) {
    const teamRow = document.createElement('tr');
    teamRow.classList.add(rowClass);

    const teamCell = document.createElement('td');
    teamCell.textContent = team;
    teamCell.classList.add('team-cell');
    teamRow.appendChild(teamCell);

    let bestOdds = -Infinity;
    let bestBookmakerIndex = null;

    const oddsData = {};
    ['DraftKings', 'Fliff', 'BetOnline.ag'].forEach((bookmakerName, index) => {
        const bookmaker = game.bookmakers.find(b => b.title === bookmakerName);
        const oddsCell = document.createElement('td');
        oddsCell.classList.add('odds-cell');

        if (bookmaker) {
            const market = bookmaker.markets.find(market => market.key === currentMarket);
            const outcome = market.outcomes.find(outcome => outcome.name === team);
            let displayValue = currentMarket === 'h2h' ? outcome.price : `${outcome.point} (${outcome.price})`;

            if (currentMarket === 'h2h' && outcome.price > 0) {
                displayValue = `+${outcome.price}`;
            }

            oddsCell.textContent = displayValue;
            oddsData[bookmakerName] = outcome.price;

            if (outcome.price > bestOdds) {
                bestOdds = outcome.price;
                bestBookmakerIndex = index;
            }

            const previousPrice = previousOdds[team]?.[bookmakerName];
            if (previousPrice !== undefined) {
                if (outcome.price > previousPrice) {
                    oddsCell.classList.add('highlight-green');
                } else if (outcome.price < previousPrice) {
                    oddsCell.classList.add('highlight-red');
                }

                setTimeout(() => {
                    oddsCell.classList.remove('highlight-green', 'highlight-red');
                }, 5000);
            }

            if (!previousOdds[team]) previousOdds[team] = {};
            previousOdds[team][bookmakerName] = outcome.price;

        } else {
            oddsCell.textContent = '-';
        }

        teamRow.appendChild(oddsCell);
    });

    if (bestBookmakerIndex !== null) {
        const oddsCells = teamRow.querySelectorAll('.odds-cell');
        oddsCells[bestBookmakerIndex].classList.add('highlight-green-box');
    }

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