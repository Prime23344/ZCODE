// ─── Payment Provider Interface (multi-country abstraction) ──
// Implement this interface per payment provider (M-Pesa, Flutterwave, Paystack, Stripe, etc.)

export interface PaymentProvider {
  /** Initiate a customer payment (e.g., STK Push) */
  initiatePayment(params: {
    phoneNumber: string;
    amount: number;
    currencyCode: string;
    bookingId: string;
    description: string;
  }): Promise<PaymentResult>;

  /** Confirm a payment (webhook callback or polling) */
  confirmPayment(externalRef: string): Promise<PaymentConfirmResult>;

  /** Send payout to provider */
  payout(params: {
    phoneNumber: string;
    amount: number;
    currencyCode: string;
    bookingId: string;
    description: string;
  }): Promise<PayoutResult>;
}

export interface PaymentResult {
  success: boolean;
  externalRef: string;
  message: string;
  rawResponse?: unknown;
}

export interface PaymentConfirmResult {
  success: boolean;
  externalRef: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  amount?: number;
  message: string;
}

export interface PayoutResult {
  success: boolean;
  externalRef: string;
  message: string;
  rawResponse?: unknown;
}

// ─── M-Pesa Sandbox/Mock Provider ──────────────────────────

export class MPesaSandboxProvider implements PaymentProvider {
  private env: string;
  private consumerKey: string;
  private consumerSecret: string;
  private passKey: string;
  private businessShortcode: string;

  constructor() {
    this.env = process.env.MPESA_ENV || 'sandbox';
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || '';
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
    this.passKey = process.env.MPESA_PASSKEY || '';
    this.businessShortcode = process.env.MPESA_BUSINESS_SHORTCODE || '174379';
  }

  async initiatePayment(params: {
    phoneNumber: string;
    amount: number;
    currencyCode: string;
    bookingId: string;
    description: string;
  }): Promise<PaymentResult> {
    // In sandbox mode, simulate a successful STK Push
    if (this.env === 'sandbox' || !this.consumerKey) {
      console.log(`[M-Pesa Mock] STK Push: ${params.phoneNumber} — ${params.amount} ${params.currencyCode} for booking ${params.bookingId}`);
      return {
        success: true,
        externalRef: `MPESA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message: 'STK Push initiated (sandbox). Payment will auto-confirm in 2 seconds.',
        rawResponse: {
          CheckoutRequestID: `CHK-${Date.now()}`,
          ResponseCode: '0',
          ResponseDescription: 'Success. Request accepted for processing',
          MerchantRequestID: `MRQ-${Date.now()}`,
        },
      };
    }

    // ─── Production M-Pesa Daraja API ────────────────────────
    // Uncomment and configure for production:
    //
    // const token = await this.getAccessToken();
    // const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, -4);
    // const password = Buffer.from(this.businessShortcode + this.passKey + timestamp).toString('base64');
    //
    // const response = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     BusinessShortCode: this.businessShortcode,
    //     Password: password,
    //     Timestamp: timestamp,
    //     TransactionType: 'CustomerPayBillOnline',
    //     Amount: params.amount,
    //     PartyA: params.phoneNumber,
    //     PartyB: this.businessShortcode,
    //     PhoneNumber: params.phoneNumber,
    //     CallBackURL: process.env.MPESA_CALLBACK_URL,
    //     AccountReference: params.bookingId,
    //     TransactionDesc: params.description,
    //   }),
    // });
    //
    // const data = await response.json();

    throw new Error('Production M-Pesa not configured. Set MPESA_ENV=production and provide credentials.');
  }

  async confirmPayment(_externalRef: string): Promise<PaymentConfirmResult> {
    // In sandbox, always confirm as successful
    return {
      success: true,
      externalRef: _externalRef,
      status: 'COMPLETED',
      message: 'Payment confirmed (sandbox)',
    };
  }

  async payout(params: {
    phoneNumber: string;
    amount: number;
    currencyCode: string;
    bookingId: string;
    description: string;
  }): Promise<PayoutResult> {
    console.log(`[M-Pesa Mock] B2C Payout: ${params.phoneNumber} — ${params.amount} ${params.currencyCode} for booking ${params.bookingId}`);
    return {
      success: true,
      externalRef: `B2C-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message: 'B2C payout initiated (sandbox)',
      rawResponse: {
        ConversationID: `CONV-${Date.now()}`,
        OriginatorConversationID: `OCID-${Date.now()}`,
        ResponseCode: '0',
        ResponseDescription: 'Acceptance service successful',
      },
    };
  }

  private async getAccessToken(): Promise<string> {
    // Production: fetch OAuth token from Daraja
    // const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    // const res = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    //   headers: { Authorization: `Basic ${auth}` },
    // });
    // const data = await res.json();
    // return data.access_token;
    return 'mock-token';
  }
}

// ─── Factory ───────────────────────────────────────────────

let paymentProviderInstance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!paymentProviderInstance) {
    paymentProviderInstance = new MPesaSandboxProvider();
  }
  return paymentProviderInstance;
}

export function setPaymentProvider(provider: PaymentProvider) {
  paymentProviderInstance = provider;
}
