"""
AI Chat Service for the school management system.

This module provides comprehensive AI chatbot functionality including:
- Conversation management and context handling
- Natural language processing capabilities
- Intent recognition for user queries
- Context-aware responses based on application data
- Response caching for common queries
- Integration with student and driver data

Key Features:
- Multi-turn conversation support
- Response personalization based on user role
- Intelligent caching system
- Context management for personalized responses
- Integration with existing school data
"""

import logging
import uuid
import time
import json
import re
from typing import List, Optional, Dict, Any, Tuple
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, func
import hashlib
import requests

# Import chat models
from ..core.models.chat_models import (
    DBChatConversation, DBChatMessage, DBChatContext, DBChatSession,
    ChatConversation, ChatMessage, ChatContext, ChatSession,
    MessageType, ConversationStatus, ConversationPriority,
    CreateConversationRequest, SendMessageRequest, UpdateConversationRequest,
    ConversationResponse, MessageResponse, ChatHistoryResponse
)

# Import existing models for context
from ..core.models.models import DBStudent, DBDriver, DBUser, UserRole

# Import configuration
from ..core.config import config

logger = logging.getLogger(__name__)


class OllamaClient:
    """Wrapper class to provide Gemini-like interface for Ollama."""

    def __init__(self, base_url: str, model: str):
        self.base_url = base_url.rstrip('/')
        self.model = model
        self.models = self.Models(self)

    class Models:
        def __init__(self, client):
            self.client = client

        def generate_content(self, model: str, contents: str):
            """Generate content using Ollama API."""
            try:
                url = f"{self.client.base_url}/api/generate"
                payload = {
                    "model": model,
                    "prompt": contents,
                    "stream": False
                }

                response = requests.post(url, json=payload, timeout=30)
                response.raise_for_status()

                result = response.json()
                return OllamaResponse(result.get("response", ""))

            except requests.RequestException as e:
                logger.error(f"Ollama API request failed: {e}")
                raise HTTPException(status_code=503, detail=f"Ollama service unavailable: {str(e)}")


class OllamaResponse:
    """Wrapper to provide Gemini-like response interface."""

    def __init__(self, text: str):
        self._text = text

    @property
    def text(self) -> str:
        return self._text.strip()


class AIChatService:
    """Service class for managing AI chat functionality.

    Provides comprehensive chatbot capabilities including conversation management,
    AI processing, context handling, and integration with school data systems.
    """

    # Response cache for common queries
    _response_cache: Dict[str, Dict[str, Any]] = {}
    _cache_ttl: int = 3600  # 1 hour cache TTL

    # Ollama client configuration cache
    _ollama_config: Optional[Dict[str, str]] = None

    # Intent patterns for query classification
    INTENT_PATTERNS = {
        "student_info": [
            r"(?:show|tell|find|get)\s+(?:me\s+)?(?:student|child|kid)\s+(?:info|information|details)",
            r"(?:who\s+is|find|locate|search\s+for)\s+(?:student|child|kid)\s+(?:named\s+)?(.+)",
            r"(?:student|child|kid)\s+(?:enrolled|registered|in\s+class|in\s+grade)\s+(.+)",
        ],
        "driver_info": [
            r"(?:show|tell|find|get)\s+(?:me\s+)?(?:driver|bus\s+driver)\s+(?:info|information|details)",
            r"(?:who\s+is|find|locate)\s+(?:driver|bus\s+driver)\s+(?:for\s+)?(.+)",
            r"(?:driver|bus\s+driver)\s+(?:assigned\s+to|handling|driving)\s+(.+)",
        ],
        "route_info": [
            r"(?:show|tell|find|get)\s+(?:me\s+)?(?:route|bus\s+route)\s+(?:info|information|details)",
            r"(?:which\s+route|what\s+route)\s+(?:goes\s+to|serves|covers)",
            r"(?:route|bus\s+route)\s+(?:number\s+)?(.+)",
        ],
        "fee_info": [
            r"(?:fee|fees|payment|cost|charge)\s+(?:info|information|details)",
            r"(?:how\s+much|what\s+is\s+the\s+cost)\s+(?:for\s+)?(.+)",
            r"(?:payment|fee|charge)\s+(?:due|pending|outstanding)",
        ],
        "contact_info": [
            r"(?:contact|phone|mobile|number)\s+(?:info|information|details)",
            r"(?:how\s+(?:can|to)\s+(?:reach|contact|call|get\s+in\s+touch))",
        ],
        "help": [
            r"(?:help|assist|support|what\s+can\s+you\s+do)",
            r"(?:how\s+(?:can|to)\s+you\s+help)",
            r"(?:available\s+commands|features|functions)",
        ]
    }

    @staticmethod
    def _get_gemini_client() -> OllamaClient:
        """Get cached Ollama client instance for AI chat functionality.

        Returns:
            OllamaClient: Cached client instance configured for Ollama API

        Raises:
            HTTPException: If Ollama configuration is missing or invalid
        """
        try:
            if AIChatService._ollama_config is None:
                # Cache the configuration
                from ..core.config.config import Config
                AIChatService._ollama_config = {
                    "base_url": Config.OLLAMA_BASE_URL,
                    "model": Config.OLLAMA_MODEL
                }

            # Return cached client if available
            if hasattr(AIChatService, '_cached_client') and AIChatService._cached_client:
                return AIChatService._cached_client

            # Validate configuration
            if not AIChatService._ollama_config["base_url"]:
                raise ValueError("OLLAMA_BASE_URL is not configured")

            if not AIChatService._ollama_config["model"]:
                raise ValueError("OLLAMA_MODEL is not configured")

            # Create and cache the client
            AIChatService._cached_client = OllamaClient(
                base_url=AIChatService._ollama_config["base_url"],
                model=AIChatService._ollama_config["model"]
            )

            logger.info(f"Initialized Ollama client with model: {AIChatService._ollama_config['model']}")
            return AIChatService._cached_client

        except Exception as e:
            logger.error(f"Failed to initialize Ollama client: {e}")
            raise HTTPException(status_code=500, detail=f"AI service initialization failed: {str(e)}")

    @staticmethod
    async def create_conversation(
        db: AsyncSession,
        user_id: Optional[int] = None,
        request: Optional[CreateConversationRequest] = None
    ) -> ChatConversation:
        """Create a new chat conversation."""
        try:
            conversation_id = str(uuid.uuid4())

            # Create conversation record
            db_conversation = DBChatConversation(
                id=conversation_id,
                user_id=user_id,
                title=request.title if request else None,
                priority=request.priority.value if request else ConversationPriority.NORMAL.value,
                context_data=request.initial_context if request else None,
                created_at=int(time.time()),
                updated_at=int(time.time())
            )

            db.add(db_conversation)

            # Create initial context if provided
            if request and request.initial_context:
                context_id = str(uuid.uuid4())
                db_context = DBChatContext(
                    id=context_id,
                    conversation_id=conversation_id,
                    context_type="initial_context",
                    context_data=request.initial_context,
                    is_active=True,
                    created_at=int(time.time()),
                    updated_at=int(time.time())
                )
                db.add(db_context)

            await db.commit()
            await db.refresh(db_conversation)

            return ChatConversation(
                id=db_conversation.id,
                user_id=db_conversation.user_id,
                title=db_conversation.title,
                status=ConversationStatus(db_conversation.status),
                priority=ConversationPriority(db_conversation.priority),
                context_data=db_conversation.context_data,
                message_count=db_conversation.message_count,
                created_at=db_conversation.created_at,
                updated_at=db_conversation.updated_at
            )
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating conversation: {e}")
            raise HTTPException(status_code=500, detail=f"Error creating conversation: {str(e)}")

    @staticmethod
    async def send_message(
        db: AsyncSession,
        conversation_id: str,
        message_request: SendMessageRequest,
        user_id: Optional[int] = None
    ) -> Tuple[ChatMessage, str]:
        """Send a message and get AI response."""
        try:
            # Get conversation
            conversation_result = await db.execute(
                select(DBChatConversation).where(DBChatConversation.id == conversation_id)
            )
            db_conversation = conversation_result.scalar_one_or_none()
            if not db_conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")

            # Create user message
            message_id = str(uuid.uuid4())
            current_time = int(time.time())

            db_message = DBChatMessage(
                id=message_id,
                conversation_id=conversation_id,
                message_type=message_request.message_type.value,
                content=message_request.content,
                metadata=message_request.metadata or {},
                created_at=current_time,
                updated_at=current_time
            )
            db.add(db_message)

            # Update conversation message count and last message time
            db_conversation.message_count += 1
            db_conversation.last_message_at = current_time
            db_conversation.updated_at = current_time

            await db.commit()

            # Generate AI response
            ai_response = await AIChatService._generate_ai_response(
                db, conversation_id, message_request.content, user_id
            )

            # Create AI response message
            response_message_id = str(uuid.uuid4())
            db_response = DBChatMessage(
                id=response_message_id,
                conversation_id=conversation_id,
                message_type=MessageType.ASSISTANT.value,
                content=ai_response,
                metadata={"generated_by": "ai_chat_service"},
                created_at=current_time,
                updated_at=current_time
            )
            db.add(db_response)

            # Update conversation message count again
            db_conversation.message_count += 1
            await db.commit()

            # Convert to response models
            user_message = ChatMessage(
                id=db_message.id,
                conversation_id=db_message.conversation_id,
                message_type=MessageType(db_message.message_type),
                content=db_message.content,
                metadata=db_message.metadata,
                created_at=db_message.created_at,
                updated_at=db_message.updated_at
            )

            return user_message, ai_response

        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"Error sending message: {e}")
            raise HTTPException(status_code=500, detail=f"Error sending message: {str(e)}")

    @staticmethod
    async def _call_mcp_tool(tool_name: str, args: Dict[str, Any]) -> Optional[str]:
        """Call an MCP tool via HTTP and return the result."""
        try:
            from ..core.config.config import Config
            if not Config.MCP_ENABLED:
                return None

            url = f"{Config.MCP_SERVER_URL}/tools/call"
            payload = {
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": args
                },
                "jsonrpc": "2.0",
                "id": 1
            }

            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()

            result_data = response.json()
            if "result" in result_data and "content" in result_data["result"]:
                content = result_data["result"]["content"]
                if content and len(content) > 0:
                    return content[0].get("text", "")
            return None

        except Exception as e:
            logger.warning(f"Failed to call MCP tool {tool_name}: {e}")
            return None

    @staticmethod
    def _should_use_mcp_tools(user_message: str) -> List[Tuple[str, Dict[str, Any]]]:
        """Determine if MCP tools should be used based on user message."""
        message_lower = user_message.lower()
        tools_to_call = []

        # Code search patterns
        if any(keyword in message_lower for keyword in ["search code", "find code", "code search", "grep", "regex"]):
            # Extract search query from message
            query = AIChatService._extract_search_query(user_message)
            if query:
                tools_to_call.append(("code_search", {"query": query}))

        # Documentation search patterns
        elif any(keyword in message_lower for keyword in ["search docs", "find docs", "documentation", "docs search"]):
            query = AIChatService._extract_search_query(user_message)
            if query:
                tools_to_call.append(("doc_search", {"query": query}))

        # Test running patterns
        elif any(keyword in message_lower for keyword in ["run tests", "test", "testing", "pytest"]):
            test_pattern = None
            # Try to extract test pattern
            if "test" in message_lower:
                # Look for specific test patterns
                words = user_message.split()
                for i, word in enumerate(words):
                    if word.lower() == "test" and i + 1 < len(words):
                        test_pattern = " ".join(words[i+1:])
                        break
            tools_to_call.append(("run_tests", {"testPattern": test_pattern} if test_pattern else {}))

        return tools_to_call

    @staticmethod
    def _extract_search_query(message: str) -> Optional[str]:
        """Extract search query from user message."""
        message_lower = message.lower()

        # Common patterns for search queries
        patterns = [
            r"(?:search|find|get)\s+(?:for\s+)?(.+)",
            r"(?:looking\s+for|need\s+to\s+find)\s+(.+)",
            r"(?:show\s+me|tell\s+me\s+about)\s+(.+)"
        ]

        for pattern in patterns:
            match = re.search(pattern, message_lower)
            if match:
                query = match.group(1).strip()
                # Clean up common words
                query = re.sub(r'\b(code|docs?|documentation|information|details?|about)\b', '', query).strip()
                if query:
                    return query

        # If no pattern matches, return the message as is (but cleaned)
        cleaned = re.sub(r'[^\w\s]', '', message).strip()
        if len(cleaned.split()) <= 10:  # Only return if reasonable length
            return cleaned

        return None

    @staticmethod
    async def _generate_ai_response(
        db: AsyncSession,
        conversation_id: str,
        user_message: str,
        user_id: Optional[int] = None
    ) -> str:
        """Generate AI response based on user message and context using Google Gemini."""
        try:
            # Try to use Gemini API
            client = AIChatService._get_gemini_client()
            if client:
                # Get conversation context
                context = await AIChatService._get_conversation_context(db, conversation_id)

                # Get user role if available
                user_role = None
                if user_id:
                    user_result = await db.execute(
                        select(DBUser).where(DBUser.id == user_id)
                    )
                    db_user = user_result.scalar_one_or_none()
                    if db_user:
                        user_role = db_user.role

                # Check if MCP tools should be used
                mcp_tool_results = ""
                if config.MCP_ENABLED:
                    tools_to_call = AIChatService._should_use_mcp_tools(user_message)
                    if tools_to_call:
                        for tool_name, args in tools_to_call:
                            result = await AIChatService._call_mcp_tool(tool_name, args)
                            if result:
                                mcp_tool_results += f"\n{tool_name.upper()} RESULTS:\n{result}\n"

                # Build prompt
                system_prompt = """You are a helpful AI assistant for a school management system. You help parents and staff with information about students, drivers, routes, fees, and school operations.

You have access to school data and should provide accurate, helpful responses. If you don't have specific information, admit it and suggest contacting the school administration.

Key capabilities:
- Student information (names, classes, routes, contact details)
- Driver information (names, routes, vehicles, contact numbers)
- Route information (bus routes, coverage areas)
- Fee information (transport fees, payment details)
- Contact information (school contact details, emergency contacts)
- General school inquiries

You also have access to project-specific tools for code search, documentation search, and testing. When appropriate, use the tool results provided to enhance your responses."""

                context_str = json.dumps(context, indent=2) if context else "No previous context"
                user_info = f"User role: {user_role}" if user_role else "User role: unknown"

                tool_context = f"\nTool Results:\n{mcp_tool_results}" if mcp_tool_results else ""

                prompt = f"{system_prompt}\n\n{user_info}\nConversation context: {context_str}{tool_context}\n\nUser message: {user_message}\n\nPlease provide a helpful response:"

                # Call Ollama API
                from ..core.config.config import Config
                response = client.models.generate_content(
                    model=Config.OLLAMA_MODEL,
                    contents=prompt
                )

                if response and response.text:
                    return response.text.strip()
                else:
                    logger.warning("Gemini API returned empty response, falling back to rule-based")

            # Fallback to rule-based system
            logger.info("Using rule-based fallback for AI response")
            intent = AIChatService._classify_intent(user_message)
            context = await AIChatService._get_conversation_context(db, conversation_id)

            user_role = None
            if user_id:
                user_result = await db.execute(
                    select(DBUser).where(DBUser.id == user_id)
                )
                db_user = user_result.scalar_one_or_none()
                if db_user:
                    user_role = db_user.role

            # Generate response based on intent and context
            if intent == "student_info":
                return await AIChatService._handle_student_info_query(db, user_message, context, user_role)
            elif intent == "driver_info":
                return await AIChatService._handle_driver_info_query(db, user_message, context, user_role)
            elif intent == "route_info":
                return await AIChatService._handle_route_info_query(db, user_message, context, user_role)
            elif intent == "fee_info":
                return await AIChatService._handle_fee_info_query(db, user_message, context, user_role)
            elif intent == "contact_info":
                return await AIChatService._handle_contact_info_query(db, user_message, context, user_role)
            elif intent == "help":
                return AIChatService._handle_help_query(user_role)
            else:
                return AIChatService._handle_general_query(user_message, context, user_role)

        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return "I'm sorry, I encountered an error while processing your request. Please try again."

    @staticmethod
    def _classify_intent(message: str) -> str:
        """Classify the intent of a user message."""
        message_lower = message.lower()

        for intent, patterns in AIChatService.INTENT_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, message_lower):
                    return intent

        return "general"

    @staticmethod
    async def _get_conversation_context(db: AsyncSession, conversation_id: str) -> Dict[str, Any]:
        """Get conversation context from database."""
        context = {}

        # Get conversation context data
        conv_result = await db.execute(
            select(DBChatConversation).where(DBChatConversation.id == conversation_id)
        )
        db_conversation = conv_result.scalar_one_or_none()
        if db_conversation and db_conversation.context_data:
            context.update(db_conversation.context_data)

        # Get recent messages for context
        messages_result = await db.execute(
            select(DBChatMessage)
            .where(DBChatMessage.conversation_id == conversation_id)
            .order_by(desc(DBChatMessage.created_at))
            .limit(10)
        )
        recent_messages = messages_result.scalars().all()

        if recent_messages:
            context["recent_messages"] = [
                {
                    "type": msg.message_type,
                    "content": msg.content,
                    "timestamp": msg.created_at
                }
                for msg in reversed(recent_messages)
            ]

        return context

    @staticmethod
    async def _handle_student_info_query(
        db: AsyncSession,
        message: str,
        context: Dict[str, Any],
        user_role: Optional[str]
    ) -> str:
        """Handle student information queries."""
        try:
            # Extract student name or identifier from message
            student_name = AIChatService._extract_entity_from_message(message, ["student", "child", "kid"])

            if student_name:
                # Search for student by name
                student_result = await db.execute(
                    select(DBStudent).where(
                        or_(
                            DBStudent.name.ilike(f"%{student_name}%"),
                            DBStudent.father_name.ilike(f"%{student_name}%")
                        )
                    ).limit(5)
                )
                students = student_result.scalars().all()

                if students:
                    if len(students) == 1:
                        student = students[0]
                        return f"Found student: {student.name} (Father: {student.father_name or 'N/A'}), Class: {student.class_ or 'N/A'}, Route: {student.route or 'N/A'}, Address: {student.address or 'N/A'}"
                    else:
                        student_list = ", ".join([s.name for s in students[:3]])
                        return f"Found multiple students matching '{student_name}': {student_list}. Please provide more specific details."
                else:
                    return f"No student found with name '{student_name}'. Please check the spelling and try again."
            else:
                # Return general student information or list
                return "Please provide a student name to get their information. For example: 'Show me student information for John'"

        except Exception as e:
            logger.error(f"Error handling student info query: {e}")
            return "Sorry, I couldn't retrieve student information at this time."

    @staticmethod
    async def _handle_driver_info_query(
        db: AsyncSession,
        message: str,
        context: Dict[str, Any],
        user_role: Optional[str]
    ) -> str:
        """Handle driver information queries."""
        try:
            driver_name = AIChatService._extract_entity_from_message(message, ["driver", "bus driver"])

            if driver_name:
                driver_result = await db.execute(
                    select(DBDriver).where(
                        or_(
                            DBDriver.name.ilike(f"%{driver_name}%"),
                            DBDriver.route.ilike(f"%{driver_name}%")
                        )
                    ).limit(3)
                )
                drivers = driver_result.scalars().all()

                if drivers:
                    if len(drivers) == 1:
                        driver = drivers[0]
                        return f"Found driver: {driver.name}, Route: {driver.route or 'N/A'}, Vehicle: {driver.vehicle_number or 'N/A'}, Contact: {driver.contact_number or 'N/A'}"
                    else:
                        driver_list = ", ".join([d.name for d in drivers[:3]])
                        return f"Found multiple drivers matching '{driver_name}': {driver_list}. Please provide more specific details."
                else:
                    return f"No driver found with name '{driver_name}'. Please check the spelling and try again."
            else:
                return "Please provide a driver name to get their information. For example: 'Show me driver information for Rajesh'"

        except Exception as e:
            logger.error(f"Error handling driver info query: {e}")
            return "Sorry, I couldn't retrieve driver information at this time."

    @staticmethod
    async def _handle_route_info_query(
        db: AsyncSession,
        message: str,
        context: Dict[str, Any],
        user_role: Optional[str]
    ) -> str:
        """Handle route information queries."""
        try:
            route_info = AIChatService._extract_entity_from_message(message, ["route", "bus route"])

            if route_info:
                # Search for students or drivers by route
                students_result = await db.execute(
                    select(DBStudent).where(DBStudent.route.ilike(f"%{route_info}%")).limit(10)
                )
                students = students_result.scalars().all()

                drivers_result = await db.execute(
                    select(DBDriver).where(DBDriver.route.ilike(f"%{route_info}%")).limit(5)
                )
                drivers = drivers_result.scalars().all()

                response = f"Route '{route_info}' information:\n"
                if drivers:
                    response += f"Driver(s): {', '.join([d.name for d in drivers])}\n"
                if students:
                    response += f"Students: {', '.join([s.name for s in students[:5]])}"
                    if len(students) > 5:
                        response += f" and {len(students) - 5} more"
                return response
            else:
                return "Please provide a route name or number to get route information."

        except Exception as e:
            logger.error(f"Error handling route info query: {e}")
            return "Sorry, I couldn't retrieve route information at this time."

    @staticmethod
    async def _handle_fee_info_query(
        db: AsyncSession,
        message: str,
        context: Dict[str, Any],
        user_role: Optional[str]
    ) -> str:
        """Handle fee information queries."""
        try:
            # This would typically involve fee records if they exist
            # For now, return general fee information
            return "Fee information: Transport fees vary based on route and distance. Please contact the administration office for specific fee details for your ward."

        except Exception as e:
            logger.error(f"Error handling fee info query: {e}")
            return "Sorry, I couldn't retrieve fee information at this time."

    @staticmethod
    async def _handle_contact_info_query(
        db: AsyncSession,
        message: str,
        context: Dict[str, Any],
        user_role: Optional[str]
    ) -> str:
        """Handle contact information queries."""
        try:
            return "School Contact Information:\n- Phone: +91-XXXX-XXXXXX\n- Email: info@school.edu\n- Address: School Campus, City\n\nFor urgent matters, please contact the administration office directly."

        except Exception as e:
            logger.error(f"Error handling contact info query: {e}")
            return "Sorry, I couldn't retrieve contact information at this time."

    @staticmethod
    def _handle_help_query(user_role: Optional[str]) -> str:
        """Handle help queries."""
        help_text = """I can help you with the following:

• Student Information - Get details about students, classes, and enrollment
• Driver Information - Find driver details, routes, and contact information
• Route Information - Get information about bus routes and coverage areas
• Fee Information - Learn about transport fees and payment details
• Contact Information - Get school contact details and emergency numbers

Just ask me questions in natural language like:
- "Show me student information for Priya"
- "Who is the driver for route 5?"
- "What routes go to Sector 12?"
- "Help me with fee information"

What would you like to know?"""
        return help_text

    @staticmethod
    def _handle_general_query(message: str, context: Dict[str, Any], user_role: Optional[str]) -> str:
        """Handle general queries."""
        # Simple pattern matching for common queries
        message_lower = message.lower()

        if any(word in message_lower for word in ["hello", "hi", "greetings", "good morning", "good afternoon"]):
            return "Hello! I'm your school management assistant. How can I help you today?"
        elif any(word in message_lower for word in ["thank", "thanks"]):
            return "You're welcome! Is there anything else I can help you with?"
        elif any(word in message_lower for word in ["bye", "goodbye", "see you"]):
            return "Goodbye! Have a great day!"
        else:
            return "I understand you're asking about: '" + message + "'. I can help you with student information, driver details, route information, fees, and contact details. Could you please be more specific about what you'd like to know?"

    @staticmethod
    def _extract_entity_from_message(message: str, keywords: List[str]) -> Optional[str]:
        """Extract entity (name, identifier) from message based on keywords."""
        message_lower = message.lower()

        # Find sentences containing keywords
        sentences = re.split(r'[.!?]+', message_lower)
        relevant_sentences = [s.strip() for s in sentences if any(keyword in s for keyword in keywords)]

        if relevant_sentences:
            # Extract potential names (words after keywords)
            for sentence in relevant_sentences:
                words = sentence.split()
                for i, word in enumerate(words):
                    if word in keywords and i + 1 < len(words):
                        # Get the next few words as potential name
                        name_parts = []
                        for j in range(i + 1, min(i + 4, len(words))):
                            if words[j] not in ["info", "information", "details", "named"]:
                                name_parts.append(words[j])
                            else:
                                break
                        if name_parts:
                            return " ".join(name_parts)

        return None

    @staticmethod
    async def get_conversation_history(
        db: AsyncSession,
        conversation_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> ChatHistoryResponse:
        """Get conversation history with messages."""
        try:
            # Get conversation
            conv_result = await db.execute(
                select(DBChatConversation).where(DBChatConversation.id == conversation_id)
            )
            db_conversation = conv_result.scalar_one_or_none()
            if not db_conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")

            # Get messages
            messages_result = await db.execute(
                select(DBChatMessage)
                .where(DBChatMessage.conversation_id == conversation_id)
                .order_by(DBChatMessage.created_at)
                .offset(offset)
                .limit(limit)
            )
            db_messages = messages_result.scalars().all()

            # Convert to models
            conversation = ChatConversation(
                id=db_conversation.id,
                user_id=db_conversation.user_id,
                title=db_conversation.title,
                status=ConversationStatus(db_conversation.status),
                priority=ConversationPriority(db_conversation.priority),
                context_data=db_conversation.context_data,
                message_count=db_conversation.message_count,
                last_message_at=db_conversation.last_message_at,
                created_at=db_conversation.created_at,
                updated_at=db_conversation.updated_at
            )

            messages = []
            for db_msg in db_messages:
                message = ChatMessage(
                    id=db_msg.id,
                    conversation_id=db_msg.conversation_id,
                    message_type=MessageType(db_msg.message_type),
                    content=db_msg.content,
                    metadata=db_msg.metadata,
                    created_at=db_msg.created_at,
                    updated_at=db_msg.updated_at
                )
                messages.append(message)

            return ChatHistoryResponse(
                conversation=conversation,
                messages=messages,
                context=db_conversation.context_data
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            raise HTTPException(status_code=500, detail=f"Error retrieving conversation history: {str(e)}")

    @staticmethod
    async def get_user_conversations(
        db: AsyncSession,
        user_id: int,
        limit: int = 20,
        offset: int = 0
    ) -> ConversationResponse:
        """Get all conversations for a user."""
        try:
            # Get conversations
            conversations_result = await db.execute(
                select(DBChatConversation)
                .where(DBChatConversation.user_id == user_id)
                .where(DBChatConversation.status == ConversationStatus.ACTIVE.value)
                .order_by(desc(DBChatConversation.last_message_at))
                .offset(offset)
                .limit(limit)
            )
            db_conversations = conversations_result.scalars().all()

            # Get total count
            total_result = await db.execute(
                select(func.count(DBChatConversation.id))
                .where(DBChatConversation.user_id == user_id)
                .where(DBChatConversation.status == ConversationStatus.ACTIVE.value)
            )
            total_count = total_result.scalar()

            # Convert to models
            conversations = []
            for db_conv in db_conversations:
                conversation = ChatConversation(
                    id=db_conv.id,
                    user_id=db_conv.user_id,
                    title=db_conv.title,
                    status=ConversationStatus(db_conv.status),
                    priority=ConversationPriority(db_conv.priority),
                    context_data=db_conv.context_data,
                    message_count=db_conv.message_count,
                    last_message_at=db_conv.last_message_at,
                    created_at=db_conv.created_at,
                    updated_at=db_conv.updated_at
                )
                conversations.append(conversation)

            return ConversationResponse(
                conversations=conversations,
                total_count=total_count
            )

        except Exception as e:
            logger.error(f"Error getting user conversations: {e}")
            raise HTTPException(status_code=500, detail=f"Error retrieving conversations: {str(e)}")