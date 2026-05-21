// ===================================
// UI CONTROLLER
// Manages all UI interactions and updates
// ===================================

class UIController {
    constructor(hotelModel) {
        this.model = hotelModel;
        this.isProcessing = false;
    }

    // Render hotel visualization
    renderHotel() {
        const container = document.getElementById('floorsContainer');
        container.innerHTML = this.model.floors.map(floor => `
            <div class="floor" role="region" aria-label="Floor ${floor.number}">
                <div class="floor-header">
                    <span class="floor-number">Floor ${floor.number}</span>
                    <span class="floor-info">${floor.rooms.length} rooms</span>
                </div>
                <div class="rooms-grid" id="floor-${floor.number}">
                    ${floor.rooms.map(room => this.getRoomHTML(room)).join('')}
                </div>
            </div>
        `).join('');
    }

    // Get HTML for individual room
    getRoomHTML(room) {
        const isSelected = this.model.lastBooking.some(r => r.number === room.number);
        const status = isSelected ? 'selected' : (room.occupied ? 'occupied' : 'available');
        const icon = isSelected ? '🔑' : (room.occupied ? '👤' : '✓');
        const label = isSelected ? 'Just Booked' : (room.occupied ? 'Occupied' : 'Available');

        return `
            <div class="room ${status}" 
                 data-room="${room.number}"
                 role="button"
                 tabindex="0"
                 aria-label="Room ${room.number}, ${label}"
                 title="Room ${room.number}: ${label}">
                <span class="room-number">${room.number}</span>
                <span class="room-status">${icon}</span>
            </div>
        `;
    }

    // Update room display
    updateRoomDisplay() {
        this.model.floors.forEach(floor => {
            const grid = document.getElementById(`floor-${floor.number}`);
            if (grid) {
                grid.innerHTML = floor.rooms.map(room => this.getRoomHTML(room)).join('');
            }
        });
        this.updateStatistics();
    }

    // Update statistics with animation
    updateStatistics() {
        const stats = this.model.getStatistics();
        this.animateNumber('totalRooms', stats.total);
        this.animateNumber('availableRooms', stats.available);
        this.animateNumber('occupiedRooms', stats.occupied);
    }

    // Animate number changes
    animateNumber(id, endValue) {
        const el = document.getElementById(id);
        const startValue = parseInt(el.textContent) || 0;
        if (startValue === endValue) return;

        const duration = 500;
        const startTime = performance.now();

        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);

            const current = Math.floor(startValue + (endValue - startValue) * ease);
            el.textContent = current;

            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = endValue;
        };
        requestAnimationFrame(step);
    }

    // Show booking result
    showBookingResult(booking) {
        const div = document.getElementById('bookingResult');
        document.getElementById('bookingId').textContent = '#' + booking.id;
        document.getElementById('bookedRooms').textContent = booking.rooms.join(', ');
        document.getElementById('travelTime').textContent = booking.travelTime + ' min';
        document.getElementById('strategy').textContent = booking.strategy;

        div.style.display = 'block';
        div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Hide booking result
    hideBookingResult() {
        document.getElementById('bookingResult').style.display = 'none';
    }

    // Set processing state
    setProcessing(isBusy) {
        this.isProcessing = isBusy;
        const buttons = ['bookBtn', 'undoBtn', 'randomBtn', 'resetBtn'];
        buttons.forEach(id => {
            document.getElementById(id).disabled = isBusy;
        });
    }
}
