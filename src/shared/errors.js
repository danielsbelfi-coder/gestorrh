class AppError extends Error {
    constructor(message, statusCode) {
        super(message)
        this.statusCode = statusCode
    }
}

class NotFoundError extends AppError {
    constructor(message) {
        super(message, 404)
    }
}

class ConflictError extends AppError {
    constructor(message) {
        super(message, 409)
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400)
    }
}

class AuthenticationError extends AppError {
    constructor(message) {
        super(message, 401)
    }
}

module.exports = {
    AppError,
    NotFoundError,
    ConflictError,
    ValidationError,
    AuthenticationError
}