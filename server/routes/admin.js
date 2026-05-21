// ===================================
// ADMIN ROUTES
// Dashboard statistics, reports, management
// ===================================

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verifyToken, requireAdmin } = require('./auth');

// All admin routes require authentication and admin role
router.use(verifyToken, requireAdmin);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        // Total rooms
        const totalRooms = await db.get('SELECT COUNT(*) as count FROM rooms');

        // Current occupancy
        const today = new Date().toISOString().split('T')[0];
        const occupiedToday = await db.get(`
            SELECT COUNT(DISTINCT br.room_id) as count
            FROM booking_rooms br
            JOIN bookings b ON br.booking_id = b.id
            WHERE b.booking_status = 'confirmed'
            AND b.check_in <= ? AND b.check_out > ?
        `, [today, today]);

        // Total bookings
        const totalBookings = await db.get('SELECT COUNT(*) as count FROM bookings');

        // Revenue (this month)
        const thisMonth = new Date();
        const firstDay = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split('T')[0];
        const revenue = await db.get(`
            SELECT SUM(total_price) as total
            FROM bookings
            WHERE booking_status = 'confirmed'
            AND payment_status = 'paid'
            AND created_at >= ?
        `, [firstDay]);

        // Upcoming check-ins (next 7 days)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const upcomingCheckIns = await db.get(`
            SELECT COUNT(*) as count
            FROM bookings
            WHERE booking_status = 'confirmed'
            AND check_in BETWEEN ? AND ?
        `, [today, nextWeek.toISOString().split('T')[0]]);

        res.json({
            stats: {
                totalRooms: totalRooms.count,
                occupiedRooms: occupiedToday.count,
                availableRooms: totalRooms.count - occupiedToday.count,
                occupancyRate: ((occupiedToday.count / totalRooms.count) * 100).toFixed(2),
                totalBookings: totalBookings.count,
                monthlyRevenue: revenue.total || 0,
                upcomingCheckIns: upcomingCheckIns.count
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// Get revenue report
router.get('/revenue', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let query = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as bookings,
                SUM(total_price) as revenue
            FROM bookings
            WHERE booking_status = 'confirmed'
            AND payment_status = 'paid'
        `;

        const params = [];
        if (startDate && endDate) {
            query += ' AND created_at BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        query += ' GROUP BY DATE(created_at) ORDER BY date DESC';

        const revenueData = await db.query(query, params);

        const totalRevenue = revenueData.reduce((sum, day) => sum + (day.revenue || 0), 0);
        const totalBookings = revenueData.reduce((sum, day) => sum + day.bookings, 0);

        res.json({
            revenue: revenueData,
            summary: {
                totalRevenue,
                totalBookings,
                averageBookingValue: totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(2) : 0
            }
        });

    } catch (error) {
        console.error('Get revenue error:', error);
        res.status(500).json({ error: 'Failed to get revenue data' });
    }
});

// Get occupancy report
router.get('/occupancy', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Get occupancy by floor
        const occupancyByFloor = await db.query(`
            SELECT 
                r.floor,
                COUNT(DISTINCT r.id) as total_rooms,
                COUNT(DISTINCT CASE WHEN br.id IS NOT NULL THEN r.id END) as occupied_rooms
            FROM rooms r
            LEFT JOIN booking_rooms br ON r.id = br.room_id
            LEFT JOIN bookings b ON br.booking_id = b.id 
                AND b.booking_status = 'confirmed'
                AND b.check_in <= ? AND b.check_out > ?
            GROUP BY r.floor
            ORDER BY r.floor
        `, [endDate || new Date().toISOString().split('T')[0], startDate || new Date().toISOString().split('T')[0]]);

        res.json({ occupancyByFloor });

    } catch (error) {
        console.error('Get occupancy error:', error);
        res.status(500).json({ error: 'Failed to get occupancy data' });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await db.query(`
            SELECT id, email, name, phone, role, created_at
            FROM users
            ORDER BY created_at DESC
        `);

        res.json({ users });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Update user role
router.put('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        await db.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);

        res.json({ message: 'User role updated successfully' });

    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

module.exports = router;
