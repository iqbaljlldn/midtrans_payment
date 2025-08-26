const axios = require('axios')
const config = require('../config/midtrans')

class MidtransError extends Error {
    constructor(message, statusCode, response = null) {
        super(message)
        this.name = 'MidtransError',
            this.statusCode = statusCode,
            this.response = response
    }
}

class HttpClient {
    constructor() {
        this.timeout = config.timeout
    }

    createAxiosInstance(baseUrl, authType = 'server') {
        const authHeader = authType === 'server'
            ? config.getServerAuthHeader()
            : config.getClientAuthHeader

        return axios.create({
            baseUrl,
            timeout: this.timeout,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authHeader}`,
                'User-Agent': 'Midtrans-NodeJS-Module/1.0.0'
            }
        })
    }

    async handleResponse(requestPromise) {
        try {
            const response = await requestPromise

            if (!config.isProduction()) {
                console.log('✅ Midtrans API Response:', {
                    status: response.status,
                    data: response.data
                });
            }

            return response.data
        } catch (error) {
            if (error.response) {
                const { status, data } = error.response

                if (!config.isProduction()) {
                    console.error('❌ Midtrans API Error:', {
                        status,
                        data,
                        url: error.config?.url,
                        method: error.config?.method
                    });
                }

                let errorMessage = 'Midtrans API Error'
                if (data?.error_messages?.length > 0) {
                    errorMessage = data.error_messages.join(', ')
                } else if (data?.status_message) {
                    errorMessage = data.status_message;
                } else if (data?.message) {
                    errorMessage = data.message;
                }

                throw new MidtransError(errorMessage, status, data);
            } else if (error.request) {
                // Network error
                throw new MidtransError('Network error: Unable to reach Midtrans API', 0);
            } else {
                // Other errors
                throw new MidtransError(`Request error: ${error.message}`, 0);
            }
        }
    }

    async get(baseUrl, endpoint, params = {}, authType = 'server') {
        const client = this.createAxiosInstance(baseUrl, authType)
        const requestPromise = client.get(endpoint, { params })
        return this.handleResponse(requestPromise)
    }

    async post(baseUrl, endpoint, data = {}, authType = 'server') {
        const client = this.createAxiosInstance(baseUrl, authType)
        const requestPromise = client.post(endpoint, data);
        return this.handleResponse(requestPromise);
    }

    async put(baseURL, endpoint, data = {}, authType = 'server') {
        const client = this.createAxiosInstance(baseURL, authType);
        const requestPromise = client.put(endpoint, data);
        return this.handleResponse(requestPromise);
    }

    async patch(baseURL, endpoint, data = {}, authType = 'server') {
        const client = this.createAxiosInstance(baseURL, authType);
        const requestPromise = client.patch(endpoint, data);
        return this.handleResponse(requestPromise);
    }

    async delete(baseURL, endpoint, authType = 'server') {
        const client = this.createAxiosInstance(baseURL, authType);
        const requestPromise = client.delete(endpoint);
        return this.handleResponse(requestPromise);
    }
}

module.exports = { HttpClient, MidtransError };