// Get modal element
var modal = document.getElementById("schedule-modal");

// Get button that opens the modal
var btn = document.getElementById("view-schedule");

// Get the <span> element that closes the modal
var span = document.getElementById("close-modal");

// When the user clicks the button, open the modal
btn.onclick = function() {
    modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
    modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}





document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM fully loaded and parsed");

    fetch('race-data.csv')
        .then(response => {
            console.log("Fetching CSV file...");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            console.log('CSV Data Loaded: ', data);
            const lines = data.trim().split('\n');

            if (lines.length < 2) {
                throw new Error("CSV file is empty or improperly formatted.");
            }

            const leaderboard = document.querySelector('#leaderboard tbody');
            leaderboard.innerHTML = '';  // Clear any existing content

            const players = lines.slice(1).map(line => {
                const parts = line.split(',');
                if (parts.length !== 3) {
                    console.error("CSV line format error:", line);
                    return null;  // Skip improperly formatted lines
                }
                return parts;
            }).filter(Boolean);  // Remove null entries

            // Sort players by Best Lap Time (ascending)
            players.sort((a, b) => parseFloat(a[2]) - parseFloat(b[2]));

            players.forEach((player, index) => {
                const row = document.createElement('tr');
                const positionCell = document.createElement('td');
                const nameCell = document.createElement('td');
                const timeCell = document.createElement('td');

                positionCell.textContent = index + 1;
                nameCell.textContent = player[1];
                timeCell.textContent = player[2];

                if (index === 0) {
                    timeCell.classList.add('highlight');
                }

                row.appendChild(positionCell);
                row.appendChild(nameCell);
                row.appendChild(timeCell);

                leaderboard.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading the CSV file:', error);
            alert('Failed to load CSV data. Check the console for more details.');
        });
});