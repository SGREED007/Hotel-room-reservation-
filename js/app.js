// ===================================
// MAIN APPLICATION
// Coordinates all components
// ===================================

class HotelReservationApp {
    constructor() {
        this.model = new HotelModel();
        this.ui = new UIController(this.model);
        this.notifications = new NotificationManager();

        // Load saved state
        StorageManager.load(this.model);

        // Initialize
        this.init();
    }

    init() {
        this.ui.renderHotel();
        this.attachEventListeners();
        this.ui.updateStatistics();

        // Hide loading overlay
        setTimeout(() => {
            this.notifications.hideLoading();
        }, 800);
    }

    // Book rooms
    async handleBook() {
        if (this.ui.isProcessing) return;

        const input = document.getElementById('roomCount');
        const count = parseInt(input.value);

        if (count < 1 || count > 5) {
            this.notifications.showToast('Please enter between 1 and 5 rooms', 'error');
            return;
        }

        this.ui.setProcessing(true);
        await new Promise(r => setTimeout(r, 600));

        const availableRooms = this.model.getAvailableRooms();
        const result = BookingAlgorithm.findOptimalRooms(
            availableRooms,
            count,
            this.model.floors
        );

        if (!result) {
            this.notifications.showToast('Not enough rooms available', 'error');
            this.ui.setProcessing(false);
            return;
        }

        // Mark rooms as occupied
        result.rooms.forEach(room => room.occupied = true);
        this.model.lastBooking = result.rooms;

        // Create booking record
        const booking = {
            id: 'BK' + Date.now().toString().slice(-6),
            timestamp: new Date().toISOString(),
            roomCount: count,
            rooms: result.rooms.map(r => r.number),
            travelTime: result.travelTime,
            strategy: result.strategy
        };
        this.model.bookingHistory.push(booking);

        // Update UI and save
        this.ui.updateRoomDisplay();
        this.ui.showBookingResult(booking);
        this.notifications.showToast(`Successfully booked ${count} room(s)!`, 'success');
        StorageManager.save(this.model);

        this.ui.setProcessing(false);
    }

    // Undo last booking
    async handleUndo() {
        if (this.ui.isProcessing || this.model.bookingHistory.length === 0) return;

        this.ui.setProcessing(true);
        await new Promise(r => setTimeout(r, 400));

        const lastBooking = this.model.bookingHistory.pop();
        lastBooking.rooms.forEach(num => {
            this.model.floors.forEach(f => {
                const r = f.rooms.find(rm => rm.number === num);
                if (r) r.occupied = false;
            });
        });

        this.model.lastBooking = [];
        this.ui.updateRoomDisplay();
        this.ui.hideBookingResult();
        this.notifications.showToast(`Undone booking ${lastBooking.id}`, 'info');
        StorageManager.save(this.model);

        this.ui.setProcessing(false);
    }

    // Generate random occupancy
    async handleRandom() {
        if (this.ui.isProcessing) return;

        if (this.model.bookingHistory.length > 0) {
            const confirmed = await this.notifications.showConfirmModal(
                'Generate Random Occupancy?',
                'This will clear current bookings and randomize room status.'
            );
            if (!confirmed) return;
        }

        this.ui.setProcessing(true);
        await new Promise(r => setTimeout(r, 800));

        const count = this.model.generateRandomOccupancy();
        this.ui.updateRoomDisplay();
        this.ui.hideBookingResult();
        this.notifications.showToast(`Randomized: ${count} rooms occupied`, 'success');
        StorageManager.save(this.model);

        this.ui.setProcessing(false);
    }

    // Reset all
    async handleReset() {
        if (this.ui.isProcessing) return;

        const confirmed = await this.notifications.showConfirmModal(
            'Reset Hotel System?',
            'This will clear ALL bookings and empty the hotel. This action cannot be undone.'
        );

        if (!confirmed) return;

        this.ui.setProcessing(true);
        await new Promise(r => setTimeout(r, 600));

        this.model.resetAllRooms();
        this.ui.updateRoomDisplay();
        this.ui.hideBookingResult();
        this.notifications.showToast('Hotel system reset completely', 'success');
        StorageManager.clear();

        this.ui.setProcessing(false);
    }

    // Attach event listeners
    attachEventListeners() {
        document.getElementById('bookBtn').addEventListener('click', () => this.handleBook());
        document.getElementById('undoBtn').addEventListener('click', () => this.handleUndo());
        document.getElementById('randomBtn').addEventListener('click', () => this.handleRandom());
        document.getElementById('resetBtn').addEventListener('click', () => this.handleReset());

        // Input controls
        const input = document.getElementById('roomCount');
        document.getElementById('incrementBtn').addEventListener('click', () => {
            if (input.value < 5) input.value++;
        });
        document.getElementById('decrementBtn').addEventListener('click', () => {
            if (input.value > 1) input.value--;
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.ui.isProcessing) {
                if (document.getElementById('confirmModal').style.display === 'flex') {
                    document.getElementById('confirmOk').click();
                } else {
                    this.handleBook();
                }
            }
            if (e.key === 'Escape') {
                const modal = document.getElementById('confirmModal');
                if (modal.style.display === 'flex') {
                    document.getElementById('confirmCancel').click();
                }
            }
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.handleUndo();
            }
        });
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.hotelApp = new HotelReservationApp();
});
