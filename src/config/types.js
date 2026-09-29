const userStatusTypes = {
    ACCEPTED: 'ACCEPTED',
    PENDING: 'PENDING',
    REJECTED: 'REJECTED',
    REVIEWING: 'REVIEWING',
    REVIEWED: 'REVIEWED',
};

const paymentModeTypes = {
    CREDIT_CARD: 'CREDIT_CARD',
    DEBIT_CARD: 'DEBIT_CARD',
    PHONE_PAY: 'PHONE_PAY',
    GOOGLE_PAY: 'GOOGLE_PAY',
    BANK_ACCOUNT: 'BANK_ACCOUNT',
    CARD: 'CARD',
    UNKNOWN: 'UNKNOWN',
};

const otpTypes = {
    EMAIL_VERIFICATION: 'email_verification',
    MOBILE_VERIFICATION: 'mobile_varification',
    FORGOT_PASSWORD: 'forgot_password',
    RESET_PASSWORD: 'reset_password'
};

const paymentStatusTypes = {
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    REJECTED: 'REJECTED',
    REFUNDED: 'REFUNDED',
};

const rolesTypes = {
    ADM: 'Admin',
    SUP_ADM: 'Super Admin',
    SUB_ADM: 'Sub Admin',
    ENG: 'Engineer',
    EDTR: 'Editor',
    CUSTOMER: 'User',
};

const bookingTypes = {
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    REJECTED: 'REJECTED',
    ESTIMATE: 'ESTIMATE'
};

const tokenTypes = {
    ACCESS: 'access',
    REFRESH: 'refresh',
    VERIFY_EMAIL: 'email_varification',
    FORGOT_PASSWORD: 'forgot_password',
    RESET_PASSWORD: 'reset_password',
    SESSION: 'session',
};

const currancyTypes = {
    USD : 'USD', 
    INR : 'INR', 
    EUR : 'EUR', 
    OMR : 'OMR', 
    CHF : 'CHF', 
    KYD : 'KYD'
};

const subscriptionTypes = {
    ONEMONTH : 'ONE-MONTH', 
    THREEMONTHS : 'THREE-MONTHS', 
    SIXMONTHS : 'SIX-MONTHS', 
    ANULLY : 'ANULLY', 
};

module.exports = {
    userStatusTypes,
    paymentModeTypes,
    otpTypes,
    paymentStatusTypes,
    rolesTypes,
    bookingTypes,
    tokenTypes,
    currancyTypes,
    subscriptionTypes,
};

