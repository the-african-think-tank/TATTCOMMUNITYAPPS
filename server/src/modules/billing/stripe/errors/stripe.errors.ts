import { HttpException, HttpStatus } from '@nestjs/common';

export class StripeWebhookException extends HttpException {
    constructor(message: string) {
        super(`Stripe Webhook Error: ${message}`, HttpStatus.BAD_REQUEST);
    }
}

export class StripeCatalogException extends HttpException {
    constructor(message: string) {
        super(`Stripe Catalog Error: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

export class StripeCustomerException extends HttpException {
    constructor(message: string) {
        super(`Stripe Customer Error: ${message}`, HttpStatus.BAD_REQUEST);
    }
}
