import { supabase } from '../services/supabaseClient';
import type { Transcription, AudioRecording, Translation, AudioFile, Team, Profile, TeamWithMembers } from '../types';
import { getAudioDuration } from './audioUtils';

// --- Transcription Functions ---

export const addTranscription = async (transcription: Partial<Transcription>): Promise<Transcription> => {
    const { data, error } = await supabase
        .from('transcriptions')
        .insert(transcription as any)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const getAllTranscriptions = async (): Promise<Transcription[]> => {
    const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const getTranscriptionById = async (id: string): Promise<Transcription | null> => {
    const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return data;
};

export const getTranscriptionByAudioId = async (audioId: string): Promise<Transcription | null> => {
    const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('audio_id', audioId)
        .maybeSingle(); // Use maybeSingle to handle 0 or 1 result without error
    if (error) throw error;
    return data;
};

export const updateTranscription = async (id: string, updates: Partial<Transcription>): Promise<void> => {
    const { error } = await supabase
        .from('transcriptions')
        .update(updates)
        .eq('id', id);
    if (error) throw error;
};

export const deleteTranscription = async (id: string): Promise<void> => {
    const transcription = await getTranscriptionById(id);
    if (!transcription) return;

    const { error: deleteError } = await supabase
        .from('transcriptions')
        .delete()
        .eq('id', id);
    if (deleteError) throw deleteError;

    if (transcription.audio_id) {
        await deleteAudioFile(transcription.audio_id);
    }
};

// --- Audio File Functions ---

export const countUserAudioFiles = async (userId: string): Promise<number> => {
    const { count, error } = await supabase
        .from('audio_files')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
    if (error) throw error;
    return count || 0;
};

// ADVICE: The 'audio_files' table and the 'audio_files' storage bucket currently have permissive RLS policies
// allowing public access. This is a security risk. It's highly recommended to restrict access so users can only
// manage their own audio files.
//
// Recommended RLS Policies for 'audio_files' table:
// CREATE POLICY "Enable insert for authenticated users" ON public.audio_files FOR INSERT WITH CHECK (auth.uid() = user_id);
// CREATE POLICY "Enable select for own audio files" ON public.audio_files FOR SELECT USING (auth.uid() = user_id);
// CREATE POLICY "Enable update for own audio files" ON public.audio_files FOR UPDATE USING (auth.uid() = user_id);
// CREATE POLICY "Enable delete for own audio files" ON public.audio_files FOR DELETE USING (auth.uid() = user_id);
//
// Recommended Storage Policies for 'audio_files' bucket:
// CREATE POLICY "Allow user-specific folder access" ON storage.objects FOR ALL
// USING (bucket_id = 'audio_files' AND auth.uid()::text = (storage.foldername(name))[1])
// WITH CHECK (bucket_id = 'audio_files' AND auth.uid()::text = (storage.foldername(name))[1]);

export const addAudioFile = async (audio: { name: string; audioBlob: Blob }, userId: string): Promise<AudioFile> => {
    const file = new File([audio.audioBlob], audio.name, { type: audio.audioBlob.type });
    // Sanitize the file name for the storage path to prevent "Invalid key" errors.
    // This replaces spaces and other problematic characters with underscores, making the path URL-safe.
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const storagePath = `${userId}/${Date.now()}-${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
        .from('audio_files')
        .upload(storagePath, file);
    if (uploadError) throw uploadError;

    const duration = await getAudioDuration(file);
    const newAudioFile: Partial<AudioFile> = {
        user_id: userId,
        name: file.name,
        storage_path: storagePath,
        duration_seconds: duration,
        file_size_bytes: file.size,
    };

    const { data, error: insertError } = await supabase
        .from('audio_files')
        .insert(newAudioFile as any)
        .select()
        .single();
    if (insertError) throw insertError;
    return data;
};

export const getAllAudioFiles = async (): Promise<AudioFile[]> => {
    const { data, error } = await supabase
        .from('audio_files')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const getAudioFilesSince = async (startDate: string): Promise<AudioFile[]> => {
    const { data, error } = await supabase
        .from('audio_files')
        .select('*')
        .gte('created_at', startDate);

    if (error) throw error;
    return data || [];
};

export const getAudioRecording = async (id: string): Promise<AudioRecording | null> => {
    const { data: fileData, error } = await supabase.from('audio_files').select('*').eq('id', id).single();
    if (error || !fileData) return null;

    const { data: blob, error: downloadError } = await supabase.storage.from('audio_files').download(fileData.storage_path);
    if (downloadError) return null;

    return { id: fileData.id, name: fileData.name, date: new Date(fileData.created_at).getTime(), audioBlob: blob, isFavorite: fileData.is_favorite };
};

export const updateAudioFile = async (id: string, updates: Partial<AudioFile>): Promise<void> => {
    const { error } = await supabase.from('audio_files').update(updates).eq('id', id);
    if (error) throw error;
};

export const deleteAudioFile = async (id: string): Promise<void> => {
    const { data: audioFile, error: fetchError } = await supabase.from('audio_files').select('storage_path').eq('id', id).single();
    if (fetchError || !audioFile) return;

    const { error: storageError } = await supabase.storage.from('audio_files').remove([audioFile.storage_path]);
    if (storageError) console.error("Failed to delete from storage:", storageError);

    const { error: deleteError } = await supabase.from('audio_files').delete().eq('id', id);
    if (deleteError) throw deleteError;
};

// --- Translation Functions ---

// ADVICE: The 'translations' table currently has a permissive RLS policy allowing public access.
// For security, it's recommended to restrict access so users can only manage their own translations.
// Example Policies:
// CREATE POLICY "Enable insert for authenticated users" ON public.translations FOR INSERT WITH CHECK (auth.uid() = user_id);
// CREATE POLICY "Enable select for own translations" ON public.translations FOR SELECT USING (auth.uid() = user_id);
// CREATE POLICY "Enable update for own translations" ON public.translations FOR UPDATE USING (auth.uid() = user_id);
// CREATE POLICY "Enable delete for own translations" ON public.translations FOR DELETE USING (auth.uid() = user_id);

export const addTranslation = async (translation: Partial<Translation>): Promise<Translation> => {
    const { data, error } = await supabase.from('translations').insert(translation as any).select().single();
    if (error) throw error;
    return data;
}

export const getAllSavedTranslations = async (): Promise<Translation[]> => {
    const { data, error } = await supabase
        .from('translations')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const getTranslationsByTranscriptionId = async (transcriptionId: string): Promise<Translation[]> => {
    const { data, error } = await supabase
        .from('translations')
        .select('*')
        .eq('transcription_id', transcriptionId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const deleteTranslation = async (id: string): Promise<void> => {
    const { error } = await supabase.from('translations').delete().eq('id', id);
    if (error) throw error;
}

// --- Team Functions ---

export const createTeam = async (name: string, ownerId: string): Promise<Team> => {
    const { data, error } = await supabase.from('teams').insert({ name, owner_id: ownerId }).select().single();
    if (error) throw error;
    return data;
};

export const getUserTeam = async (userId: string): Promise<TeamWithMembers | null> => {
    const { data: profile } = await supabase.from('profiles').select('team_id').eq('id', userId).single();
    if (!profile?.team_id) return null;

    const { data: team, error: teamError } = await supabase.from('teams').select('*').eq('id', profile.team_id).single();
    if (teamError || !team) return null;

    const { data: members, error: membersError } = await supabase.from('profiles').select('*').eq('team_id', team.id);
    if (membersError) throw membersError;

    return { ...team, members: members || [] };
};

export const updateProfileTeamId = async (userId: string, teamId: string | null): Promise<void> => {
    const { error } = await supabase.from('profiles').update({ team_id: teamId }).eq('id', userId);
    if (error) throw error;
};

export const inviteUserToTeam = async (email: string, teamId: string): Promise<{ success: boolean; message: string }> => {
    // This is the secure way to handle invitations. It calls a server-side function
    // in Supabase that can bypass RLS to find a user by email and update their team_id.
    // You must create this function in your Supabase SQL editor.
    const { data, error } = await supabase.rpc('invite_user_to_team', {
        user_email: email,
        team_id_to_add: teamId,
    });

    if (error) {
        console.error("RPC Error:", error);
        return { success: false, message: error.message };
    }

    return data; // The RPC function should return { success: boolean, message: string }
};
