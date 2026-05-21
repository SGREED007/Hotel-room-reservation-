// ===================================
// BOOKING ALGORITHM
// Handles room allocation and travel time optimization
// ===================================

class BookingAlgorithm {
    // Calculate travel time between two rooms
    static calculateTravelTime(room1, room2) {
        const verticalTime = Math.abs(room1.floor - room2.floor) * 2;
        const horizontalTime = Math.abs(room1.position - room2.position) * 1;
        return verticalTime + horizontalTime;
    }

    // Calculate total travel time for a set of rooms
    static calculateTotalTravelTime(rooms) {
        if (rooms.length <= 1) return 0;
        let totalTime = 0;
        for (let i = 0; i < rooms.length - 1; i++) {
            totalTime += this.calculateTravelTime(rooms[i], rooms[i + 1]);
        }
        return totalTime;
    }

    // Find optimal room combination
    static findOptimalRooms(availableRooms, count, floors) {
        if (availableRooms.length < count) return null;

        // Strategy 1: Try same floor first
        for (let floor of floors) {
            const availableOnFloor = floor.rooms.filter(room => !room.occupied);
            if (availableOnFloor.length >= count) {
                availableOnFloor.sort((a, b) => a.position - b.position);
                let bestSequence = availableOnFloor.slice(0, count);
                let minTime = this.calculateTotalTravelTime(bestSequence);

                for (let i = 0; i <= availableOnFloor.length - count; i++) {
                    const sequence = availableOnFloor.slice(i, i + count);
                    const time = this.calculateTotalTravelTime(sequence);
                    if (time < minTime) {
                        minTime = time;
                        bestSequence = sequence;
                    }
                }
                return {
                    rooms: bestSequence,
                    travelTime: minTime,
                    strategy: 'Same Floor - Optimized'
                };
            }
        }

        // Strategy 2: Multi-floor optimization
        return this.findBestCombination(availableRooms, count);
    }

    // Find best combination across multiple floors
    static findBestCombination(availableRooms, count) {
        const roomsByFloor = {};
        availableRooms.forEach(room => {
            if (!roomsByFloor[room.floor]) roomsByFloor[room.floor] = [];
            roomsByFloor[room.floor].push(room);
        });

        Object.values(roomsByFloor).forEach(rooms =>
            rooms.sort((a, b) => a.position - b.position)
        );

        let bestRooms = [];
        let minTravelTime = Infinity;
        const floorNumbers = Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b);

        for (let startFloor of floorNumbers) {
            let currentSelection = [];
            let remaining = count;

            const nearbyFloors = floorNumbers.sort((a, b) =>
                Math.abs(a - startFloor) - Math.abs(b - startFloor)
            );

            for (let floor of nearbyFloors) {
                if (remaining === 0) break;
                const rooms = roomsByFloor[floor] || [];
                const take = Math.min(remaining, rooms.length);
                currentSelection.push(...rooms.slice(0, take));
                remaining -= take;
            }

            if (currentSelection.length === count) {
                currentSelection.sort((a, b) => {
                    if (a.floor !== b.floor) return a.floor - b.floor;
                    return a.position - b.position;
                });

                const time = this.calculateTotalTravelTime(currentSelection);
                if (time < minTravelTime) {
                    minTravelTime = time;
                    bestRooms = currentSelection;
                }
            }
        }

        return {
            rooms: bestRooms,
            travelTime: minTravelTime,
            strategy: 'Multi-Floor - Optimized'
        };
    }
}
