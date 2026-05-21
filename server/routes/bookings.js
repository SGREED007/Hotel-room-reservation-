// ===================================
// BOOKING ROUTES
// Create, read, update, delete bookings with date selection
// ===================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { verifyToken } = require('./auth');
const { sendBookingConfirmation } = require('../services/email');

// Generate unique booking ID
function generateBookingId() {
    return 'BK' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Calculate travel time between rooms
function calculateTravelTime(room1, room2) {
    const verticalTime = Math.abs(room1.floor - room2.floor) * 2; // 2 min/floor
    const horizontalTime = Math.abs(room1.position - room2.position) * 1; // 1 min/room
    return verticalTime + horizontalTime;
}

// Find optimal rooms (intelligent algorithm)
async function findOptimalRooms(count, checkIn, checkOut) {
    // Get available rooms for the date range
    const availableRooms = await db.query(`
        SELECT r.* FROM rooms r
        WHERE r.id NOT IN (
            SELECT br.room_id FROM booking_rooms br
            JOIN bookings b ON br.booking_id = b.id
            WHERE b.booking_status != 'cancelled'
            AND (
                (b.check_in <= ? AND b.check_out > ?)
                OR (b.check_in < ? AND b.check_out >= ?)
                OR (b.check_in >= ? AND b.check_out <= ?)
            )
        )
        ORDER BY r.floor, r.position
    `, [checkIn, checkIn, checkOut, checkOut, checkIn, checkOut]);

    if (availableRooms.length < count) {
        return null;
    }

    // Strategy 1: Same floor priority
    const roomsByFloor = {};
    availableRooms.forEach(room => {
        if (!roomsByFloor[room.floor]) {
            roomsByFloor[room.floor] = [];
        }
        roomsByFloor[room.floor].push(room);
    });

    // Try to find rooms on same floor
    for (const floor in roomsByFloor) {
        const floorRooms = roomsByFloor[floor];
        if (floorRooms.length >= count) {
            // Find best consecutive sequence
            let bestSequence = floorRooms.slice(0, count);
            let minTime = calculateTotalTravelTime(bestSequence);

            for (let i = 0; i <= floorRooms.length - count; i++) {
                const sequence = floorRooms.slice(i, i + count);
                const time = calculateTotalTravelTime(sequence);
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
    const bestCombination = findBestMultiFloorCombination(availableRooms, count);
    return {
        rooms: bestCombination.rooms,
        travelTime: bestCombination.travelTime,
        strategy: 'Multi-Floor - Optimized'
    };
}

function calculateTotalTravelTime(rooms) {
    if (rooms.length <= 1) return 0;
    let total = 0;
    for (let i = 0; i < rooms.length - 1; i++) {
        total += calculateTravelTime(rooms[i], rooms[i + 1]);
    }
    return total;
}

function findBestMultiFloorCombination(availableRooms, count) {
    // Greedy approach: select rooms closest to stairs/elevator
    const sorted = availableRooms.sort((a, b) => {
        if (a.floor !== b.floor) return a.floor - b.floor;
        return a.position - b.position;
    });

    const selected = sorted.slice(0, count);
    return {
        rooms: selected,
        travelTime: calculateTotalTravelTime(selected)
    };
}

// Create booking
router.post('/',
    [
        body('guestName').trim().isLength({ min: 2 }),
        body('guestEmail').isEmail().normalizeEmail(),
        body('guestPhone').optional().isMobilePhone(),
        body('checkIn').isISO8601(),
        body('checkOut').isISO8601(),
        body('numRooms').isInt({ min: 1, max: 5 }),
        body('numGuests').optional().isInt({ min: 1 }),
        body('specialRequests').optional().trim()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const {
                guestName,
                guestEmail,
                guestPhone,
                checkIn,
                checkOut,
                numRooms,
                numGuests,
                specialRequests
            } = req.body;

            // Validate dates
            const checkInDate = new Date(checkIn);
            const checkOutDate = new Date(checkOut);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (checkInDate < today) {
                return res.status(400).json({ error: 'Check-in date cannot be in the past' });
            }

            if (checkOutDate <= checkInDate) {
                return res.status(400).json({ error: 'Check-out must be after check-in' });
            }

            // Find optimal rooms
            const result = await findOptimalRooms(numRooms, checkIn, checkOut);

            if (!result) {
                return res.status(400).json({
                    error: `Unable to book ${numRooms} room(s) for the selected dates. Please try different dates.`
                });
            }

            // Calculate total price
            const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
            const totalPrice = result.rooms.reduce((sum, room) => sum + room.price_per_night, 0) * nights;

            // Create booking
            const bookingId = generateBookingId();
            const userId = req.user ? req.user.userId : null;

            const booking = await db.run(`
                INSERT INTO bookings (
                    booking_id, user_id, guest_name, guest_email, guest_phone,
                    check_in, check_out, num_guests, total_price, special_requests
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                bookingId, userId, guestName, guestEmail, guestPhone || null,
                checkIn, checkOut, numGuests || numRooms * 2, totalPrice, specialRequests || null
            ]);

            // Link rooms to booking
            for (const room of result.rooms) {
                await db.run(
                    'INSERT INTO booking_rooms (booking_id, room_id) VALUES (?, ?)',
                    [booking.id, room.id]
                );
            }

            // Send confirmation email (async, don't wait)
            sendBookingConfirmation({
                bookingId,
                guestName,
                guestEmail,
                checkIn,
                checkOut,
                rooms: result.rooms.map(r => r.room_number),
                totalPrice,
                nights
            }).catch(err => console.error('Email error:', err));

            res.status(201).json({
                message: 'Booking created successfully',
                booking: {
                    bookingId,
                    guestName,
                    guestEmail,
                    checkIn,
                    checkOut,
                    rooms: result.rooms.map(r => r.room_number),
                    travelTime: result.travelTime,
                    strategy: result.strategy,
                    nights,
                    totalPrice,
                    pricePerNight: totalPrice / nights
                }
            });

        } catch (error) {
            console.error('Booking error:', error);
            res.status(500).json({ error: 'Booking failed' });
        }
    }
);

// Get all bookings (admin or user's own)
router.get('/', verifyToken, async (req, res) => {
    try {
        let bookings;

        if (req.user.role === 'admin') {
            // Admin sees all bookings
            bookings = await db.query(`
                SELECT b.*, GROUP_CONCAT(r.room_number) as rooms
                FROM bookings b
                LEFT JOIN booking_rooms br ON b.id = br.booking_id
                LEFT JOIN rooms r ON br.room_id = r.id
                GROUP BY b.id
                ORDER BY b.created_at DESC
            `);
        } else {
            // User sees only their bookings
            bookings = await db.query(`
                SELECT b.*, GROUP_CONCAT(r.room_number) as rooms
                FROM bookings b
                LEFT JOIN booking_rooms br ON b.id = br.booking_id
                LEFT JOIN rooms r ON br.room_id = r.id
                WHERE b.user_id = ? OR b.guest_email = ?
                GROUP BY b.id
                ORDER BY b.created_at DESC
            `, [req.user.userId, req.user.email]);
        }

        res.json({ bookings });

    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ error: 'Failed to get bookings' });
    }
});

// Get booking by ID
router.get('/:bookingId', async (req, res) => {
    try {
        const booking = await db.get(`
            SELECT b.*, GROUP_CONCAT(r.room_number) as rooms
            FROM bookings b
            LEFT JOIN booking_rooms br ON b.id = br.booking_id
            LEFT JOIN rooms r ON br.room_id = r.id
            WHERE b.booking_id = ?
            GROUP BY b.id
        `, [req.params.bookingId]);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json({ booking });

    } catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({ error: 'Failed to get booking' });
    }
});

// Cancel booking
router.delete('/:bookingId', verifyToken, async (req, res) => {
    try {
        const booking = await db.get(
            'SELECT * FROM bookings WHERE booking_id = ?',
            [req.params.bookingId]
        );

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check authorization
        if (req.user.role !== 'admin' && booking.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized to cancel this booking' });
        }

        // Update booking status
        await db.run(
            'UPDATE bookings SET booking_status = ? WHERE booking_id = ?',
            ['cancelled', req.params.bookingId]
        );

        res.json({ message: 'Booking cancelled successfully' });

    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

module.exports = router;
