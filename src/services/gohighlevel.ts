import { supabase } from '../lib/supabase';
import { debug, Category } from '../lib/debug';

const COMPONENT_ID = 'GoHighLevelService';

interface GHLSubAccountResponse {
  locationId: string;
  apiKey: string;
}

export async function createGHLSubAccount(userId: string, companyName: string): Promise<GHLSubAccountResponse> {
  try {
    debug.logInfo(Category.API, 'Creating GHL sub-account', { userId, companyName }, COMPONENT_ID);
    
    const { data, error } = await supabase.functions.invoke('create-ghl-subaccount', {
      body: { 
        userId,
        companyName,
        email: `user_${userId}@yourdomain.com`, // Use a predictable email format
        phone: '', // Optional
        address: '', // Optional
      }
    });

    if (error) throw error;

    // Store the GHL location ID in the user's profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ ghl_location_id: data.locationId })
      .eq('id', userId);

    if (updateError) throw updateError;

    return data;
  } catch (err) {
    debug.logError(Category.API, 'Error creating GHL sub-account', {}, err, COMPONENT_ID);
    throw err;
  }
}

export async function syncClientToGHL(clientData: any, locationId: string) {
  try {
    debug.logInfo(Category.API, 'Syncing client to GHL', { clientData, locationId }, COMPONENT_ID);
    
    const { error } = await supabase.functions.invoke('sync-ghl-client', {
      body: { 
        locationId,
        client: {
          firstName: clientData.first_name,
          lastName: clientData.last_name,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          city: clientData.city,
          state: clientData.state,
          zip: clientData.zip,
          tags: ['Mortgage Client'],
          customFields: {
            current_rate: clientData.mortgages?.[0]?.current_rate,
            target_rate: clientData.mortgages?.[0]?.target_rate,
            loan_amount: clientData.mortgages?.[0]?.loan_amount,
            term_years: clientData.mortgages?.[0]?.term_years,
            lender: clientData.mortgages?.[0]?.lender
          }
        }
      }
    });

    if (error) throw error;
  } catch (err) {
    debug.logError(Category.API, 'Error syncing client to GHL', {}, err, COMPONENT_ID);
    throw err;
  }
}

export async function updateGHLContact(clientData: any, locationId: string) {
  try {
    debug.logInfo(Category.API, 'Updating GHL contact', { clientData, locationId }, COMPONENT_ID);
    
    const { error } = await supabase.functions.invoke('update-ghl-contact', {
      body: {
        locationId,
        contactId: clientData.ghl_contact_id,
        updates: {
          firstName: clientData.first_name,
          lastName: clientData.last_name,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          city: clientData.city,
          state: clientData.state,
          zip: clientData.zip,
          customFields: {
            current_rate: clientData.mortgages?.[0]?.current_rate,
            target_rate: clientData.mortgages?.[0]?.target_rate,
            loan_amount: clientData.mortgages?.[0]?.loan_amount,
            term_years: clientData.mortgages?.[0]?.term_years,
            lender: clientData.mortgages?.[0]?.lender
          }
        }
      }
    });

    if (error) throw error;
  } catch (err) {
    debug.logError(Category.API, 'Error updating GHL contact', {}, err, COMPONENT_ID);
    throw err;
  }
}

export async function addGHLTag(contactId: string, tag: string, locationId: string) {
  try {
    debug.logInfo(Category.API, 'Adding GHL tag', { contactId, tag, locationId }, COMPONENT_ID);
    
    const { error } = await supabase.functions.invoke('add-ghl-tag', {
      body: { contactId, tag, locationId }
    });

    if (error) throw error;
  } catch (err) {
    debug.logError(Category.API, 'Error adding GHL tag', {}, err, COMPONENT_ID);
    throw err;
  }
}

export async function removeGHLTag(contactId: string, tag: string, locationId: string) {
  try {
    debug.logInfo(Category.API, 'Removing GHL tag', { contactId, tag, locationId }, COMPONENT_ID);
    
    const { error } = await supabase.functions.invoke('remove-ghl-tag', {
      body: { contactId, tag, locationId }
    });

    if (error) throw error;
  } catch (err) {
    debug.logError(Category.API, 'Error removing GHL tag', {}, err, COMPONENT_ID);
    throw err;
  }
}