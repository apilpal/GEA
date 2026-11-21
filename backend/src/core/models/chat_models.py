"""
AI Chat models for the school management system.

This module defines Pydantic models for API requests/responses and
SQLAlchemy database models for chat functionality including conversations,
messages, and context management.

Key Models:
- ChatConversation: Conversation information and metadata
- ChatMessage: Individual chat messages with content and metadata
- ChatContext: Conversation context for AI processing
- ChatSession: User session tracking for chat interactions
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum
import time
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .models import Base


class MessageType(str, Enum):
    """Enumeration of message types in chat system."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ConversationStatus(str, Enum):
    """Enumeration of conversation statuses."""
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


class ConversationPriority(str, Enum):
    """Enumeration of conversation priorities."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


# Pydantic Models for API
class ChatMessage(BaseModel):
    """Individual chat message model."""
    id: Optional[str] = None
    conversation_id: str
    message_type: MessageType
    content: str
    message_metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[int] = None
    updated_at: Optional[int] = None


class ChatConversation(BaseModel):
    """Chat conversation model."""
    id: Optional[str] = None
    user_id: Optional[int] = None
    title: Optional[str] = None
    status: ConversationStatus = ConversationStatus.ACTIVE
    priority: ConversationPriority = ConversationPriority.NORMAL
    context_data: Optional[Dict[str, Any]] = None
    message_count: Optional[int] = 0
    last_message_at: Optional[int] = None
    created_at: Optional[int] = None
    updated_at: Optional[int] = None


class ChatContext(BaseModel):
    """Conversation context for AI processing."""
    id: Optional[str] = None
    conversation_id: str
    context_type: str  # "user_profile", "conversation_history", "system_prompt", etc.
    context_data: Dict[str, Any]
    is_active: bool = True
    created_at: Optional[int] = None
    updated_at: Optional[int] = None


class ChatSession(BaseModel):
    """User session tracking for chat interactions."""
    id: Optional[str] = None
    user_id: Optional[int] = None
    session_token: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    started_at: Optional[int] = None
    ended_at: Optional[int] = None
    is_active: bool = True


# Request/Response Models
class CreateConversationRequest(BaseModel):
    """Request model for creating new conversations."""
    title: Optional[str] = None
    priority: ConversationPriority = ConversationPriority.NORMAL
    initial_context: Optional[Dict[str, Any]] = None


class SendMessageRequest(BaseModel):
    """Request model for sending chat messages."""
    conversation_id: str
    content: str
    message_type: MessageType = MessageType.USER
    message_metadata: Optional[Dict[str, Any]] = None


class UpdateConversationRequest(BaseModel):
    """Request model for updating conversation metadata."""
    title: Optional[str] = None
    status: Optional[ConversationStatus] = None
    priority: Optional[ConversationPriority] = None
    context_data: Optional[Dict[str, Any]] = None


class ConversationResponse(BaseModel):
    """Response model for conversation queries."""
    conversations: List[ChatConversation]
    total_count: int


class MessageResponse(BaseModel):
    """Response model for message queries."""
    messages: List[ChatMessage]
    total_count: int


class ChatHistoryResponse(BaseModel):
    """Response model for conversation history."""
    conversation: ChatConversation
    messages: List[ChatMessage]
    context: Optional[Dict[str, Any]] = None


# SQLAlchemy Database Models
class DBChatConversation(Base):
    """SQLAlchemy model for chat conversation database records."""
    __tablename__ = "chat_conversations"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)  # Nullable for anonymous users
    title = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default=ConversationStatus.ACTIVE.value, index=True)
    priority = Column(String(20), nullable=False, default=ConversationPriority.NORMAL.value, index=True)
    context_data = Column(JSON, nullable=True)  # Store conversation context as JSON
    message_count = Column(Integer, nullable=False, default=0)
    last_message_at = Column(Integer, nullable=True, index=True)
    created_at = Column(Integer, nullable=False, default=lambda: int(time.time()), index=True)
    updated_at = Column(Integer, nullable=False, default=lambda: int(time.time()), index=True)


class DBChatMessage(Base):
    """SQLAlchemy model for chat message database records."""
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, index=True)
    conversation_id = Column(String(36), ForeignKey("chat_conversations.id"), nullable=False, index=True)
    message_type = Column(String(20), nullable=False, index=True)
    content = Column(Text, nullable=False)
    message_metadata = Column(JSON, nullable=True)  # Store message metadata as JSON (renamed from 'metadata' which is reserved)
    created_at = Column(Integer, nullable=False, default=lambda: int(time.time()), index=True)
    updated_at = Column(Integer, nullable=False, default=lambda: int(time.time()), index=True)


class DBChatContext(Base):
    """SQLAlchemy model for chat context database records."""
    __tablename__ = "chat_contexts"

    id = Column(String(36), primary_key=True, index=True)
    conversation_id = Column(String(36), ForeignKey("chat_conversations.id"), nullable=False, index=True)
    context_type = Column(String(50), nullable=False, index=True)
    context_data = Column(JSON, nullable=False)  # Store context data as JSON
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(Integer, nullable=False, default=lambda: int(time.time()), index=True)
    updated_at = Column(Integer, nullable=False, default=lambda: int(time.time()), index=True)


class DBChatSession(Base):
    """SQLAlchemy model for chat session database records."""
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    session_token = Column(String(255), nullable=False, unique=True, index=True)
    ip_address = Column(String(45), nullable=True)  # Support for IPv6
    user_agent = Column(Text, nullable=True)
    started_at = Column(Integer, nullable=False, default=lambda: int(time.time()), index=True)
    ended_at = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)


# Create relationships
DBChatConversation.messages = relationship("DBChatMessage", back_populates="conversation")
DBChatConversation.contexts = relationship("DBChatContext", back_populates="conversation")

DBChatMessage.conversation = relationship("DBChatConversation", back_populates="messages")
DBChatContext.conversation = relationship("DBChatConversation", back_populates="contexts")