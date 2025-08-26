const { HttpClient } = require('../utils/httpClient');
const config = require('../config/midtrans');
const CryptoUtils = require('../utils/crypto');

class PayoutService {
    constructor() {
        this.httpClient = new HttpClient();
        this.baseUrl = config.baseUrls.payout;
    }

    async createPayout(payoutData) {
        this.validatePayoutData(payoutData);
        const payload = this.preparePayoutPayload(payoutData);

        try {
            return await this.httpClient.post(
                this.baseUrl,
                '/iris/api/v1/payouts',
                payload
            );
        } catch (error) {
            throw error;
        }
    }

    async getPayout(referenceNo) {
        if (!referenceNo) {
            throw new Error('Reference number is required');
        }

        try {
            return await this.httpClient.get(
                this.baseUrl,
                `/iris/api/v1/payouts/${referenceNo}`
            );
        } catch (error) {
            throw error;
        }
    }

    async getPayoutHistory(filters = {}) {
        const params = {
            from_date: filters.from_date,
            to_date: filters.to_date,
            page: filters.page || 1,
            limit: filters.limit || 25
        };

        // Remove undefined values
        Object.keys(params).forEach(key =>
            params[key] === undefined && delete params[key]
        );

        try {
            return await this.httpClient.get(
                this.baseUrl,
                '/iris/api/v1/payouts',
                params
            );
        } catch (error) {
            throw error;
        }
    }

    async approvePayout(referenceNos, otp) {
        if (!Array.isArray(referenceNos) || referenceNos.length === 0) {
            throw new Error('Reference numbers array is required');
        }

        if (!otp) {
            throw new Error('OTP is required for payout approval');
        }

        const payload = {
            reference_nos: referenceNos,
            otp: otp
        };

        try {
            return await this.httpClient.post(
                this.baseUrl,
                '/iris/api/v1/payouts/approve',
                payload
            );
        } catch (error) {
            throw error;
        }
    }

    async rejectPayout(referenceNos, rejectReason) {
        if (!Array.isArray(referenceNos) || referenceNos.length === 0) {
            throw new Error('Reference numbers array is required');
        }

        if (!rejectReason) {
            throw new Error('Reject reason is required');
        }

        const payload = {
            reference_nos: referenceNos,
            reject_reason: rejectReason
        };

        try {
            return await this.httpClient.post(
                this.baseUrl,
                '/iris/api/v1/payouts/reject',
                payload
            );
        } catch (error) {
            throw error;
        }
    }

    async getBalance() {
        try {
            return await this.httpClient.get(
                this.baseUrl,
                '/iris/api/v1/balance'
            );
        } catch (error) {
            throw error;
        }
    }

    async getBankBalance(bank) {
        if (!bank) {
            throw new Error('Bank code is required');
        }

        try {
            return await this.httpClient.get(
                this.baseUrl,
                `/iris/api/v1/balance?bank=${bank}`
            );
        } catch (error) {
            throw error;
        }
    }

    async getBeneficiaries() {
        try {
            return await this.httpClient.get(
                this.baseUrl,
                '/iris/api/v1/beneficiaries'
            );
        } catch (error) {
            throw error;
        }
    }

    async createBeneficiary(beneficiaryData) {
        this.validateBeneficiaryData(beneficiaryData);

        try {
            return await this.httpClient.post(
                this.baseUrl,
                '/iris/api/v1/beneficiaries',
                beneficiaryData
            );
        } catch (error) {
            throw error;
        }
    }

    async updateBeneficiary(aliasName, updateData) {
        if (!aliasName) {
            throw new Error('Beneficiary alias name is required');
        }

        try {
            return await this.httpClient.patch(
                this.baseUrl,
                `/iris/api/v1/beneficiaries/${aliasName}`,
                updateData
            );
        } catch (error) {
            throw error;
        }
    }

    async deleteBeneficiary(aliasName) {
        if (!aliasName) {
            throw new Error('Beneficiary alias name is required');
        }

        try {
            return await this.httpClient.delete(
                this.baseUrl,
                `/iris/api/v1/beneficiaries/${aliasName}`
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
                `/iris/api/v1/account_validation`,
                { bank, account }
            );
        } catch (error) {
            throw error;
        }
    }

    async getAvailableBanks() {
        try {
            return await this.httpClient.get(
                this.baseUrl,
                '/iris/api/v1/beneficiary_banks'
            );
        } catch (error) {
            throw error;
        }
    }

    validatePayoutData(payoutData) {
        const required = ['payouts'];

        for (const field of required) {
            if (!payoutData[field]) {
                throw new Error(`${field} is required`);
            }
        }

        // Validate payouts array
        if (!Array.isArray(payoutData.payouts) || payoutData.payouts.length === 0) {
            throw new Error('payouts must be a non-empty array');
        }

        // Validate each payout
        payoutData.payouts.forEach((payout, index) => {
            if (!payout.beneficiary_name || !payout.beneficiary_account || !payout.beneficiary_bank || !payout.amount) {
                throw new Error(`Payout at index ${index} is missing required fields`);
            }

            if (typeof payout.amount !== 'number' || payout.amount <= 0) {
                throw new Error(`Payout at index ${index} must have a positive amount`);
            }

            // Validate amount limits
            if (payout.amount < 10000) {
                throw new Error(`Payout at index ${index}: minimum amount is Rp 10.000`);
            }

            if (payout.amount > 500000000) {
                throw new Error(`Payout at index ${index}: maximum amount is Rp 500.000.000`);
            }
        });
    }

    validateBeneficiaryData(beneficiaryData) {
        const required = ['name', 'account', 'bank', 'alias_name'];

        for (const field of required) {
            if (!beneficiaryData[field]) {
                throw new Error(`${field} is required for beneficiary`);
            }
        }

        // Validate alias name format (alphanumeric and underscore only)
        const aliasRegex = /^[a-zA-Z0-9_]+$/;
        if (!aliasRegex.test(beneficiaryData.alias_name)) {
            throw new Error('Alias name can only contain letters, numbers, and underscores');
        }
    }

    preparePayoutPayload(payoutData) {
        const payload = { ...payoutData };

        // Process each payout
        payload.payouts = payload.payouts.map(payout => ({
            beneficiary_name: payout.beneficiary_name,
            beneficiary_account: payout.beneficiary_account,
            beneficiary_bank: payout.beneficiary_bank,
            beneficiary_email: payout.beneficiary_email,
            amount: payout.amount.toString(), // Iris API expects string
            notes: payout.notes || 'Payout payment'
        }));

        return payload;
    }

    async createSimplePayout(recipient, amount, notes = 'Payout payment') {
        const payoutData = {
            payouts: [{
                beneficiary_name: recipient.name,
                beneficiary_account: recipient.account,
                beneficiary_bank: recipient.bank,
                beneficiary_email: recipient.email,
                amount: amount,
                notes: notes
            }]
        };

        return this.createPayout(payoutData);
    }

    async createBulkPayout(recipients, notes = 'Bulk payout') {
        const payouts = recipients.map(recipient => ({
            beneficiary_name: recipient.name,
            beneficiary_account: recipient.account,
            beneficiary_bank: recipient.bank,
            beneficiary_email: recipient.email,
            amount: recipient.amount,
            notes: recipient.notes || notes
        }));

        const payoutData = { payouts };
        return this.createPayout(payoutData);
    }

    async getTopUpInfo() {
        try {
            return await this.httpClient.get(
                this.baseUrl,
                '/iris/api/v1/balance/topup'
            );
        } catch (error) {
            throw error;
        }
    }

    getSupportedBanks() {
        return [
            'mandiri', 'bri', 'bca', 'bni', 'cimb', 'danamon', 'permata',
            'btn', 'maybank', 'panin', 'ocbc', 'mega', 'sinarmas', 'bsi',
            'hsbc', 'standard_chartered', 'uob', 'muamalat', 'bjb'
        ];
    }

    isBankSupported(bankCode) {
        return this.getSupportedBanks().includes(bankCode.toLowerCase());
    }

    calculatePayoutFee(amount, bank) {
        // Standard fees for different banks (example rates)
        const fees = {
            'bca': 2500,
            'mandiri': 2500,
            'bni': 2500,
            'bri': 2500,
            'cimb': 5000,
            'danamon': 5000,
            'permata': 5000,
            'default': 2500
        };

        return fees[bank.toLowerCase()] || fees.default;
    }

    formatAmount(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}

module.exports = PayoutService