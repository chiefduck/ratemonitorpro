import { supabase } from '../lib/supabase';
import { debug, Category } from '../lib/debug';

const COMPONENT_ID = 'StripeService';

export const plans = [
  {
    id: 'price_1QuFSOEsyVlivUjUI616psS8', // Your actual Stripe price ID
    name: 'Standard',
    price: 49,
    interval: 'month',
    features: [
      'Unlimited clients',
      'Real-time rate monitoring',
      'Smart notifications',
      'Client management',
      'Rate analytics',
      'Email support',
      'API access'
    ],
    maxClients: -1, // Unlimited
    maxAlerts: -1 // Unlimited
  }
];

export async function createCheckoutSession(priceId: string, email: string) {
  try {
    debug.logInfo(Category.API, 'Creating checkout session', { priceId, email }, COMPONENT_ID);
    
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId, email }
    });

    if (error) throw error;
    
    if (data?.sessionUrl) {
      window.location.href = data.sessionUrl;
    } else {
      throw new Error('No session URL returned');
    }
  } catch (err) {
    debug.logError(Category.API, 'Error creating checkout session', {}, err, COMPONENT_ID);
    throw err;
  }
}

export async function getSubscriptionStatus() {
  try {
    debug.logInfo(Category.API, 'Fetching subscription status', {}, COMPONENT_ID);
    
    const { data, error } = await supabase.functions.invoke('get-subscription');
    
    if (error) throw error;
    return data;
  } catch (err) {
    debug.logError(Category.API, 'Error fetching subscription', {}, err, COMPONENT_ID);
    throw err;
  }
}

export async function cancelSubscription() {
  try {
    debug.logInfo(Category.API, 'Canceling subscription', {}, COMPONENT_ID);
    
    const { error } = await supabase.functions.invoke('cancel-subscription');
    
    if (error) throw error;
  } catch (err) {
    debug.logError(Category.API, 'Error canceling subscription', {}, err, COMPONENT_ID);
    throw err;
  }
}

export async function getBillingHistory() {
  try {
    debug.logInfo(Category.API, 'Fetching billing history', {}, COMPONENT_ID);
    
    const { data, error } = await supabase.functions.invoke('get-billing-history');
    
    if (error) throw error;
    return data;
  } catch (err) {
    debug.logError(Category.API, 'Error fetching billing history', {}, err, COMPONENT_ID);
    throw err;
  }
}