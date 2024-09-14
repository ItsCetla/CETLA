// script.js

// Modal functionality
document.addEventListener('DOMContentLoaded', function () {
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
});