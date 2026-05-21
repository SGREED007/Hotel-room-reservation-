// ===================================
// STORAGE MANAGER
// Handles localStorage operations
// ===================================

class StorageManager {
    static STORAGE_KEY = 'hotelReservationState_v2';

    // Save state to localStorage
    static save(hotelModel) {
        try {
            const data = {
                floors: hotelModel.floors,
                history: hotelModel.bookingHistory,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save:', error);
            return false;
        }
    }

    // Load state from localStorage
    static load(hotelModel) {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (!saved) return false;

            const data = JSON.parse(saved);
            if (data.floors) hotelModel.floors = data.floors;
            if (data.history) hotelModel.bookingHistory = data.history;
            return true;
        } catch (error) {
            console.error('Failed to load:', error);
            return false;
        }
    }

    // Clear storage
    static clear() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Failed to clear:', error);
            return false;
        }
    }
}
