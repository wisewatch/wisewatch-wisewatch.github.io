import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/+esm'

const supabaseUrl = 'https://iqmlaseukgxnrmivvytk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3d2JqYnFqYnFqYnFqYnFqYnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk5MjQwMDAsImV4cCI6MjAyNTUwMDAwMH0.2QZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ'
const supabase = createClient(supabaseUrl, supabaseKey)

// Test the connection
supabase.auth.getSession().then(({ data: { session } }) => {
    console.log('Supabase connection test:', session ? 'Connected' : 'Not connected');
}).catch(error => {
    console.error('Supabase connection error:', error);
});

export { supabase } 