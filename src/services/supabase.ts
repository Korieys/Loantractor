import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

export const ACCOUNT_UNAVAILABLE = 'Sign-in, uploads, and saved documents are unavailable on this preview. You can still explore the fictional output sample.';

function initializeClient() {
    const url = import.meta.env.VITE_SUPABASE_URL?.trim();
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (!url || !key) return null;
    try {
        return createClient(url, key);
    } catch {
        logger.warn('Supabase configuration is invalid. Account features are unavailable.');
        return null;
    }
}

export const supabase = initializeClient();

function requireSupabase() {
    if (!supabase) throw new Error(ACCOUNT_UNAVAILABLE);
    return supabase;
}

export async function uploadDocument(
    file: File,
    docType: string,
    extractedData: unknown,
    userId: string
) {
    const supabase = requireSupabase();
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user || user.id !== userId) throw new Error('Please sign in again before saving.');
        // 1. Upload file to Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Save metadata to Database
        const { data: saved, error: dbError } = await supabase
            .from('documents')
            .insert({
                user_id: userId,
                file_path: filePath,
                doc_type: docType,
                extracted_data: extractedData
            })
            .select('id')
            .single();

        if (dbError) throw dbError;
        if (!saved?.id) throw new Error('The save could not be confirmed. Check your Documents library before retrying.');

        return { success: true, id: String(saved.id) };
    } catch (error) {
        logger.error('Error uploading document:', error);
        throw error;
    }
}

export async function getUserDocuments(userId: string) {
    const supabase = requireSupabase();
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        logger.error('Error fetching documents:', error);
        throw error;
    }

    return data;
}

export async function updateDocument(id: string, extractedData: unknown, docType?: string) {
    const supabase = requireSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Please sign in again before saving.');

    const { data, error } = await supabase
        .from('documents')
        .update({ extracted_data: extractedData, ...(docType ? { doc_type: docType } : {}) })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id')
        .single();

    if (error || !data) throw new Error('Your changes could not be saved. Please try again.');
}

export async function getSignedUrl(filePath: string) {
    const supabase = requireSupabase();
    const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

    if (error) {
        logger.error('Error creating signed URL:', error);
        throw error;
    }

    return data.signedUrl;
}

export async function deleteDocument(id: string, filePath: string) {
    const supabase = requireSupabase();
    // 1. Delete from Storage
    const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

    if (storageError) {
        logger.error('Error deleting file from storage:', storageError);
        throw storageError;
    }

    // 2. Delete from Database
    const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

    if (dbError) {
        logger.error('Error deleting record from database:', dbError);
        throw dbError;
    }

    return { success: true };
}

export async function updateUserProfile(attributes: { data: { first_name: string, last_name: string } }) {
    const supabase = requireSupabase();
    const { data, error } = await supabase.auth.updateUser(attributes);

    if (error) {
        logger.error('Error updating user profile:', error);
        throw error;
    }

    return data;
}
