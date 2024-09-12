const apiKey = '7e1db0abf8d464e52111f52c34b87fa3'; // Replace with your API Key
const apiUrl = `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?regions=us2,us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=${apiKey}`;

let currentMarket = 'h2h'; // Default to moneylines

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
                // For totals, combine the teams into one row
                const totalsRow = document.createElement('tr');
                totalsRow.classList.add(rowClass);

                // Combine the teams with "vs"
                const gameCell = document.createElement('td');
                gameCell.textContent = `${game.away_team} vs ${game.home_team}`;
                gameCell.classList.add('team-cell');
                totalsRow.appendChild(gameCell);

                // Add odds for DraftKings, Fliff, BetOnline
                ['DraftKings', 'Fliff', 'BetOnline.ag'].forEach(bookmakerName => {
                    const bookmaker = game.bookmakers.find(b => b.title === bookmakerName);
                    const oddsCell = document.createElement('td');
                    oddsCell.classList.add('odds-cell');

                    if (bookmaker) {
                        const market = bookmaker.markets.find(market => market.key === 'totals');

                        // Handle both over and under
                        const overOutcome = market.outcomes.find(outcome => outcome.name === 'Over');
                        const underOutcome = market.outcomes.find(outcome => outcome.name === 'Under');

                        if (overOutcome && underOutcome) {
                            // Display as: O 8.5 (-110) / U 8.5 (-110)
                            oddsCell.textContent = `O ${overOutcome.point} (${overOutcome.price}) / U ${underOutcome.point} (${underOutcome.price})`;
                        } else {
                            oddsCell.textContent = '-';
                        }
                    } else {
                        oddsCell.textContent = '-';
                    }

                    totalsRow.appendChild(oddsCell);
                });

                oddsTable.appendChild(totalsRow);

            } else {
                // Handle moneylines and spreads separately for each team
                const awayRow = document.createElement('tr');
                awayRow.classList.add(rowClass);

                // Away Team Column
                const awayTeamCell = document.createElement('td');
                awayTeamCell.textContent = `${game.away_team}`;
                awayTeamCell.classList.add('team-cell');
                awayRow.appendChild(awayTeamCell);

                // Add odds for DraftKings, Fliff, BetOnline for the away team
                ['DraftKings', 'Fliff', 'BetOnline.ag'].forEach(bookmakerName => {
                    const bookmaker = game.bookmakers.find(b => b.title === bookmakerName);
                    const oddsCell = document.createElement('td');
                    oddsCell.classList.add('odds-cell');

                    if (bookmaker) {
                        const market = bookmaker.markets.find(market => market.key === currentMarket);
                        const awayOutcome = market.outcomes.find(outcome => outcome.name === game.away_team);
                        let displayValue = currentMarket === 'h2h' ? awayOutcome.price : `${awayOutcome.point} (${awayOutcome.price})`;

                        // Ensure that positive odds display with a '+' sign for moneylines
                        if (currentMarket === 'h2h' && awayOutcome.price > 0) {
                            displayValue = `+${awayOutcome.price}`;
                        }

                        oddsCell.textContent = displayValue;
                    } else {
                        oddsCell.textContent = '-';
                    }

                    awayRow.appendChild(oddsCell);
                });

                oddsTable.appendChild(awayRow);

                // Second row for home team
                const homeRow = document.createElement('tr');
                homeRow.classList.add(rowClass);

                // Home Team Column
                const homeTeamCell = document.createElement('td');
                homeTeamCell.textContent = `${game.home_team}`;
                homeTeamCell.classList.add('team-cell');
                homeRow.appendChild(homeTeamCell);

                // Add odds for DraftKings, Fliff, BetOnline for the home team
                ['DraftKings', 'Fliff', 'BetOnline.ag'].forEach(bookmakerName => {
                    const bookmaker = game.bookmakers.find(b => b.title === bookmakerName);
                    const oddsCell = document.createElement('td');
                    oddsCell.classList.add('odds-cell');

                    if (bookmaker) {
                        const market = bookmaker.markets.find(market => market.key === currentMarket);
                        const homeOutcome = market.outcomes.find(outcome => outcome.name === game.home_team);
                        let displayValue = currentMarket === 'h2h' ? homeOutcome.price : `${homeOutcome.point} (${homeOutcome.price})`;

                        // Ensure that positive odds display with a '+' sign for moneylines
                        if (currentMarket === 'h2h' && homeOutcome.price > 0) {
                            displayValue = `+${homeOutcome.price}`;
                        }

                        oddsCell.textContent = displayValue;
                    } else {
                        oddsCell.textContent = '-';
                    }

                    homeRow.appendChild(oddsCell);
                });

                oddsTable.appendChild(homeRow);
            }

            rowIndex += 2; // Increment by 2 for the next game
        });
    } catch (error) {
        console.error('Error fetching odds:', error);
    }
}

// Tab switching logic
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        currentMarket = button.dataset.tab === 'moneylines' ? 'h2h' : button.dataset.tab === 'spreads' ? 'spreads' : 'totals';

        // Fetch odds for the selected market
        fetchOdds();
    });
});

// Fetch the initial odds (Moneylines)
fetchOdds();
