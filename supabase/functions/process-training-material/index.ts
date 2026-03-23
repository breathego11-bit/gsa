import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.1.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { file_path, file_type, file_name } = await req.json()

        // 1. Setup Clients
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Support both standard and user-defined key names
        const openAiKey = Deno.env.get('OPENAI_API_KEY') ?? Deno.env.get('openai_api_key1')
        if (!openAiKey) {
            throw new Error("Missing OPENAI_API_KEY or openai_api_key1")
        }

        const configuration = new Configuration({ apiKey: openAiKey })
        const openai = new OpenAIApi(configuration)

        // 2. Download File
        const { data: fileData, error: downloadError } = await supabaseClient
            .storage
            .from('training_uploads')
            .download(file_path)

        if (downloadError) throw downloadError

        // 3. Extract Text (Whisper for Audio/Video, Text for others)
        let textContent = '';

        if (file_type.includes('audio') || file_type.includes('video') || file_type.includes('mp4') || file_type.includes('mpeg')) {
            console.log("Processing Audio/Video with Whisper via fetch...");

            // Normalize Deno File/Blob for FormData
            const blob = fileData.slice(0, fileData.size, "audio/mpeg");
            const file = new File([blob], "input.mp3", { type: "audio/mpeg" });

            const formData = new FormData();
            formData.append("file", file);
            formData.append("model", "whisper-1");

            const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${openAiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error("Whisper Error:", errorBody);
                throw new Error(`Whisper API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            textContent = data.text;
            console.log("Transcription complete length:", textContent.length);

        } else {
            // Default to text
            textContent = await fileData.text()
        }

        // 4. Split and Embed
        // Simple chunking by paragraphs or max tokens
        const chunks = textContent.match(/[\s\S]{1,1000}/g) || []

        for (const chunk of chunks) {
            if (!chunk.trim()) continue;

            const embeddingResponse = await openai.createEmbedding({
                model: 'text-embedding-3-small',
                input: chunk.replace(/\n/g, ' '),
            })
            const embedding = embeddingResponse.data.data[0].embedding

            // 5. Store
            const { error: insertError } = await supabaseClient
                .from('training_materials')
                .insert({
                    content: chunk,
                    metadata: { file_path, file_name, file_type },
                    embedding
                })

            if (insertError) console.error("Error inserting chunk:", insertError)
        }

        return new Response(
            JSON.stringify({ success: true, chunks_processed: chunks.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
