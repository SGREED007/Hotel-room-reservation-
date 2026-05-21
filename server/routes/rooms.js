// ===================================
// ROOM ROUTES
// Get rooms, check availability
// ===================================

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verifyToken, requireAdmin } = require('./auth');

// Get all rooms
router.get('/', async (req, res) => {
    try {
        const rooms = await db.query('SELECT * FROM rooms ORDER BY floor, position');
        res.json({ rooms });
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ error: 'Failed to get rooms' });
    }
});

// Get available rooms for date range
router.get('/available', async (req, res) => {
    try {
        const { checkIn, checkOut } = req.query;

        if (!checkIn || !checkOut) {
            return res.status(400).json({ error: 'checkIn and checkOut dates required' });
        }

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

        res.json({
            availableRooms,
            count: availableRooms.length,
            checkIn,
            checkOut
        });

    } catch (error) {
        console.error('Get available rooms error:', error);
        res.status(500).json({ error: 'Failed to get available rooms' });
    }
});

// Get room by ID
router.get('/:id', async (req, res) => {
    try {
        const room = await db.get('SELECT * FROM rooms WHERE id = ?', [req.params.id]);

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json({ room });

    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({ error: 'Failed to get room' });
    }
});

// Update room (admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { room_type, price_per_night, max_guests, amenities, status } = req.body;

        await db.run(`
            UPDATE rooms 
            SET room_type = ?, price_per_night = ?, max_guests = ?, amenities = ?, status = ?
            WHERE id = ?
        `, [room_type, price_per_night, max_guests, amenities, status, req.params.id]);

        const updatedRoom = await db.get('SELECT * FROM rooms WHERE id = ?', [req.params.id]);

        res.json({
            message: 'Room updated successfully',
            room: updatedRoom
        });

    } catch (error) {
        console.error('Update room error:', error);
        res.status(500).json({ error: 'Failed to update room' });
    }
});

module.exports = router;
