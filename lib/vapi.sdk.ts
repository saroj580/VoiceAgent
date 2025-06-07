import Vapi from '@vapi-ai/web';

let vapiInstance: Vapi | null = null;

try {
  const token = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;
  if (!token) {
    console.error('NEXT_PUBLIC_VAPI_WEB_TOKEN is not defined');
  } else {
    vapiInstance = new Vapi(token);
  }
} catch (error) {
  console.error('Error initializing Vapi SDK:', error);
}

export const vapi = vapiInstance || new Vapi('dummy-token-for-type-safety');