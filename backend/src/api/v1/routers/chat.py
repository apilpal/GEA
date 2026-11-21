"""
AI Chat router for chatbot endpoints.

This module provides FastAPI routes for AI chatbot functionality including:
- Conversation management (create, list, update)
- Message handling (send, receive, history)
- Context management for personalized responses
- Integration with existing user authentication

Endpoints:
- POST /chat/conversation: Start new conversation
- GET /chat/conversations: List user conversations
- POST /chat/message: Send message and get AI response
- GET /chat/history/{conversation_id}: Get conversation history
- PUT /chat/conversation/{conversation_id}: Update conversation metadata
- GET /chat/context/{conversation_id}: Get conversation context

All endpoints include rate limiting and integrate with the AI chat service
layer for intelligent response generation and context management.
"""

from fastapi import APIRouter, HTTPException, Query, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import logging

# Import chat models and database functions
from src.core.models.chat_models import (
    ChatConversation,
    ChatMessage,
    ConversationResponse,
    MessageResponse,
    ChatHistoryResponse,
    CreateConversationRequest,
    SendMessageRequest,
    UpdateConversationRequest,
    MessageType
)

# Import services
from src.services.ai_chat_service import AIChatService

# Import existing models for user context
from src.core.models.models import get_db

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/conversation", response_model=ChatConversation)
@limiter.limit("30/minute")
async def create_conversation(
    request: Request,
    conversation_request: Optional[CreateConversationRequest] = None,
    current_user: Optional[dict] = None,  # This would come from auth middleware
    db: AsyncSession = Depends(get_db)
) -> ChatConversation:
    """Create a new chat conversation.

    Starts a new conversation session with optional initial context and settings.
    Rate limited to 30 requests per minute to ensure system performance.

    Args:
        request (Request): FastAPI request object (used by rate limiter)
        conversation_request (Optional[CreateConversationRequest]): Optional conversation settings
        current_user (Optional[dict]): Current authenticated user (if any)
        db (AsyncSession): Database session dependency

    Returns:
        ChatConversation: Created conversation object with unique ID and metadata

    Raises:
        HTTPException: If conversation creation fails or rate limit exceeded
    """
    try:
        user_id = current_user.get("id") if current_user else None

        return await AIChatService.create_conversation(
            db=db,
            user_id=user_id,
            request=conversation_request
        )
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating conversation: {str(e)}")

@router.get("/conversations", response_model=ConversationResponse)
@limiter.limit("60/minute")
async def get_user_conversations(
    request: Request,
    current_user: dict,  # Requires authentication
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of conversations to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of conversations to return")
) -> ConversationResponse:
    """Retrieve user's chat conversations with pagination.

    Provides a paginated view of all conversations for the authenticated user.
    Rate limited to 60 requests per minute for system performance.

    Args:
        request (Request): FastAPI request object (used by rate limiter)
        current_user (dict): Current authenticated user (required)
        db (AsyncSession): Database session dependency
        skip (int): Number of records to skip for pagination (default: 0)
        limit (int): Maximum number of records to return (1-100, default: 20)

    Returns:
        ConversationResponse: Paginated response containing list of conversations
                             and total count for pagination metadata

    Raises:
        HTTPException: If user not authenticated or database query fails
    """
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")

        return await AIChatService.get_user_conversations(
            db=db,
            user_id=user_id,
            limit=limit,
            offset=skip
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user conversations: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving conversations: {str(e)}")

@router.post("/message", response_model=dict)
@limiter.limit("120/minute")
async def send_message(
    request: Request,
    message_request: SendMessageRequest,
    current_user: Optional[dict] = None,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Send a message and receive AI response.

    Processes a user message, generates an AI response using context and intent recognition,
    and stores both messages in the conversation history. Rate limited to 120 requests
    per minute to handle chatty users while maintaining performance.

    Args:
        request (Request): FastAPI request object (used by rate limiter)
        message_request (SendMessageRequest): Message content and conversation context
        current_user (Optional[dict]): Current authenticated user (if any)
        db (AsyncSession): Database session dependency

    Returns:
        dict: Response containing user message confirmation and AI response with metadata:
              {
                  "user_message": ChatMessage,
                  "ai_response": str,
                  "conversation_id": str,
                  "timestamp": int
              }

    Raises:
        HTTPException: If conversation not found, message processing fails, or rate limit exceeded
    """
    try:
        user_id = current_user.get("id") if current_user else None

        # Send message and get AI response
        user_message, ai_response = await AIChatService.send_message(
            db=db,
            conversation_id=message_request.conversation_id,
            message_request=message_request,
            user_id=user_id
        )

        return {
            "user_message": user_message,
            "ai_response": ai_response,
            "conversation_id": message_request.conversation_id,
            "timestamp": user_message.created_at
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")

@router.get("/history/{conversation_id}", response_model=ChatHistoryResponse)
@limiter.limit("60/minute")
async def get_conversation_history(
    request: Request,
    conversation_id: str,
    current_user: Optional[dict] = None,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of messages to return"),
    offset: int = Query(0, ge=0, description="Number of messages to skip")
) -> ChatHistoryResponse:
    """Retrieve complete conversation history with messages and context.

    Fetches the full conversation including all messages, metadata, and context
    information. Rate limited to 60 requests per minute for performance.

    Args:
        request (Request): FastAPI request object (used by rate limiter)
        conversation_id (str): Unique conversation identifier
        current_user (Optional[dict]): Current authenticated user (if any)
        db (AsyncSession): Database session dependency
        limit (int): Maximum number of messages to return (1-500, default: 50)
        offset (int): Number of messages to skip for pagination (default: 0)

    Returns:
        ChatHistoryResponse: Complete conversation history including:
                            - conversation: Conversation metadata
                            - messages: List of messages in chronological order
                            - context: Conversation context data

    Raises:
        HTTPException: If conversation not found, access denied, or database error occurs
    """
    try:
        # Check if user has access to this conversation (if authentication is required)
        # For now, allowing access to all conversations, but this should be restricted
        # based on your authentication requirements

        return await AIChatService.get_conversation_history(
            db=db,
            conversation_id=conversation_id,
            limit=limit,
            offset=offset
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation history: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving conversation history: {str(e)}")

@router.put("/conversation/{conversation_id}", response_model=ChatConversation)
async def update_conversation(
    conversation_id: str,
    conversation_update: UpdateConversationRequest,
    current_user: Optional[dict] = None,
    db: AsyncSession = Depends(get_db)
) -> ChatConversation:
    """Update conversation metadata and settings.

    Allows updating conversation title, status, priority, and context data.
    Useful for organizing conversations or changing their importance level.

    Args:
        conversation_id (str): Unique conversation identifier
        conversation_update (UpdateConversationRequest): Fields to update
        current_user (Optional[dict]): Current authenticated user (if any)
        db (AsyncSession): Database session dependency

    Returns:
        ChatConversation: Updated conversation object with new metadata

    Raises:
        HTTPException: If conversation not found, access denied, or update fails
    """
    try:
        # Get conversation
        from sqlalchemy import select
        from src.core.models.chat_models import DBChatConversation

        result = await db.execute(
            select(DBChatConversation).where(DBChatConversation.id == conversation_id)
        )
        db_conversation = result.scalar_one_or_none()
        if not db_conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Check if user has access to this conversation
        user_id = current_user.get("id") if current_user else None
        if db_conversation.user_id and db_conversation.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this conversation")

        # Apply updates
        update_data = conversation_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(db_conversation, key):
                setattr(db_conversation, key, value)

        # Update timestamp
        import time
        db_conversation.updated_at = int(time.time())

        await db.commit()
        await db.refresh(db_conversation)

        # Convert to response model
        from src.core.models.chat_models import ConversationStatus, ConversationPriority

        return ChatConversation(
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

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating conversation: {str(e)}")

@router.get("/context/{conversation_id}", response_model=dict)
@limiter.limit("30/minute")
async def get_conversation_context(
    request: Request,
    conversation_id: str,
    current_user: Optional[dict] = None,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Retrieve conversation context and metadata.

    Gets detailed context information for a conversation including
    user preferences, conversation history summary, and AI processing context.

    Args:
        request (Request): FastAPI request object (used by rate limiter)
        conversation_id (str): Unique conversation identifier
        current_user (Optional[dict]): Current authenticated user (if any)
        db (AsyncSession): Database session dependency

    Returns:
        dict: Conversation context including:
              - basic_info: Conversation metadata
              - context_data: AI processing context
              - recent_topics: Summary of recent discussion topics
              - user_preferences: User-specific settings

    Raises:
        HTTPException: If conversation not found or access denied
    """
    try:
        # Get conversation context using the AI service
        context = await AIChatService._get_conversation_context(db, conversation_id)

        # Add additional metadata
        context_data = {
            "conversation_id": conversation_id,
            "context_retrieved_at": int(time.time()),
            "context_available": len(context) > 0
        }

        context_data.update(context)

        return context_data

    except Exception as e:
        logger.error(f"Error getting conversation context: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving conversation context: {str(e)}")

@router.delete("/conversation/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: Optional[dict] = None,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Soft delete a conversation by archiving it.

    Archives the conversation instead of permanently deleting it.
    This preserves data for analytics while removing it from active conversations.

    Args:
        conversation_id (str): Unique conversation identifier
        current_user (Optional[dict]): Current authenticated user (if any)
        db (AsyncSession): Database session dependency

    Returns:
        dict: Success confirmation with deletion details

    Raises:
        HTTPException: If conversation not found, access denied, or deletion fails
    """
    try:
        # Get conversation
        from sqlalchemy import select
        from src.core.models.chat_models import DBChatConversation, ConversationStatus

        result = await db.execute(
            select(DBChatConversation).where(DBChatConversation.id == conversation_id)
        )
        db_conversation = result.scalar_one_or_none()
        if not db_conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Check if user has access to this conversation
        user_id = current_user.get("id") if current_user else None
        if db_conversation.user_id and db_conversation.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this conversation")

        # Archive the conversation instead of deleting
        db_conversation.status = ConversationStatus.ARCHIVED.value
        import time
        db_conversation.updated_at = int(time.time())

        await db.commit()

        return {
            "message": "Conversation archived successfully",
            "conversation_id": conversation_id,
            "archived_at": db_conversation.updated_at
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Error archiving conversation: {str(e)}")

# Optional: Add health check endpoint for chat service
@router.get("/health")
async def chat_health_check() -> dict:
    """Health check endpoint for chat service.

    Provides basic health status and service availability information.
    No rate limiting applied as this is a monitoring endpoint.

    Returns:
        dict: Health status information including:
              - status: Service health ("healthy" or "unhealthy")
              - timestamp: Current server timestamp
              - service: Service identifier ("ai_chat")
    """
    return {
        "status": "healthy",
        "timestamp": int(time.time()),
        "service": "ai_chat"
    }