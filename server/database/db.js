// ===================================
// DATABASE MODULE
// SQLite database for local development
// Can be easily migrated to PostgreSQL/MySQL for production
// ===================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'hotel.db');
let db;

// Initialize database
function initialize() {
    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Database connection error:', err);
        } else {
            console.log('✅ Connected to SQLite database');
            createTables();
        }
    });
}

// Create tables
function createTables() {
    db.serialize(() => {
        // Users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                phone TEXT,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Rooms table
        db.run(`
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_number INTEGER UNIQUE NOT NULL,
                floor INTEGER NOT NULL,
                position INTEGER NOT NULL,
                room_type TEXT DEFAULT 'standard',
                price_per_night REAL DEFAULT 100.00,
                max_guests INTEGER DEFAULT 2,
                amenities TEXT,
                status TEXT DEFAULT 'available',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Bookings table
        db.run(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id TEXT UNIQUE NOT NULL,
                user_id INTEGER,
                guest_name TEXT NOT NULL,
                guest_email TEXT NOT NULL,
                guest_phone TEXT,
                check_in DATE NOT NULL,
                check_out DATE NOT NULL,
                num_guests INTEGER DEFAULT 1,
                total_price REAL NOT NULL,
                payment_status TEXT DEFAULT 'pending',
                booking_status TEXT DEFAULT 'confirmed',
                special_requests TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Booking rooms (many-to-many relationship)
        db.run(`
            CREATE TABLE IF NOT EXISTS booking_rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER NOT NULL,
                room_id INTEGER NOT NULL,
                FOREIGN KEY (booking_id) REFERENCES bookings(id),
                FOREIGN KEY (room_id) REFERENCES rooms(id)
            )
        `);

        // Initialize rooms (97 rooms across 10 floors)
        db.get('SELECT COUNT(*) as count FROM rooms', (err, row) => {
            if (!err && row.count === 0) {
                console.log('🏨 Initializing hotel rooms...');
                initializeRooms();
            }
        });
    });
}

// Initialize 97 rooms
function initializeRooms() {
    const stmt = db.prepare(`
        INSERT INTO rooms (room_number, floor, position, room_type, price_per_night)
        VALUES (?, ?, ?, ?, ?)
    `);

    // Floors 1-9: 10 rooms each
    for (let floor = 1; floor <= 9; floor++) {
        for (let position = 1; position <= 10; position++) {
            const roomNumber = floor * 100 + position;
            const roomType = position <= 3 ? 'deluxe' : 'standard';
            const price = roomType === 'deluxe' ? 150.00 : 100.00;
            stmt.run(roomNumber, floor, position, roomType, price);
        }
    }

    // Floor 10: 7 rooms (premium)
    for (let position = 1; position <= 7; position++) {
        const roomNumber = 1000 + position;
        stmt.run(roomNumber, 10, position, 'suite', 250.00);
    }

    stmt.finalize(() => {
        console.log('✅ Hotel rooms initialized (97 rooms)');
    });
}

// Database query helpers
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Close database
function close() {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

module.exports = {
    initialize,
    query,
    run,
    get,
    close
};
