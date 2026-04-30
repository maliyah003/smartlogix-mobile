const nodemailer = require('nodemailer');
const path = require('path');

/**
 * Service to handle automated email notifications.
 */
class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'noreply.smartlogix@gmail.com',
                pass: 'hfnc cijn jmhu oznj'
            }
        });
    }

    /**
     * Sends a branded booking confirmation email with full trip details.
     * 
     * @param {Object} customer - Customer data (name, email)
     * @param {string} jobId - The generated Job ID
     * @param {Object} tripData - Full trip and job details
     * @returns {Promise<void>}
     */
    async sendBookingConfirmation(customer, jobId, tripData) {
        if (!customer.email) {
            console.warn('Cannot send email: Customer email is missing.');
            return;
        }

        const logoPath = '/Users/mac/Documents/Y2S2/AI:ML Project/SMARTLOGIX/frontend/src/assets/SmartLogixLOGO.png';
        const brandColor = '#f49522';

        const { job, trip, vehicle, driver, route } = tripData;

        // Formatted dates
        const formatDate = (dateStr) => {
            if (!dateStr) return 'N/A';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const mailOptions = {
            from: '"SmartLogix" <noreply.smartlogix@gmail.com>',
            to: customer.email,
            subject: `Job Booked Successfully - ID: ${jobId}`,
            html: `
                <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fcfcfc; border: 1px solid #eef0f2; border-radius: 12px; overflow: hidden;">
                    <!-- Header with Logo -->
                    <div style="background-color: white; padding: 30px 20px; text-align: center; border-bottom: 2px solid ${brandColor};">
                        <img src="cid:smartlogix-logo" alt="SmartLogix Logo" style="max-height: 50px; width: auto;" />
                    </div>
                    
                    <div style="padding: 30px 25px;">
                        <h2 style="color: #1A1D26; margin-top: 0; font-size: 22px; font-weight: 600;">Booking Confirmed</h2>
                        <p style="color: #6B7280; font-size: 15px; line-height: 1.6;">
                            Dear ${customer.name || 'Valued Customer'},<br/>
                            Your delivery job has been successfully scheduled. Here are your trip details for reference.
                        </p>
                        
                        <!-- Job ID Highlight -->
                        <div style="background-color: #FFF9F2; border: 1px dashed ${brandColor}; padding: 15px; text-align: center; margin: 25px 0;">
                            <span style="font-size: 11px; color: #B45309; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Tracking ID / Job ID</span><br/>
                            <strong style="font-size: 26px; color: ${brandColor}; letter-spacing: 2px;">${jobId}</strong>
                        </div>

                        <!-- Trip Summary Grid -->
                        <div style="display: flex; flex-direction: column; gap: 20px; margin-top: 30px;">
                            
                            <!-- Origin & Destination -->
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding-bottom: 20px;">
                                        <div style="display: flex; gap: 10px;">
                                            <div style="min-width: 8px; height: 8px; border-radius: 50%; background-color: ${brandColor}; margin-top: 5px;"></div>
                                            <div>
                                                <small style="color: #9CA3AF; text-transform: uppercase; font-weight: 600; font-size: 10px;">Pickup Details</small>
                                                <div style="color: #1A1D26; font-weight: 500; font-size: 14px; margin-top: 2px;">${job.pickup.address}</div>
                                                <div style="color: #6B7280; font-size: 13px; margin-top: 2px;">${formatDate(job.pickup.datetime)}</div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div style="display: flex; gap: 10px;">
                                            <div style="min-width: 8px; height: 8px; border-radius: 50%; background-color: #10B981; margin-top: 5px;"></div>
                                            <div>
                                                <small style="color: #9CA3AF; text-transform: uppercase; font-weight: 600; font-size: 10px;">Delivery Details</small>
                                                <div style="color: #1A1D26; font-weight: 500; font-size: 14px; margin-top: 2px;">${job.delivery.address}</div>
                                                <div style="color: #6B7280; font-size: 13px; margin-top: 2px;">${formatDate(job.delivery.datetime)}</div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;" />

                            <!-- Cargo & Vehicle Info -->
                            <table style="width: 100%; border-collapse: collapse; color: #555; font-size: 14px;">
                                <tr>
                                    <td style="width: 50%; padding-bottom: 10px;">
                                        <strong style="color: #1A1D26;">Cargo Type:</strong><br/>
                                        <span style="text-transform: capitalize;">${job.cargo.type}</span>
                                    </td>
                                    <td style="width: 50%; padding-bottom: 10px;">
                                        <strong style="color: #1A1D26;">Weight:</strong><br/>
                                        ${job.cargo.weight} kg
                                    </td>
                                </tr>
                                <tr>
                                    <td style="width: 50%;">
                                        <strong style="color: #1A1D26;">Assigned Vehicle:</strong><br/>
                                        ${vehicle.registrationNumber} (${vehicle.type})
                                    </td>
                                    <td style="width: 50%;">
                                        <strong style="color: #1A1D26;">Assigned Driver:</strong><br/>
                                        ${driver ? driver.name : 'Awaiting Assignment'}
                                    </td>
                                </tr>
                            </table>
                            
                            <div style="background-color: #F8F9FA; padding: 15px; border-radius: 8px; margin-top: 15px;">
                                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                                    <span style="color: #6B7280;">Estimated Distance:</span>
                                    <strong style="color: #1A1D26;">${route.distance}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 5px;">
                                    <span style="color: #6B7280;">Estimated Travel Time:</span>
                                    <strong style="color: #1A1D26;">${route.duration}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background-color: #F3F4F6; padding: 25px; text-align: center; color: #9CA3AF; font-size: 12px;">
                        <p style="margin-bottom: 10px;">You can track your order live on our portal using your Mobile Number or Job ID.</p>
                        <p style="margin: 5px 0;">&copy; 2026 SmartLogix Solutions. All rights reserved.</p>
                        <p style="margin: 5px 0; font-size: 10px;">This is an automated delivery update. Please do not reply to this email.</p>
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: 'logo.png',
                    path: logoPath,
                    cid: 'smartlogix-logo'
                }
            ]
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Comprehensive Email sent successfully:', info.messageId);
        } catch (error) {
            console.error('Error sending confirmation email:', error);
        }
    }
}

module.exports = new EmailService();
