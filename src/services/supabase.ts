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

export const SAVE_UNCONFIRMED = 'The save could not be confirmed. Retry to finish it; a retry will not create a duplicate.';

// A save key is created once per document and reused by every retry, so it doubles as the storage path's idempotency key.
export function documentPath(userId: string, saveKey: string, file: File) {
    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    return `${userId}/${saveKey}${ext ? `.${ext}` : ''}`;
}

// PostgREST and Storage report a status when the server answered; a missing status means the write may or may not have landed.
const answered = (error: unknown) => {
    const status = Number((error as { status?: unknown; statusCode?: unknown })?.status ?? (error as { statusCode?: unknown })?.statusCode);
    return Number.isFinite(status) && status > 0;
};
const alreadyExists = (error: unknown) => {
    const { status, statusCode, message } = (error ?? {}) as { status?: unknown; statusCode?: unknown; message?: unknown };
    return String(status) === '409' || String(statusCode) === '409' || /already exists|duplicate/i.test(String(message ?? ''));
};

export async function uploadDocument(
    file: File,
    docType: string,
    extractedData: unknown,
    userId: string,
    saveKey: string = crypto.randomUUID()
) {
    const supabase = requireSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) throw new Error('Please sign in again before saving.');
    const filePath = documentPath(userId, saveKey, file);

    // 1. Store the original. A retry after an unconfirmed upload finds the same object already present.
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file, { upsert: false });
    if (uploadError && !alreadyExists(uploadError)) {
        logger.error('Error uploading document:', uploadError);
        throw new Error(answered(uploadError) ? 'The document file could not be stored. Your fields are still here; please retry.' : SAVE_UNCONFIRMED);
    }

    // 2. Record the metadata. The unique file path turns a repeated insert into a confirmation of the earlier save.
    const { data: saved, error: dbError, status } = await supabase
        .from('documents')
        .insert({ user_id: userId, file_path: filePath, doc_type: docType, extracted_data: extractedData })
        .select('id')
        .single();
    if (!dbError && saved?.id) return { success: true, id: String(saved.id) };

    if ((dbError as { code?: string } | null)?.code === '23505') {
        const { data: existing, error: lookupError } = await supabase
            .from('documents')
            .update({ extracted_data: extractedData, doc_type: docType })
            .eq('file_path', filePath)
            .eq('user_id', userId)
            .select('id')
            .single();
        if (!lookupError && existing?.id) return { success: true, id: String(existing.id) };
        logger.error('Error confirming an earlier save:', lookupError);
        throw new Error(SAVE_UNCONFIRMED);
    }

    logger.error('Error saving document metadata:', dbError);
    if (dbError && status >= 400 && status < 500 && status !== 408) {
        // The database refused the record, so no row references the file; remove it rather than leave an orphan.
        // Timeouts and 5xx gateway answers may follow a committed insert, so they keep the file for a safe retry.
        const { error: cleanupError } = await supabase.storage.from('documents').remove([filePath]);
        if (cleanupError) logger.error('Error removing unsaved document file:', cleanupError);
        throw new Error('The document could not be saved. Your fields are still here; please retry.');
    }
    throw new Error(SAVE_UNCONFIRMED);
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Please sign in again before deleting.');
    // 1. Delete from Storage first: removing an already-missing file succeeds, so a failed row delete is safe to retry.
    const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

    if (storageError) {
        logger.error('Error deleting file from storage:', storageError);
        throw storageError;
    }

    // 2. Delete from Database
    const { data: deleted, error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id');

    if (dbError || !deleted?.length) {
        logger.error('Error deleting record from database:', dbError);
        throw new Error('The document could not be deleted. Please retry.');
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
