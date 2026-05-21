import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";
import { searchKnowledge, type KnowledgeChunk } from "./coachKnowledgeBase";
import { buildSystemPrompt, getRoleProfile } from "./coachRoleProfiles";
import { searchDocuments, type SearchResult } from "./documentIndexService";

export interface CoachQuery {
  question: string;
  role?: string;
  context?: string;
  venueId?: string;
}

export interface CoachResponse {
  answer: string;
  confidence: number;
  sources: { title: string; domain: string }[];
  role: string;
  lowConfidenceWarning: boolean;
  provider: "openai" | "fallback";
  suggestedFollowUps: string[];
}

const FALLBACK_RESPONSES: Record<string, string> = {
  default: `I don't have a confident answer for that right now. Please consult your venue manager or the relevant section in the Knowledge Center for authoritative guidance.`,
  humidor: `For humidor management: target 68–70% RH and 65–68°F. Check Boveda packs weekly. Inspect for mold daily. Rotate stock FIFO. See the SmokeCraft 360 Experience Manual → Humidor Management SOPs for full procedures.`,
  relight: `To relight a cigar: gently blow through first to clear stale smoke. Toast the foot with a butane torch from 1 inch away rotating slowly for 5–10 seconds, then draw while continuing to rotate. Never use a petroleum lighter.`,
  vip: `VIP handling: use the guest's name within 30 seconds, anticipate preferences, create privacy, maintain the 3-minute engagement rule. See Guest Psychology in the Knowledge Center for the full VIP protocol.`,
  complaint: `For complaint recovery, use the L.A.S.T. model: Listen, Acknowledge, Solve, Thank. Authority: servers may comp up to $35, managers up to $150. See Conflict Recovery in the Knowledge Center.`,
};

function getFallbackResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("humidor") || q.includes("humidity")) return FALLBACK_RESPONSES.humidor;
  if (q.includes("relight") || q.includes("light") || q.includes("torch")) return FALLBACK_RESPONSES.relight;
  if (q.includes("vip") || q.includes("high-value") || q.includes("special guest")) return FALLBACK_RESPONSES.vip;
  if (q.includes("complaint") || q.includes("upset") || q.includes("unhappy")) return FALLBACK_RESPONSES.complaint;
  return FALLBACK_RESPONSES.default;
}

function buildGroundingContext(
  knowledgeChunks: KnowledgeChunk[],
  documentResults: SearchResult[]
): string {
  const parts: string[] = [];

  if (knowledgeChunks.length > 0) {
    parts.push("=== RELEVANT KNOWLEDGE BASE CONTENT ===");
    for (const chunk of knowledgeChunks.slice(0, 4)) {
      parts.push(`[${chunk.title} — ${chunk.domain}]\n${chunk.content}`);
    }
  }

  if (documentResults.length > 0) {
    parts.push("\n=== RELEVANT MANUAL SECTIONS ===");
    for (const doc of documentResults.slice(0, 3)) {
      parts.push(`[${doc.title} — from ${doc.source}]\n${doc.excerpt}`);
    }
  }

  return parts.join("\n\n");
}

function generateFollowUps(question: string, role: string): string[] {
  const q = question.toLowerCase();
  const suggestions: string[] = [];

  if (q.includes("cigar") || q.includes("smoke")) {
    suggestions.push("How do I pair this with a spirit?");
    suggestions.push("What are the cutting techniques for this vitola?");
  }
  if (q.includes("pairing") || q.includes("spirit") || q.includes("bourbon")) {
    suggestions.push("What is the price anchoring strategy for premium spirits?");
    suggestions.push("How do I time the second-round suggestion?");
  }
  if (q.includes("guest") || q.includes("vip") || q.includes("complaint")) {
    suggestions.push("What is my comp authority as a " + role + "?");
    suggestions.push("How do I document this interaction?");
  }
  if (q.includes("humidor") || q.includes("inventory")) {
    suggestions.push("What is the emergency humidity recovery procedure?");
    suggestions.push("How do I run the weekly inventory audit?");
  }

  if (suggestions.length === 0) {
    suggestions.push("Show me the pre-shift preparation checklist.");
    suggestions.push("What are the top upsell strategies for tonight?");
  }

  return suggestions.slice(0, 3);
}

export async function getCoachResponse(query: CoachQuery): Promise<CoachResponse> {
  const role = query.role ?? "server";
  const profile = getRoleProfile(role);

  const knowledgeChunks = searchKnowledge(query.question, role, 4);
  const documentResults = searchDocuments(query.question, 5);
  const groundingContext = buildGroundingContext(knowledgeChunks, documentResults);

  const hasGrounding = knowledgeChunks.length > 0 || documentResults.length > 0;
  const systemPrompt = buildSystemPrompt(role, hasGrounding ? undefined : "Note: Limited internal knowledge found. Be honest about knowledge limits.");

  const userMessage = hasGrounding
    ? `Using only the provided knowledge base content and manual sections, answer this question from a ${profile.label}:\n\nQuestion: ${query.question}${query.context ? `\n\nAdditional context: ${query.context}` : ""}\n\n${groundingContext}\n\nProvide a concise, actionable answer. Cite the source section when referencing specific guidance. Include a confidence score (0.0–1.0) at the end in this exact format: [CONFIDENCE: 0.XX]`
    : `Answer this question from a ${profile.label}:\n\nQuestion: ${query.question}${query.context ? `\n\nAdditional context: ${query.context}` : ""}\n\nNote: No specific internal knowledge was found. Provide general luxury hospitality guidance based on your training. Include a confidence score at the end: [CONFIDENCE: 0.XX]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    const confidenceMatch = raw.match(/\[CONFIDENCE:\s*([\d.]+)\]/i);
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : (hasGrounding ? 0.75 : 0.45);
    const answer = raw.replace(/\[CONFIDENCE:\s*[\d.]+\]/i, "").trim();

    const lowConfidenceWarning = confidence < 0.6;

    if (confidence < 0.35) {
      return {
        answer: getFallbackResponse(query.question),
        confidence: 0.3,
        sources: [],
        role,
        lowConfidenceWarning: true,
        provider: "fallback",
        suggestedFollowUps: generateFollowUps(query.question, role),
      };
    }

    const sources = [
      ...knowledgeChunks.slice(0, 3).map(c => ({ title: c.title, domain: c.domain })),
      ...documentResults.slice(0, 2).map(d => ({ title: d.title, domain: d.source })),
    ];

    logger.info({ role, confidence, hasGrounding, provider: "openai" }, "Coach AI response generated");

    return {
      answer,
      confidence,
      sources,
      role,
      lowConfidenceWarning,
      provider: "openai",
      suggestedFollowUps: generateFollowUps(query.question, role),
    };
  } catch (err) {
    logger.warn({ err, role }, "OpenAI Coach AI failed — using local fallback");

    const fallbackAnswer = getFallbackResponse(query.question);
    const fallbackSources = knowledgeChunks.slice(0, 2).map(c => ({ title: c.title, domain: c.domain }));

    return {
      answer: fallbackAnswer,
      confidence: 0.4,
      sources: fallbackSources,
      role,
      lowConfidenceWarning: true,
      provider: "fallback",
      suggestedFollowUps: generateFollowUps(query.question, role),
    };
  }
}

export async function getDocumentSearchResponse(
  query: string,
  role?: string
): Promise<{ results: SearchResult[]; aiSummary: string }> {
  const results = searchDocuments(query, 6);

  if (results.length === 0) {
    return { results: [], aiSummary: "No matching documents found. Try different search terms." };
  }

  const contextSnippets = results
    .slice(0, 4)
    .map(r => `[${r.title} — ${r.source}]: ${r.excerpt}`)
    .join("\n\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      max_completion_tokens: 200,
      messages: [
        {
          role: "system",
          content: `You are a document search assistant for a luxury hospitality platform. Provide a 2–3 sentence summary of the most relevant search results. Be specific and cite the source documents.`,
        },
        {
          role: "user",
          content: `Search query: "${query}"\n\nTop results:\n${contextSnippets}\n\nProvide a brief summary of the most relevant findings.`,
        },
      ],
    });

    const aiSummary = completion.choices[0]?.message?.content ?? "Search completed. See results below.";
    return { results, aiSummary };
  } catch {
    return { results, aiSummary: `Found ${results.length} results. See sections below for details.` };
  }
}
