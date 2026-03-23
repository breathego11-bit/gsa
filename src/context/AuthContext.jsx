import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { airtableService } from '../services/airtableService';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [gsaCertStatus, setGsaCertStatus] = useState(null); // true, false, or null (loading/unknown)
    const [isInstructor, setIsInstructor] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser(session.user);
                checkStatus(session.user.email);
                checkInstructorStatus(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser(session.user);
                syncProfile(session.user); // Sync to Profiles table
                // Only check if converting from no-user to user, or if status not set
                if (!gsaCertStatus) {
                    checkStatus(session.user.email);
                    checkInstructorStatus(session.user.id);
                }
            } else {
                setUser(null);
                setGsaCertStatus(null);
                setIsInstructor(false);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const syncProfile = async (user) => {
        try {
            // First, get current profile to not overwrite is_instructor if already there
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_instructor')
                .eq('id', user.id)
                .single();

            await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || user.email.split('@')[0],
                    updated_at: new Date()
                }, { onConflict: 'id' });

            setIsInstructor(profile?.is_instructor || false);
        } catch (err) {
            console.warn("Profile sync failed", err);
        }
    };

    const checkInstructorStatus = async (userId) => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('is_instructor')
                .eq('id', userId)
                .single();
            setIsInstructor(data?.is_instructor || false);
        } catch (err) {
            console.warn("Error checking instructor status", err);
        }
    };

    const checkStatus = async (email) => {
        // If no email, can't check.
        if (!email) {
            setGsaCertStatus(false);
            setLoading(false);
            return;
        }

        // Check Airtable
        const isCertified = await airtableService.checkCloserStatus(email);
        setGsaCertStatus(isCertified);
        setLoading(false);
    };

    const loginWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const value = {
        user,
        gsaCertStatus,
        isInstructor,
        setIsInstructor,
        loading,
        loginWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
