// src/services/academyService.js

import { supabase } from '../lib/supabaseClient';

export const academyService = {
    // === STUDENT QUERIES ===

    // Get all published courses
    getCourses: async () => {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('published', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching courses:', error);
            return [];
        }
        return data || [];
    },

    // Get course details (Modules & Lessons combined)
    getCourseDetails: async (courseId) => {
        // Fetch the course
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .single();

        if (courseError || !course) {
            console.error('Error fetching course:', courseError);
            return null;
        }

        // Fetch modules and their lessons
        const { data: modules, error: modulesError } = await supabase
            .from('modules')
            .select(`
                *,
                lessons (*)
            `)
            .eq('course_id', courseId)
            .order('order', { ascending: true });

        if (modulesError) {
            console.error('Error fetching modules:', modulesError);
            return { ...course, modules: [] };
        }

        // Sort lessons within modules since Supabase nested selects might not be strictly ordered by the nested table's 'order' column out of the box unless specified (which is complex in JS vs SQL view)
        // A simple JS sort is robust here
        const sortedModules = modules.map(m => ({
            ...m,
            lessons: (m.lessons || []).sort((a, b) => a.order - b.order)
        }));

        return { ...course, modules: sortedModules };
    },

    // Get specific lesson details
    getLesson: async (lessonId) => {
        const { data, error } = await supabase
            .from('lessons')
            .select('*')
            .eq('id', lessonId)
            .single();

        if (error) {
            console.error('Error fetching lesson:', error);
            return null;
        }
        return data;
    },

    // Get user progress for a course
    getCourseProgress: async (userId, courseId) => {
        if (!userId) return 0;

        // 1. Get all lesson IDs for this course
        const { data: modules } = await supabase
            .from('modules')
            .select('id')
            .eq('course_id', courseId);

        if (!modules || modules.length === 0) return 0;

        const moduleIds = modules.map(m => m.id);

        const { data: lessons } = await supabase
            .from('lessons')
            .select('id')
            .in('module_id', moduleIds);

        if (!lessons || lessons.length === 0) return 0;

        const lessonIds = lessons.map(l => l.id);

        // 2. Count completed lessons by user
        const { count, error } = await supabase
            .from('lesson_progress')
            .select('lesson_id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('completed', true)
            .in('lesson_id', lessonIds);

        if (error) {
            console.error('Error fetching progress:', error);
            return 0;
        }

        return Math.round(((count || 0) / lessonIds.length) * 100);
    },

    // Toggle lesson complete status (Upsert)
    toggleLessonProgress: async (userId, lessonId, isCompleted) => {
        if (!userId) return false;

        const { error } = await supabase
            .from('lesson_progress')
            .upsert(
                { user_id: userId, lesson_id: lessonId, completed: isCompleted },
                { onConflict: 'user_id,lesson_id' }
            );

        if (error) {
            console.error('Error saving progress:', error);
            return false;
        }
        return true;
    },

    // Get user's completed lessons array
    getUserCompletedLessons: async (userId) => {
        if (!userId) return [];

        const { data, error } = await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', userId)
            .eq('completed', true);

        if (error) {
            console.error('Error fetching completed lessons:', error);
            return [];
        }

        return data.map(p => p.lesson_id);
    },

    // === NOTES QUERIES ===

    // Get note for a lesson
    getNote: async (userId, lessonId) => {
        if (!userId) return '';

        const { data, error } = await supabase
            .from('lesson_notes')
            .select('content')
            .eq('user_id', userId)
            .eq('lesson_id', lessonId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching note:', error);
            return '';
        }
        return data ? data.content : '';
    },

    // Save/Update note (Upsert)
    saveNote: async (userId, lessonId, content) => {
        if (!userId) return false;

        const { error } = await supabase
            .from('lesson_notes')
            .upsert(
                { user_id: userId, lesson_id: lessonId, content: content, updated_at: new Date() },
                { onConflict: 'user_id,lesson_id' }
            );

        if (error) {
            console.error('Error saving note:', error);
            return false;
        }
        return true;
    },

    // === ADMIN QUERIES ===

    createCourse: async (courseData) => {
        const { data, error } = await supabase
            .from('courses')
            .insert([courseData])
            .select()
            .single();

        if (error) {
            console.error('Error creating course:', error);
            throw error;
        }
        return data;
    },

    createModule: async (moduleData) => {
        const { data, error } = await supabase
            .from('modules')
            .insert([moduleData])
            .select()
            .single();

        if (error) {
            console.error('Error creating module:', error);
            throw error;
        }
        return data;
    },

    createLesson: async (lessonData) => {
        const { data, error } = await supabase
            .from('lessons')
            .insert([lessonData])
            .select()
            .single();

        if (error) {
            console.error('Error creating lesson:', error);
            throw error;
        }
        return data;
    },

    uploadLessonVideo: async (file) => {
        if (!file) return null;

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `videos/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('course_videos')
            .upload(filePath, file);

        if (uploadError) {
            console.error("Error uploading video:", uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('course_videos')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
};
