const { HttpClient } = require('../utils/httpClient');
const config = require('../config/midtrans');
const CryptoUtils = require('../utils/crypto');

class DisbursementService {
    constructor() {
        this.httpClient = new HttpClient();
        this.baseUrl = config.baseUrls.disbursement;
    }

    async createBankDisbursement(disbursementData) {
        this.validateBankDisbursementData(disbursementData);
        const payload = this.prepareBankDisbursementPayload(disbursementData);

        try {
            return await this.httpClient.post(
                this.baseUrl,
                '/v1/disbursements',
                payload
            );
        } catch (error) {
            throw error;
        }
    }

    async createGoPayDisbursement(disbursementData) {
        this.validateGoPayDisbursementData(disbursementData);
        const payload = this.prepareGoPayDisbursementPayload(disbursementData);

        try {
            return await this.httpClient.post(
                this.baseUrl,
                '/v1/disbursements',
                payload
            );
        } catch (error) {
            throw error;
        }
    }

    async getDisbursement(disbursementId) {
        if (!disbursementId) {
            throw new Error('Disbursement ID is required');
        }

        try {
            return await this.httpClient.get(
                this.baseUrl,
                `/v1/disbursements/${disbursementId}`
            );
        } catch (error) {
            throw error;
        }
    }

    async getAllDisbursements(filters = {}) {
        const params = {
            page: filters.page || 1,
            per_page: filters.per_page || 10,
            status: filters.status,
            created_at_start: filters.created_at_start,
            created_at_end: filters.created_at_end,
            external_id: filters.external_id
        };

        // Remove undefined values
        Object.keys(params).forEach(key =>
            params[key] === undefined && delete params[key]
        );

        try {
            return await this.httpClient.get(
                this.baseUrl,
                '/v1/disbursements',
                params
            );
        } catch (error) {
            throw error;
        }
    }

    async approveDisbursement(disbursementId, approvalData = {}) {
        if (!disbursementId) {
            throw new Error('Disbursement ID is required');
        }

        const payload = {
            action: 'approve',
            notes: approvalData.notes || 'Disbursement approved'
        };

        try {
            return await this.httpClient.post(
                this.baseUrl,
                `/v1/disbursements/${disbursementId}/approve`,
                payload
            );
        } catch (error) {
            throw error;
        }
    }

    async rejectDisbursement(disbursementId, rejectionData = {}) {
        if (!disbursementId) {
            throw new Error('Disbursement ID is required');
        }

        const payload = {
            action: 'reject',
            notes: rejectionData.notes || 'Disbursement rejected',
            reason: rejectionData.reason || 'Rejected by system'
        };

        try {
            return await this.httpClient.post(
                this.baseUrl,
                `/v1/disbursements/${disbursementId}/reject`,
                payload
            );
        } catch (error) {
            throw error;
        }
    }

    async getAvailableBanks() {
        try {
            return await this.httpClient.get(
                this.baseUrl,
                '/v1/account_validation/banks'
            );
        } catch (error) {
            throw error;
        }
    }

    async validateBankAccount(bank, account) {
        if (!bank || !account) {
            throw new Error('Bank code and account number are required');
        }

        try {
            return await this.httpClient.get(
                this.baseUrl,
                `/v1/account_validation`,
                { bank, account }
            );
        } catch (error) {
            throw error;
        }
    }

    async getBalance() {
        try {
            return await this.httpClient.get(
                this.baseUrl,
                '/v1/balance'
            );
        } catch (error) {
            throw error;
        }
    }

    validateBankDisbursementData(disbursementData) {
        const required = ['payouts'];

        for (const field of required) {
            if (!disbursementData[field]) {
                throw new Error(`${field} is required`);
            }
        }

        // Validate payouts array
        if (!Array.isArray(disbursementData.payouts) || disbursementData.payouts.length === 0) {
            throw new Error('payouts must be a non-empty array');
        }

        // Validate each payout
        disbursementData.payouts.forEach((payout, index) => {
            if (!payout.beneficiary_name || !payout.beneficiary_account || !payout.beneficiary_bank || !payout.amount) {
                throw new Error(`Payout at index ${index} is missing required fields`);
            }

            if (typeof payout.amount !== 'number' || payout.amount <= 0) {
                throw new Error(`Payout at index ${index} must have a positive amount`);
            }
        });
    }

    validateGoPayDisbursementData(disbursementData) {
        const required = ['payouts'];

        for (const field of required) {
            if (!disbursementData[field]) {
                throw new Error(`${field} is required`);
            }
        }

        // Validate payouts array
        if (!Array.isArray(disbursementData.payouts) || disbursementData.payouts.length === 0) {
            throw new Error('payouts must be a non-empty array');
        }

        // Validate each payout
        disbursementData.payouts.forEach((payout, index) => {
            if (!payout.beneficiary_name || !payout.beneficiary_account || !payout.amount) {
                throw new Error(`Payout at index ${index} is missing required fields`);
            }

            if (typeof payout.amount !== 'number' || payout.amount <= 0) {
                throw new Error(`Payout at index ${index} must have a positive amount`);
            }

            // Validate phone number format for GoPay
            const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,}$/;
            if (!phoneRegex.test(payout.beneficiary_account)) {
                throw new Error(`Payout at index ${index} has invalid phone number format`);
            }
        });
    }

    prepareBankDisbursementPayload(disbursementData) {
        const payload = { ...disbursementData };

        // Add external ID if not provided
        if (!payload.external_id) {
            payload.external_id = CryptoUtils.generateOrderId('DISB');
        }

        // Add timestamp if not provided
        if (!payload.timestamp) {
            payload.timestamp = new Date().toISOString();
        }

        // Process each payout
        payload.payouts = payload.payouts.map(payout => ({
            beneficiary_name: payout.beneficiary_name,
            beneficiary_account: payout.beneficiary_account,
            beneficiary_bank: payout.beneficiary_bank,
            beneficiary_email: payout.beneficiary_email,
            amount: payout.amount,
            notes: payout.notes || 'Disbursement payment',
            external_id: payout.external_id || CryptoUtils.generateRandomString(12)
        }));

        return payload;
    }

    prepareGoPayDisbursementPayload(disbursementData) {
        const payload = { ...disbursementData };

        // Add external ID if not provided
        if (!payload.external_id) {
            payload.external_id = CryptoUtils.generateOrderId('GOPAY-DISB');
        }

        // Add timestamp if not provided
        if (!payload.timestamp) {
            payload.timestamp = new Date().toISOString();
        }

        // Process each payout for GoPay
        payload.payouts = payload.payouts.map(payout => ({
            beneficiary_name: payout.beneficiary_name,
            beneficiary_account: payout.beneficiary_account,
            beneficiary_bank: 'gopay',
            amount: payout.amount,
            notes: payout.notes || 'GoPay disbursement',
            external_id: payout.external_id || CryptoUtils.generateRandomString(12)
        }));

        return payload;
    }

    async createSimpleBankDisbursement(externalId, recipient, amount, notes = 'Payment') {
        const disbursementData = {
            external_id: externalId,
            payouts: [{
                beneficiary_name: recipient.name,
                beneficiary_account: recipient.account,
                beneficiary_bank: recipient.bank,
                beneficiary_email: recipient.email,
                amount: amount,
                notes: notes
            }]
        };

        return this.createBankDisbursement(disbursementData);
    }

    async createSimpleGoPayDisbursement(externalId, recipientName, phoneNumber, amount, notes = 'GoPay payment') {
        const disbursementData = {
            external_id: externalId,
            payouts: [{
                beneficiary_name: recipientName,
                beneficiary_account: phoneNumber,
                amount: amount,
                notes: notes
            }]
        };

        return this.createGoPayDisbursement(disbursementData);
    }

    getSupportedBanks() {
        return [
            'mandiri', 'bri', 'bca', 'bni', 'cimb', 'danamon', 'permata',
            'bsi', 'btn', 'maybank', 'panin', 'ocbc', 'mega', 'sinarmas'
        ];
    }

    isBankSupported(bankCode) {
        return this.getSupportedBanks().includes(bankCode.toLowerCase());
    }

    formatGoPayPhoneNumber(phoneNumber) {
        // Remove all non-numeric characters
        let formatted = phoneNumber.replace(/\D/g, '');

        // Handle different formats
        if (formatted.startsWith('0')) {
            formatted = '62' + formatted.substring(1);
        } else if (!formatted.startsWith('62')) {
            formatted = '62' + formatted;
        }

        return formatted;
    }

    calculateDisbursementFee(amount, type = 'bank') {
        const fees = {
            bank: 4000, // Fixed fee for bank transfer
            gopay: 2500 // Fixed fee for GoPay
        };

        return fees[type.toLowerCase()] || fees.bank;
    }
}

module.exports = DisbursementService