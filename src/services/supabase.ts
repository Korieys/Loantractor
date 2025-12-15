import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase credentials. Auth and Storage features will not work.')
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
