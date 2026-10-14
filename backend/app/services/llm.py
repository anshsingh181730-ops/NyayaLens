"""
Centralized LLM service wrapper supporting Gemini, Groq, and Anthropic.
Ensures uniform structured JSON responses, Pydantic model validation, and automated retries.
Automatically selects the best configured provider (Gemini -> Groq -> Anthropic).
"""

import os
import json
import re
import logging
import urllib.request
import urllib.error
from typing import Type, TypeVar, Optional, Dict, Any, List
from pydantic import BaseModel
from app.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

class LLMService:
    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY
        self.groq_key = settings.GROQ_API_KEY
        self.anthropic_key = settings.ANTHROPIC_API_KEY
        self.provider = getattr(settings, "LLM_PROVIDER", "gemini").lower()
        self.model = settings.LLM_MODEL
        self.client = None

        # Determine active provider based on availability
        if self.gemini_key and (self.provider == "gemini" or not self.client):
            self.provider = "gemini"
            if not self.model or "claude" in self.model:
                self.model = "gemini-2.5-flash"
            logger.info(f"LLMService initialized with Gemini ({self.model}).")
        elif self.groq_key and (self.provider == "groq" or not self.client):
            self.provider = "groq"
            if not self.model or "claude" in self.model:
                self.model = "openai/gpt-oss-120b"
            logger.info(f"LLMService initialized with Groq ({self.model}).")
        elif self.anthropic_key and self.anthropic_key != "your_anthropic_api_key_here":
            self.provider = "anthropic"
            try:
                import anthropic
                self.client = anthropic.Anthropic(api_key=self.anthropic_key)
                logger.info(f"LLMService initialized with Anthropic ({self.model}).")
            except Exception as e:
                logger.warning(f"Could not initialize Anthropic client: {e}")
        else:
            self.provider = "mock"
            logger.warning("No valid API key provided. Using deterministic mock fallback handler.")

    def _extract_json_block(self, text: str) -> str:
        """Extract JSON code block from markdown or raw text."""
        text = text.strip()
        # Look for ```json ... ```
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if json_match:
            return json_match.group(1).strip()
        # If text starts with [ or {, look for the outermost brackets
        bracket_match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
        if bracket_match:
            return bracket_match.group(1).strip()
        return text

    def _invoke_gemini(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str,
        temperature: float = 0.0,
        max_tokens: int = 4096,
        json_mode: bool = False,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Calls Google Gemini REST API."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.gemini_key}"
        
        contents = []
        if conversation_history:
            for turn in conversation_history[-6:]:
                role = "user" if turn.get("role") == "user" else "model"
                contents.append({"role": role, "parts": [{"text": turn.get("content", "")}]})
        contents.append({"role": "user", "parts": [{"text": user_prompt}]})

        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens
            }
        }
        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}
        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        
        with urllib.request.urlopen(req, timeout=60) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            candidates = res.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
            return ""

    def _invoke_groq(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str,
        temperature: float = 0.0,
        max_tokens: int = 4096,
        json_mode: bool = False,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Calls Groq OpenAI-compatible Chat Completions API."""
        url = "https://api.groq.com/openai/v1/chat/completions"
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        if conversation_history:
            for turn in conversation_history[-6:]:
                role = "user" if turn.get("role") == "user" else "assistant"
                messages.append({"role": role, "content": turn.get("content", "")})
        messages.append({"role": "user", "content": user_prompt})

        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={
            "Authorization": f"Bearer {self.groq_key}",
            "Content-Type": "application/json",
            "User-Agent": "NyayaLens/1.0"
        })
        with urllib.request.urlopen(req, timeout=60) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            return res.get("choices", [{}])[0].get("message", {}).get("content", "")

    def _invoke_anthropic(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str,
        temperature: float = 0.0,
        max_tokens: int = 4096,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Calls Anthropic Claude Messages API."""
        if not self.client:
            raise RuntimeError("Anthropic client is not initialized.")
        messages = []
        if conversation_history:
            for turn in conversation_history[-6:]:
                role = "user" if turn.get("role") == "user" else "assistant"
                messages.append({"role": role, "content": turn.get("content", "")})
        messages.append({"role": "user", "content": user_prompt})

        response = self.client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=messages
        )
        return response.content[0].text

    def _invoke_raw(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 4096,
        json_mode: bool = False,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Dispatches to the active LLM provider."""
        chosen_model = model or self.model
        if self.provider == "gemini":
            gemini_model = chosen_model if ("gemini" in chosen_model) else "gemini-2.5-flash"
            try:
                return self._invoke_gemini(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    model=gemini_model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    json_mode=json_mode,
                    conversation_history=conversation_history
                )
            except Exception as e:
                if self.groq_key:
                    logger.warning(f"Gemini call error ({e}). Automatically failing over to Groq...")
                    return self._invoke_groq(
                        system_prompt=system_prompt,
                        user_prompt=user_prompt,
                        model="openai/gpt-oss-120b",
                        temperature=temperature,
                        max_tokens=max_tokens,
                        json_mode=json_mode,
                        conversation_history=conversation_history
                    )
                raise e
        elif self.provider == "groq":
            groq_model = chosen_model if ("openai" in chosen_model or "qwen" in chosen_model) else "openai/gpt-oss-120b"
            try:
                return self._invoke_groq(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    model=groq_model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    json_mode=json_mode,
                    conversation_history=conversation_history
                )
            except Exception as e:
                if self.gemini_key:
                    logger.warning(f"Groq call error ({e}). Automatically failing over to Gemini...")
                    return self._invoke_gemini(
                        system_prompt=system_prompt,
                        user_prompt=user_prompt,
                        model="gemini-2.5-flash",
                        temperature=temperature,
                        max_tokens=max_tokens,
                        json_mode=json_mode,
                        conversation_history=conversation_history
                    )
                raise e
        elif self.provider == "anthropic":
            return self._invoke_anthropic(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=chosen_model,
                temperature=temperature,
                max_tokens=max_tokens,
                conversation_history=conversation_history
            )
        else:
            raise RuntimeError("No LLM provider configured.")

    def call_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
        temperature: float = 0.0,
        max_tokens: int = 4096,
        model: Optional[str] = None
    ) -> T:
        """
        Executes an LLM call requesting strictly JSON formatted output,
        parses and validates against the provided Pydantic model.
        Automatically retries once on parse/validation failure.
        """
        if self.provider == "mock":
            logger.warning("No API key configured. Using deterministic mock fallback handler.")
            return self._mock_fallback(system_prompt, user_prompt, response_model)

        sys = system_prompt + "\n\nCRITICAL: Respond ONLY with a valid JSON object matching the requested schema. Do not enclose with conversational text."
        raw_output = ""
        try:
            # First attempt
            raw_output = self._invoke_raw(
                system_prompt=sys,
                user_prompt=user_prompt,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=True
            )
            clean_json = self._extract_json_block(raw_output)
            parsed_dict = json.loads(clean_json)
            return response_model.model_validate(parsed_dict)
        except Exception as first_error:
            logger.warning(f"First JSON validation attempt failed: {first_error}. Retrying once with error correction prompt...")
            retry_prompt = (
                f"{user_prompt}\n\n"
                f"Your previous response produced an invalid JSON output or schema mismatch.\n"
                f"Error details: {str(first_error)}\n"
                f"Previous output snippet: {raw_output[:500]}...\n"
                f"Please correct the JSON syntax and schema adherence and output ONLY valid JSON."
            )
            try:
                second_output = self._invoke_raw(
                    system_prompt=sys,
                    user_prompt=retry_prompt,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    json_mode=True
                )
                clean_json_retry = self._extract_json_block(second_output)
                parsed_dict_retry = json.loads(clean_json_retry)
                return response_model.model_validate(parsed_dict_retry)
            except Exception as second_error:
                logger.error(f"Second attempt failed: {second_error}. Falling back to safe defaults.")
                return self._mock_fallback(system_prompt, user_prompt, response_model)

    def call_text(
        self,
        system_prompt: str,
        user_prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048
    ) -> str:
        """Executes a plain text LLM call, supporting multi-turn conversation history."""
        if self.provider == "mock":
            return "No LLM API key configured. Please supply GEMINI_API_KEY, GROQ_API_KEY, or ANTHROPIC_API_KEY in your .env file."

        try:
            raw = self._invoke_raw(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=False,
                conversation_history=conversation_history
            )
            return raw.replace("**", "").replace("__", "").strip()
        except Exception as e:
            logger.error(f"LLM API call error ({self.provider}): {e}")
            return f"Error communicating with AI service: {str(e)}"

    def extract_text_from_image(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
        """Extracts text verbatim from document image using Gemini Vision."""
        if not self.gemini_key:
            return ""
        try:
            import base64
            b64_img = base64.b64encode(image_bytes).decode("utf-8")
            actual_mime = mime_type if (mime_type and mime_type.startswith("image/")) else "image/jpeg"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.gemini_key}"
            payload = {
                "contents": [{
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": actual_mime,
                                "data": b64_img
                            }
                        },
                        {
                            "text": (
                                "You are an expert Indian judicial document transcriber. Transcribe all text, numbers, "
                                "headings, case titles, dates, operative orders, and stamps from this judicial document / FIR / legal notice photo verbatim. "
                                "Preserve distinct paragraphs and numbered points accurately. Output only the transcribed text without conversational introductory or concluding remarks."
                            )
                        }
                    ]
                }],
                "generationConfig": {
                    "temperature": 0.0,
                    "maxOutputTokens": 4096
                }
            }
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                candidates = res.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
        except Exception as e:
            logger.warning(f"Gemini vision transcription error: {e}")
        return ""

    def _mock_fallback(self, system_prompt: str, user_prompt: str, response_model: Type[T]) -> T:
        """
        Sensible fallback for environments running before API keys are loaded.
        Returns a valid, empty or minimally populated Pydantic model instance.
        """
        try:
            return response_model.model_validate({})
        except Exception:
            dummy_data: Dict[str, Any] = {}
            for field_name, field_info in response_model.model_fields.items():
                if field_info.is_required():
                    annotation = field_info.annotation
                    if annotation == str:
                        dummy_data[field_name] = "Information pending verification"
                    elif annotation == int:
                        dummy_data[field_name] = 0
                    elif annotation == float:
                        dummy_data[field_name] = 0.0
                    elif annotation == bool:
                        dummy_data[field_name] = False
                    elif hasattr(annotation, "__origin__") and annotation.__origin__ == list:
                        dummy_data[field_name] = []
                    elif hasattr(annotation, "__origin__") and annotation.__origin__ == dict:
                        dummy_data[field_name] = {}
                    else:
                        dummy_data[field_name] = None
            try:
                return response_model.model_validate(dummy_data)
            except Exception as e:
                logger.error(f"Failed to generate mock model: {e}")
                raise e

llm_service = LLMService()
