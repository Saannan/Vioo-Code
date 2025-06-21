import { supabase } from './supabase-init.js';
import { supabaseConfig } from './config.js';

export function generateShortId() {
    return Math.random().toString(36).substring(2, 10);
}

export async function checkUsernameExists(username) {
    const { data, error } = await supabase
        .from('users')
        .select('username_lowercase')
        .eq('username_lowercase', username)
        .maybeSingle();
    if (error) throw error;
    return data !== null;
}

export async function getUserProfileByAuthId(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) throw error;
    return data;
}

export async function getUserProfileByUsername(username) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username_lowercase', username.toLowerCase())
        .single();
    if (error) throw error;
    return data;
}

export async function createPaste({ title, language, visibility, content, user }) {
    const pasteId = generateShortId();
    const profile = await getUserProfileByAuthId(user.id);
    
    const folder = visibility === 'private' ? `private/${user.id}` : 'public';
    const filePath = `${folder}/${pasteId}.txt`;

    const { error: uploadError } = await supabase.storage
        .from(supabaseConfig.bucket)
        .upload(filePath, content);

    if (uploadError) throw uploadError;

    const { data, error: dbError } = await supabase
        .from('pastes')
        .insert({
            id: pasteId,
            author_id: user.id,
            title,
            language,
            visibility,
            storage_path: filePath,
            author_username: profile.username,
            author_avatar_url: profile.avatar_url
        })
        .select()
        .single();

    if (dbError) throw dbError;
    return data;
}

export async function getPublicPastes() {
    const { data, error } = await supabase
        .from('pastes')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(20);
    if (error) throw error;
    return data;
}

export async function getPasteById(id) {
    const { data, error } = await supabase
        .from('pastes')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

export async function getRawPasteContent(storagePath) {
    const { data, error } = await supabase
        .storage
        .from(supabaseConfig.bucket)
        .download(storagePath);
    if (error) throw error;
    return data.text();
}

export async function getPastesByUsername(username) {
    const profile = await getUserProfileByUsername(username);
    if (!profile) return [];
    
    const { data, error } = await supabase
        .from('pastes')
        .select('*')
        .eq('author_id', profile.id)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });
        
    if (error) throw error;
    return data;
}

export async function getMyPastes(userId) {
    const { data, error } = await supabase
        .from('pastes')
        .select('*')
        .eq('author_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}


export async function deletePaste(pasteId, storagePath) {
    const { error: storageError } = await supabase.storage
        .from(supabaseConfig.bucket)
        .remove([storagePath]);
    if (storageError) throw storageError;

    const { error: dbError } = await supabase
        .from('pastes')
        .delete()
        .eq('id', pasteId);
    if (dbError) throw dbError;
}


export async function getComments(pasteId) {
    const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('paste_id', pasteId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
}

export async function postComment({ pasteId, text, user }) {
    const profile = await getUserProfileByAuthId(user.id);
    const { data, error } = await supabase
        .from('comments')
        .insert({
            paste_id: pasteId,
            author_id: user.id,
            text,
            author_username: profile.username,
            author_avatar_url: profile.avatar_url
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export function subscribeToComments(pasteId, callback) {
    return supabase
        .channel(`comments:${pasteId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `paste_id=eq.${pasteId}` }, payload => {
            callback(payload.new);
        })
        .subscribe();
}