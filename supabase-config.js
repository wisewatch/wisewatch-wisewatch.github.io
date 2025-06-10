import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/+esm'

// Initialize the Supabase client
const supabaseUrl = 'https://iqmlaseukgxnrmivvytk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbWxhc2V1a2d4bnJtaXZ2eXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MTQ0NzksImV4cCI6MjA2NTA5MDQ3OX0.31zQ0O11OmGsz9K-4uD7pENJ-1dt9vRFObNvSo3HXqE'

// Create the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

// Make it globally available immediately
window.supabase = supabase

// Test the connection
supabase.auth.getSession().then(({ data: { session } }) => {
    console.log('Supabase connection test:', session ? 'Connected' : 'Not connected');
}).catch(error => {
    console.error('Supabase connection error:', error);
});

export { supabase } 