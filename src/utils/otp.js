/**
 * OTP Utility Functions
 * Handles generation and validation of One-Time Passwords
 */

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP
 */
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Verify OTP matches and hasn't expired
 * @param {string} inputOTP - OTP provided by user
 * @param {string} storedOTP - OTP stored in database
 * @param {Date} expiryDate - Expiry date of the OTP
 * @returns {boolean} True if OTP is valid
 */
export const verifyOTP = (inputOTP, storedOTP, expiryDate) => {
    if (!inputOTP || !storedOTP || !expiryDate) {
        return false;
    }

    // Check if OTP has expired
    if (new Date() > new Date(expiryDate)) {
        return false;
    }

    // Check if OTP matches
    return inputOTP === storedOTP;
};

/**
 * Get OTP expiry time (default 10 minutes from now)
 * @param {number} minutes - Minutes until expiry (default: 10)
 * @returns {Date} Expiry date
 */
export const getOTPExpiry = (minutes = 10) => {
    return new Date(Date.now() + minutes * 60 * 1000);
};

export default {
    generateOTP,
    verifyOTP,
    getOTPExpiry,
};
