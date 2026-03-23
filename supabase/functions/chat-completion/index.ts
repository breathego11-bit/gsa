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
        const { messages } = await req.json()
        const latestMessage = messages[messages.length - 1].content

        // 1. Setup Clients
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const openAiKey = Deno.env.get('OPENAI_API_KEY') ?? Deno.env.get('openai_api_key1')
        if (!openAiKey) {
            throw new Error("Missing OPENAI_API_KEY or openai_api_key1")
        }

        const configuration = new Configuration({ apiKey: openAiKey })
        const openai = new OpenAIApi(configuration)

        // 2. Generate Embedding for User Query
        const embeddingResponse = await openai.createEmbedding({
            model: 'text-embedding-3-small',
            input: latestMessage.replace(/\n/g, ' '),
        })
        const embedding = embeddingResponse.data.data[0].embedding

        // 3. Match Similar Content (RAG)
        const { data: documents, error: matchError } = await supabaseClient.rpc(
            'match_training_materials',
            {
                query_embedding: embedding,
                match_threshold: 0.5, // adjust as needed
                match_count: 5,
            }
        )

        if (matchError) {
            console.error("Match error:", matchError)
            // Continue without context if error, or throw
        }

        const contextText = documents?.map(doc => doc.content).join('\n---\n') || "No training data found."

        // 4. Chat Completion with Context
        const systemPrompt = `You are an expert AI Sales Coach for the 'Growth Sales Academy' (GSA).
    Your name is 'GSA Coach'. You are strict but helpful.
    
    Use the following context from the user's training materials to answer the question.
    If the answer is not in the context, use your general sales knowledge but mention that it's general advice.
    
    Context:
    ${contextText}
    `

        const completionResponse = await openai.createChatCompletion({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.role || 'user', content: m.content || m.text }))
            ],
            stream: true,
        })

        // 5. Stream Response (Simple Proxy for MVP)
        // For a real production app, we'd pipe the stream. 
        // For this MVP, let's wait for full response or handle simple stream.
        // The 'openai' node/deno lib `createChatCompletion` with stream:true returns a distinct object.

        // To simplify for this specific environment without complex stream piping logic:
        // Let's turn off streaming for the very first pass to ensure it works, then upgrade.
        // TODO: Upgrade to stream

        const simpleCompletion = await openai.createChatCompletion({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.role || 'user', content: m.content || m.text }))
            ],
        })

        const aiText = simpleCompletion.data.choices[0].message?.content || "No response."

        return new Response(
            JSON.stringify({ text: aiText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
