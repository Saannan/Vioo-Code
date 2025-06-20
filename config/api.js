import { supabase } from './supabase-init.js';
import { supabaseConfig } from './config.js';

const generateUniqueId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const createPaste = async (pasteData, content) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return { error: { message: 'User not authenticated' } };

    const pasteId = generateUniqueId();
    const filePath = `${user.id}/${pasteId}.txt`;

    const { error: uploadError } = await supabase.storage
        .from(supabaseConfig.bucket)
        .upload(filePath, content);

    if (uploadError) return { error: uploadError };

    const { data: profile } = await supabase.from('users').select('username, avatar_url').eq('id', user.id).single();

    const { data, error } = await supabase.from('pastes').insert({
        id: pasteId,
        title: pasteData.title,
        description: pasteData.description,
        language: pasteData.language,
        visibility: pasteData.visibility,
        author_id: user.id,
        author_username: profile.username,
        author_avatar_url: profile.avatar_url,
        storage_path: filePath
    }).select().single();

    return { data, error, pasteId };
};

export const getLatestPublicPastes = async (limit = 10) => {
    const { data, error } = await supabase
        .from('pastes')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(limit);
    return { data, error };
};

export const getPasteById = async (pasteId) => {
    const { data, error } = await supabase
        .from('pastes')
        .select('*')
        .eq('id', pasteId)
        .single();
    
    if (error) return { error };

    const { data: content, error: contentError } = await supabase
        .storage
        .from(supabaseConfig.bucket)
        .download(data.storage_path);

    if (contentError) return { error: contentError };

    const textContent = await content.text();
    return { data: { ...data, content: textContent } };
};

export const getCommentsByPasteId = async (pasteId) => {
    const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('paste_id', pasteId)
        .order('created_at', { ascending: true });
    return { data, error };
};

export const createComment = async (pasteId, text) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return { error: { message: 'User not authenticated' } };

    const { data: profile } = await supabase.from('users').select('username, avatar_url').eq('id', user.id).single();
    
    const { data, error } = await supabase.from('comments').insert({
        paste_id: pasteId,
        text: text,
        author_id: user.id,
        author_username: profile.username,
        author_avatar_url: profile.avatar_url
    }).select().single();

    if (!error) {
        await supabase.rpc('increment_comment_count', { p_id: pasteId });
    }

    return { data, error };
};

export const subscribeToComments = (pasteId, callback) => {
    const subscription = supabase
        .channel(`comments:${pasteId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `paste_id=eq.${pasteId}` }, (payload) => {
            callback(payload.new);
        })
        .subscribe();
    return subscription;
};

export const getProfileByUsername = async (username) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username_lowercase', username.toLowerCase())
        .single();
    return { data, error };
};

export const getPastesByAuthor = async (authorId) => {
    const { data, error } = await supabase
        .from('pastes')
        .select('*')
        .eq('author_id', authorId)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });
    return { data, error };
};

export const deletePaste = async (pasteId, storagePath) => {
    const { error: dbError } = await supabase.from('pastes').delete().eq('id', pasteId);
    if (dbError) return { error: dbError };

    const { error: storageError } = await supabase.storage.from(supabaseConfig.bucket).remove([storagePath]);
    return { error: storageError };
};