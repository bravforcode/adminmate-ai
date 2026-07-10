import { supabase } from '../../lib/supabase'

/* ============================================================
   AI Policy Assistant Service
   Permission-scoped RAG for HR policy Q&A.
   Uses pgvector for similarity search + Gemini for generation.
   ============================================================ */

// ── Types ───────────────────────────────────────────────────

export interface PolicyQuery {
  question: string
  companyId: string
  userId: string
  userRole: string
  department?: string
}

export interface PolicyAnswer {
  answer: string
  sources: Array<{ title: string; category: string; relevance: number }>
  confidence: number
  handoffNeeded: boolean
}

export interface PolicyDocument {
  id: string
  title: string
  content: string
  category: string
  department: string | null
  min_role: string
  similarity: number
}

// ── Constants ───────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const LOW_CONFIDENCE_THRESHOLD = 0.5

// ── Main Function ───────────────────────────────────────────

/**
 * Query the AI Policy Assistant with permission-scoped retrieval.
 * Searches company documents by role, generates grounded answer via Gemini.
 */
export async function queryPolicyAssistant(query: PolicyQuery): Promise<PolicyAnswer> {
  // 1. Generate embedding for the question
  const questionEmbedding = await generateEmbedding(query.question)

  // 2. Search policy documents (scoped by role + company via RPC)
  const relevantDocs = await searchPolicyDocuments(
    query.companyId,
    questionEmbedding,
    query.userRole
  )

  if (relevantDocs.length === 0) {
    return {
      answer: "I couldn't find relevant policy information for your question. Let me connect you with an HR representative.",
      sources: [],
      confidence: 0,
      handoffNeeded: true,
    }
  }

  // 3. Generate answer using Gemini with retrieved context
  const answer = await generatePolicyAnswer(query.question, relevantDocs)

  return answer
}

// ── Embedding ───────────────────────────────────────────────

async function generateEmbedding(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY not configured')
  }

  const response = await fetch(
    `${GEMINI_BASE_URL}/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`)
  }

  const data = await response.json()
  return data.embedding.values
}

// ── Vector Search ───────────────────────────────────────────

async function searchPolicyDocuments(
  companyId: string,
  embedding: number[],
  userRole: string
): Promise<PolicyDocument[]> {
  const { data, error } = await supabase.rpc('search_policy_documents', {
    p_company_id: companyId,
    p_embedding: JSON.stringify(embedding),
    p_user_role: userRole,
    p_limit: 5,
  })

  if (error) throw error
  return (data ?? []) as PolicyDocument[]
}

// ── Answer Generation ───────────────────────────────────────

async function generatePolicyAnswer(
  question: string,
  documents: PolicyDocument[]
): Promise<PolicyAnswer> {
  const context = documents
    .map(d => `[${d.category}] ${d.title}:\n${d.content}`)
    .join('\n\n')

  const prompt = `You are an HR policy assistant for a Thai company. Answer the employee's question based ONLY on the provided policy documents. If the documents don't contain enough information, say so and suggest contacting HR.

Policy Documents:
${context}

Employee Question: ${question}

Provide a clear, concise answer. Cite the source document title. If uncertain, say "I'm not sure about this — please check with HR." Keep the answer under 300 words.`

  if (!GEMINI_API_KEY) {
    return {
      answer: 'AI assistant is not configured. Please contact HR directly.',
      sources: [],
      confidence: 0,
      handoffNeeded: true,
    }
  }

  const response = await fetch(
    `${GEMINI_BASE_URL}/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
    }
  )

  if (!response.ok) {
    return {
      answer: 'I encountered an error generating the answer. Please try again or contact HR.',
      sources: [],
      confidence: 0,
      handoffNeeded: true,
    }
  }

  const data = await response.json()
  const answerText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Calculate confidence based on document relevance scores
  const avgSimilarity = documents.reduce((sum, d) => sum + d.similarity, 0) / documents.length
  const confidence = Math.min(avgSimilarity * 1.2, 1.0)

  return {
    answer: answerText,
    sources: documents.map(d => ({
      title: d.title,
      category: d.category,
      relevance: d.similarity,
    })),
    confidence,
    handoffNeeded: confidence < LOW_CONFIDENCE_THRESHOLD,
  }
}

// ── Document Ingestion ──────────────────────────────────────

/**
 * Ingest a policy document: chunk → embed → store.
 * Called by HR admins to add documents to the knowledge base.
 */
export async function ingestPolicyDocument(
  companyId: string,
  title: string,
  content: string,
  category: string,
  department?: string,
  minRole: string = 'employee'
): Promise<{ chunksCreated: number }> {
  const chunks = chunkDocument(content, 500)
  let chunksCreated = 0

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk)

    const { error } = await supabase.from('policy_documents').insert({
      company_id: companyId,
      title,
      content: chunk,
      category,
      department: department ?? null,
      min_role: minRole,
      embedding: JSON.stringify(embedding),
    })

    if (error) throw error
    chunksCreated++
  }

  return { chunksCreated }
}

/**
 * List all policy documents for a company.
 */
export async function listPolicyDocuments(
  companyId: string
): Promise<Array<{ id: string; title: string; category: string; created_at: string }>> {
  const { data, error } = await supabase
    .from('policy_documents')
    .select('id, title, category, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Delete a policy document and all its chunks.
 */
export async function deletePolicyDocument(
  companyId: string,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from('policy_documents')
    .delete()
    .eq('id', documentId)
    .eq('company_id', companyId)

  if (error) throw error
}

// ── Helpers ─────────────────────────────────────────────────

function chunkDocument(content: string, maxTokens: number): string[] {
  const paragraphs = content.split('\n\n').filter(p => p.trim())
  const chunks: string[] = []
  let currentChunk = ''

  for (const para of paragraphs) {
    // Rough token estimate: ~4 chars per token
    if (currentChunk.length + para.length > maxTokens * 4) {
      if (currentChunk) chunks.push(currentChunk)
      currentChunk = para
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para
    }
  }

  if (currentChunk) chunks.push(currentChunk)
  return chunks.length > 0 ? chunks : [content]
}
