"""
ChromaDB Persistent Vector Store and Multilingual Retrieval Service.
Uses sentence-transformers multilingual model ('paraphrase-multilingual-MiniLM-L12-v2')
to embed legal provisions in English, Hindi, and Marathi.
Retrieves top-k statutory chunks with exact metadata filtering.
"""

import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils import embedding_functions
from app.config import settings

logger = logging.getLogger(__name__)

class RetrievalService:
    COLLECTION_NAME = "indian_laws_verified"

    def __init__(self):
        self.persist_directory = str(settings.CHROMA_PERSIST_DIRECTORY)
        self.client = None
        self.collection = None
        self.embedding_fn = None
        self._init_client()

    def _init_client(self):
        try:
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=ChromaSettings(anonymized_telemetry=False)
            )

            # Multilingual embedding model
            try:
                self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
                    model_name=settings.EMBEDDING_MODEL_NAME
                )
            except Exception as emb_err:
                logger.warning(f"Could not load SentenceTransformer embedding function: {emb_err}. Using default embedding function.")
                self.embedding_fn = embedding_functions.DefaultEmbeddingFunction()

            self.collection = self.client.get_or_create_collection(
                name=self.COLLECTION_NAME,
                embedding_function=self.embedding_fn,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info("ChromaDB vector store successfully initialized.")
        except Exception as e:
            logger.error(f"Error initializing ChromaDB: {e}")

    def add_legal_units(self, units: List[Dict[str, Any]]) -> int:
        """
        Inserts statutory units into ChromaDB.
        Each unit must contain:
          - id: str
          - text: str
          - metadata: dict {doc_name, unit_type, unit_number, title, chapter, part, status}
        """
        if not self.collection or not units:
            return 0

        ids = []
        documents = []
        metadatas = []

        for u in units:
            ids.append(str(u["id"]))
            documents.append(u["text"])
            meta = {
                "doc_name": str(u.get("doc_name", "")),
                "unit_type": str(u.get("unit_type", "")),
                "unit_number": str(u.get("unit_number", "")),
                "title": str(u.get("title", "")),
                "chapter": str(u.get("chapter", "") or ""),
                "part": str(u.get("part", "") or ""),
                "status": str(u.get("status", "In Force"))
            }
            metadatas.append(meta)

        try:
            self.collection.upsert(
                ids=ids,
                documents=documents,
                metadatas=metadatas
            )
            return len(ids)
        except Exception as e:
            logger.error(f"Error upserting into ChromaDB: {e}")
            return 0

    def search_laws(
        self,
        query: str,
        n_results: int = 6,
        doc_filter: Optional[str] = None,
        unit_number_filter: Optional[str] = None,
        score_threshold: float = 0.70
    ) -> List[Dict[str, Any]]:
        """
        Executes semantic vector search over verified laws.
        Applies metadata filtering when specific document or unit number is targeted.
        Cosine distance threshold ensures strict relevance filtering.
        """
        if not self.collection:
            return []

        where_clause: Optional[Dict[str, Any]] = None
        conditions = []
        if doc_filter:
            conditions.append({"doc_name": doc_filter})
        if unit_number_filter:
            conditions.append({"unit_number": unit_number_filter})

        if len(conditions) == 1:
            where_clause = conditions[0]
        elif len(conditions) > 1:
            where_clause = {"$and": conditions}

        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where_clause
            )

            hits = []
            if results and results.get("documents") and results["documents"][0]:
                docs = results["documents"][0]
                metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
                distances = results["distances"][0] if results.get("distances") else [0.0] * len(docs)

                for doc_text, meta, dist in zip(docs, metas, distances):
                    # Cosine distance to similarity score
                    similarity = 1.0 - dist if dist is not None else 0.8
                    if similarity >= (1.0 - score_threshold): # keep relevant
                        hits.append({
                            "text": doc_text,
                            "metadata": meta,
                            "score": round(similarity, 3)
                        })

            return hits
        except Exception as e:
            logger.error(f"Error querying ChromaDB: {e}")
            return []

    def get_unit_by_number(self, doc_name: str, unit_number: str) -> Optional[Dict[str, Any]]:
        """Direct deterministic lookup of specific statutory unit without vector search."""
        if not self.collection:
            return None
        try:
            res = self.collection.get(
                where={"$and": [{"doc_name": doc_name}, {"unit_number": unit_number}]}
            )
            if res and res.get("documents") and len(res["documents"]) > 0:
                return {
                    "text": res["documents"][0],
                    "metadata": res["metadatas"][0]
                }
        except Exception as e:
            logger.warning(f"Error in direct unit lookup: {e}")
        return None

retrieval_service = RetrievalService()
