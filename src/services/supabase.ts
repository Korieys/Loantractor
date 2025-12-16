import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    logger.warn('Missing Supabase credentials. Auth and Storage features will not work.')
}

// ... (rest of file)

    } catch (error) {
    logger.error('Error uploading document:', error);
    throw error;
}
}

export async function getUserDocuments(userId: string) {
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

export async function getSignedUrl(filePath: string) {
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
    const { data, error } = await supabase.auth.updateUser(attributes);

    if (error) {
        logger.error('Error updating user profile:', error);
        throw error;
    }

    return data;
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
)

export async function uploadDocument(
    file: File,
    docType: string,
    extractedData: any,
    userId: string
) {
    try {
        // 1. Upload file to Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Save metadata to Database
        const { error: dbError } = await supabase
            .from('documents')
            .insert({
                user_id: userId,
                file_path: filePath,
                doc_type: docType,
                extracted_data: extractedData
            });

        if (dbError) throw dbError;

        return { success: true };
    } catch (error) {
        console.error('Error uploading document:', error);
        throw error;
    }
}

export async function getUserDocuments(userId: string) {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching documents:', error);
        throw error;
    }

    return data;
}

export async function getSignedUrl(filePath: string) {
    const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

    if (error) {
        console.error('Error creating signed URL:', error);
        throw error;
    }

    return data.signedUrl;
}

export async function deleteDocument(id: string, filePath: string) {
    // 1. Delete from Storage
    const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

    if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        throw storageError;
    }

    // 2. Delete from Database
    const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

    if (dbError) {
        console.error('Error deleting record from database:', dbError);
        throw dbError;
    }

    return { success: true };
}

export async function updateUserProfile(attributes: { data: { first_name: string, last_name: string } }) {
    const { data, error } = await supabase.auth.updateUser(attributes);

    if (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }

    return data;
}

