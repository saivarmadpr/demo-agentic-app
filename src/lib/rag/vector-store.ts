import OpenAI from "openai";

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    title: string;
    category: string;
    accessLevel: "public" | "internal" | "confidential" | "restricted";
    [key: string]: unknown;
  };
}

const documents: VectorDocument[] = [];
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) openai = new OpenAI();
  return openai;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function addDocument(
  content: string,
  metadata: VectorDocument["metadata"]
): Promise<VectorDocument> {
  const embedding = await getEmbedding(content);
  const doc: VectorDocument = {
    id: crypto.randomUUID(),
    content,
    embedding,
    metadata,
  };
  documents.push(doc);
  return doc;
}

export function addDocumentWithEmbedding(
  content: string,
  embedding: number[],
  metadata: VectorDocument["metadata"]
): VectorDocument {
  const doc: VectorDocument = {
    id: crypto.randomUUID(),
    content,
    embedding,
    metadata,
  };
  documents.push(doc);
  return doc;
}

const ACCESS_LEVEL_ORDER = [
  "public",
  "internal",
  "confidential",
  "restricted",
];

export async function searchDocuments(
  query: string,
  topK: number = 5,
  accessLevel?: string
): Promise<Array<VectorDocument & { score: number }>> {
  if (documents.length === 0) return [];

  const queryEmbedding = await getEmbedding(query);

  let candidates = documents;
  if (accessLevel) {
    const maxLevel = ACCESS_LEVEL_ORDER.indexOf(accessLevel);
    if (maxLevel >= 0) {
      candidates = documents.filter((d) => {
        const docLevel = ACCESS_LEVEL_ORDER.indexOf(
          d.metadata.accessLevel
        );
        return docLevel <= maxLevel;
      });
    }
  }

  const scored = candidates.map((doc) => ({
    ...doc,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function getDocumentCount(): number {
  return documents.length;
}

export function getAllDocuments(): VectorDocument[] {
  return [...documents];
}
