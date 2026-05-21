import { logger } from "../lib/logger";
import { searchKnowledge, type KnowledgeChunk } from "./coachKnowledgeBase";
import { MASTER_MANUALS } from "./masterManuals";

export interface DocumentSection {
  manualId: string;
  manualTitle: string;
  sectionId: string;
  sectionTitle: string;
  content: string;
  keywords: string[];
  category: string;
}

export interface SearchResult {
  type: "knowledge" | "manual";
  id: string;
  title: string;
  excerpt: string;
  score: number;
  source: string;
  category: string;
}

let _documentIndex: DocumentSection[] = [];
let _indexBuilt = false;

export function buildDocumentIndex(): void {
  if (_indexBuilt) return;

  for (const manual of MASTER_MANUALS) {
    for (const section of manual.sections) {
      const keywords = extractKeywords(section.content);
      _documentIndex.push({
        manualId: manual.id,
        manualTitle: manual.title,
        sectionId: section.id,
        sectionTitle: section.title,
        content: section.content,
        keywords,
        category: manual.category,
      });
    }
  }

  _indexBuilt = true;
  logger.info({ count: _documentIndex.length }, "Document index built");
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "not", "this", "that", "it",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
    .reduce<string[]>((acc, word) => {
      if (!acc.includes(word)) acc.push(word);
      return acc;
    }, [])
    .slice(0, 30);
}

function scoreDocument(doc: DocumentSection, terms: string[]): number {
  let score = 0;
  const text = `${doc.sectionTitle} ${doc.content}`.toLowerCase();

  for (const term of terms) {
    if (doc.keywords.some(k => k.includes(term))) score += 3;
    if (doc.sectionTitle.toLowerCase().includes(term)) score += 2;
    if (doc.manualTitle.toLowerCase().includes(term)) score += 1;
    const count = (text.match(new RegExp(term, "g")) ?? []).length;
    score += Math.min(count, 5);
  }

  return score;
}

export function searchDocuments(query: string, limit = 8): SearchResult[] {
  if (!_indexBuilt) buildDocumentIndex();

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 2);

  const knowledgeResults: SearchResult[] = searchKnowledge(query, undefined, 4).map(chunk => ({
    type: "knowledge" as const,
    id: chunk.id,
    title: chunk.title,
    excerpt: chunk.content.substring(0, 200) + "...",
    score: 10,
    source: `Knowledge Base — ${formatDomain(chunk.domain)}`,
    category: chunk.domain,
  }));

  const manualResults: SearchResult[] = _documentIndex
    .map(doc => ({
      doc,
      score: scoreDocument(doc, terms),
    }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit - knowledgeResults.length)
    .map(({ doc, score }) => ({
      type: "manual" as const,
      id: `${doc.manualId}/${doc.sectionId}`,
      title: `${doc.sectionTitle}`,
      excerpt: doc.content.substring(0, 200) + "...",
      score,
      source: doc.manualTitle,
      category: doc.category,
    }));

  return [...knowledgeResults, ...manualResults]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getDocumentSection(manualId: string, sectionId: string): DocumentSection | undefined {
  if (!_indexBuilt) buildDocumentIndex();
  return _documentIndex.find(d => d.manualId === manualId && d.sectionId === sectionId);
}

function formatDomain(domain: string): string {
  return domain
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function getIndexStats(): { totalDocuments: number; manualCount: number; domainCount: number } {
  if (!_indexBuilt) buildDocumentIndex();
  const manuals = new Set(_documentIndex.map(d => d.manualId));
  const categories = new Set(_documentIndex.map(d => d.category));
  return {
    totalDocuments: _documentIndex.length,
    manualCount: manuals.size,
    domainCount: categories.size,
  };
}
