// ===================================
// HOTEL DATA MODEL
// Manages hotel structure and room data
// ===================================

class HotelModel {
    constructor() {
        this.floors = this.initializeHotel();
        this.bookingHistory = [];
        this.lastBooking = [];
    }

    // Initialize hotel structure: 97 rooms across 10 floors
    initializeHotel() {
        const floors = [];

        // Floors 1-9: 10 rooms each
        for (let floor = 1; floor <= 9; floor++) {
            const rooms = [];
            for (let room = 1; room <= 10; room++) {
                rooms.push({
                    number: floor * 100 + room,
                    floor: floor,
                    position: room,
                    occupied: false
                });
            }
            floors.push({ number: floor, rooms: rooms });
        }

        // Floor 10: 7 rooms
        const topFloorRooms = [];
        for (let room = 1; room <= 7; room++) {
            topFloorRooms.push({
                number: 1000 + room,
                floor: 10,
                position: room,
                occupied: false
            });
        }
        floors.push({ number: 10, rooms: topFloorRooms });

        return floors;
    }

    getAvailableRooms() {
        const available = [];
        this.floors.forEach(floor => {
            floor.rooms.forEach(room => {
                if (!room.occupied) available.push(room);
            });
        });
        return available;
    }

    getStatistics() {
        let total = 0;
        let occupied = 0;

        this.floors.forEach(floor => {
            floor.rooms.forEach(room => {
                total++;
                if (room.occupied) occupied++;
            });
        });

        return {
            total,
            occupied,
            available: total - occupied
        };
    }

    resetAllRooms() {
        this.floors.forEach(floor => {
            floor.rooms.forEach(room => {
                room.occupied = false;
            });
        });
        this.bookingHistory = [];
        this.lastBooking = [];
    }

    generateRandomOccupancy() {
        this.resetAllRooms();
        const totalRooms = 97;
        const occupancyRate = 0.3 + Math.random() * 0.3; // 30-60%
        const count = Math.floor(totalRooms * occupancyRate);

        const allRooms = this.floors.flatMap(f => f.rooms);
        const shuffled = allRooms.sort(() => Math.random() - 0.5);

        for (let i = 0; i < count; i++) {
            shuffled[i].occupied = true;
        }

        return count;
    }
}
