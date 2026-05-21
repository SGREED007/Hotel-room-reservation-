// ===================================
// EMAIL SERVICE
// Send booking confirmations and notifications
// ===================================

const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Send booking confirmation email
async function sendBookingConfirmation(bookingData) {
    const {
        bookingId,
        guestName,
        guestEmail,
        checkIn,
        checkOut,
        rooms,
        totalPrice,
        nights
    } = bookingData;

    const mailOptions = {
        from: `"Grand Vista Hotel" <${process.env.EMAIL_USER}>`,
        to: guestEmail,
        subject: `Booking Confirmation - ${bookingId}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                    .detail-label { font-weight: bold; color: #667eea; }
                    .rooms { background: #667eea10; padding: 15px; border-radius: 8px; margin: 15px 0; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
                    .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏨 Booking Confirmed!</h1>
                        <p>Thank you for choosing Grand Vista Hotel</p>
                    </div>
                    <div class="content">
                        <h2>Dear ${guestName},</h2>
                        <p>Your booking has been confirmed. We look forward to welcoming you!</p>
                        
                        <div class="booking-details">
                            <h3>Booking Details</h3>
                            <div class="detail-row">
                                <span class="detail-label">Booking ID:</span>
                                <span>${bookingId}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Check-in:</span>
                                <span>${new Date(checkIn).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Check-out:</span>
                                <span>${new Date(checkOut).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Number of Nights:</span>
                                <span>${nights}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Total Price:</span>
                                <span><strong>₹${totalPrice.toFixed(2)}</strong></span>
                            </div>
                        </div>

                        <div class="rooms">
                            <h4>Your Rooms:</h4>
                            <p><strong>${rooms.join(', ')}</strong></p>
                            <p style="font-size: 14px; color: #666;">
                                These rooms have been optimally selected to minimize your travel time within the hotel.
                            </p>
                        </div>

                        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                            <strong>⏰ Check-in Time:</strong> 2:00 PM<br>
                            <strong>⏰ Check-out Time:</strong> 11:00 AM
                        </div>

                        <center>
                            <a href="http://localhost:3000/api/bookings/${bookingId}" class="button">View Booking Details</a>
                        </center>

                        <h3>What's Next?</h3>
                        <ul>
                            <li>Save this email for your records</li>
                            <li>Bring a valid ID for check-in</li>
                            <li>Contact us if you need to modify your booking</li>
                        </ul>

                        <p>If you have any questions, please don't hesitate to contact us.</p>
                        
                        <p>Best regards,<br>
                        <strong>Grand Vista Hotel Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>Grand Vista Hotel | Smart Reservation System</p>
                        <p>This is an automated email. Please do not reply directly to this message.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        // Only send if email credentials are configured
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } else {
            console.log('ℹ️ Email not sent (credentials not configured)');
            console.log('📧 Would have sent to:', guestEmail);
            return { success: false, reason: 'Email credentials not configured' };
        }
    } catch (error) {
        console.error('❌ Email error:', error);
        throw error;
    }
}

// Send cancellation email
async function sendCancellationEmail(bookingData) {
    const { bookingId, guestName, guestEmail } = bookingData;

    const mailOptions = {
        from: `"Grand Vista Hotel" <${process.env.EMAIL_USER}>`,
        to: guestEmail,
        subject: `Booking Cancelled - ${bookingId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Booking Cancelled</h2>
                <p>Dear ${guestName},</p>
                <p>Your booking <strong>${bookingId}</strong> has been cancelled as requested.</p>
                <p>If this was a mistake, please contact us immediately.</p>
                <p>Best regards,<br>Grand Vista Hotel Team</p>
            </div>
        `
    };

    try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Cancellation email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } else {
            console.log('ℹ️ Cancellation email not sent (credentials not configured)');
            return { success: false, reason: 'Email credentials not configured' };
        }
    } catch (error) {
        console.error('❌ Email error:', error);
        throw error;
    }
}

module.exports = {
    sendBookingConfirmation,
    sendCancellationEmail
};
