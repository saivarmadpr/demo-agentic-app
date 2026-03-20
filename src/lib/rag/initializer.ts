import { addDocument, getDocumentCount } from "./vector-store";
import { RAG_DOCUMENT_SEEDS } from "@/data/rag-documents";

let initialized = false;
let initializing = false;

export async function initializeRAG(): Promise<void> {
  if (initialized || initializing) return;
  if (getDocumentCount() > 0) {
    initialized = true;
    return;
  }

  initializing = true;
  console.log(
    `[RAG] Initializing knowledge base with ${RAG_DOCUMENT_SEEDS.length} documents...`
  );

  try {
    for (const seed of RAG_DOCUMENT_SEEDS) {
      await addDocument(seed.content, seed.metadata);
    }
    initialized = true;
    console.log(
      `[RAG] Knowledge base initialized with ${getDocumentCount()} documents.`
    );
  } catch (err) {
    console.error("[RAG] Failed to initialize knowledge base:", err);
    initializing = false;
    throw err;
  }
}

export function isRAGInitialized(): boolean {
  return initialized;
}
