import type { MiddlewareHandler } from 'hono';
import type { Env, AppVariables } from '../types/env';

export const x402ChallengeData = {
  x402: {
    version: '2.0',
    network: 'eip155:8453',
    asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
    recipient: '0x0000000000000000000000000000000000000000',
    amount: '0',
    currency: 'USDC',
    description: 'OutbidWatch Machine-to-Machine API Access',
    facilitator: 'https://facilitator.x402.org',
  },
  payment_options: [
    {
      scheme: 'exact',
      network: 'eip155:8453',
      asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      amount: '0',
      recipient: '0x0000000000000000000000000000000000000000',
    },
  ],
  status: 402,
  message: 'Payment Required - x402 Protocol',
};

const base64Challenge = btoa(JSON.stringify(x402ChallengeData));

export const x402Middleware: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
  const path = c.req.path;
  const accept = c.req.header('Accept') || '';
  const x402Header = c.req.header('X-402') || c.req.header('Payment-Required') || '';

  // Return HTTP 402 challenge on explicit probes or paywall routes
  if (
    path === '/api/x402' ||
    path === '/api/paywall' ||
    path === '/api/premium' ||
    path === '/v1/premium' ||
    accept.includes('application/x402+json') ||
    x402Header === 'probe'
  ) {
    c.header('Content-Type', 'application/json; charset=utf-8');
    c.header('WWW-Authenticate', 'x402');
    c.header('PAYMENT-REQUIRED', base64Challenge);
    c.header('X-PAYMENT-REQUIRED', base64Challenge);
    c.header('X-402-Version', '2.0');
    c.header('X-402-Facilitator', 'https://facilitator.x402.org');
    c.header('Link', '</.well-known/x402>; rel="payment-details"');
    return c.json(x402ChallengeData, 402);
  }

  // On standard API responses, advertise x402 capability
  await next();
  if (path.startsWith('/api/') || path.startsWith('/v1/')) {
    c.header('X-402-Supported', 'true');
    c.header('X-402-Version', '2.0');
    c.header('X-402-Facilitator', 'https://facilitator.x402.org');
  }
};
