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

function loadCSVData() {
    Papa.parse('race-data.csv', {
      download: true,
      header: true, // This assumes the CSV file has headers
      complete: function(results) {
        const data = results.data;
        const tableBody = document.getElementById('resultsTable');

        // Loop through the CSV data and create rows
        data.forEach((row, index) => {
          const newRow = document.createElement('tr');
          newRow.classList.add('table-content');

          newRow.innerHTML = `
            <td><span class="position">${index + 1}</span></td>
            <td><span class="driver-name">${row['Driver Name']}</span></td>
            <td><span class="team">${row.Team}</span></td>
            <td><span class="points">${row.Points} PTS</span></td>
          `;
          
          tableBody.appendChild(newRow);
        });
      }
    });
  }