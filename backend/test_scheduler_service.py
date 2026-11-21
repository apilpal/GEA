"""
Comprehensive tests for Scheduler Service functionality.

This module provides extensive testing for the CSV synchronization scheduler,
including job scheduling, execution, error handling, and integration testing.
"""

import asyncio
import pytest
import time
import tempfile
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from email.mime.text import MIMEText as MimeText
from email.mime.multipart import MIMEMultipart as MimeMultipart

# Add the src directory to Python path for imports
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Mock the config module for testing
sys.modules['core.config'] = type(sys)('config')
sys.modules['core.config.config'] = type(sys)('config')

# Create a mock config object
class MockConfig:
    DATABASE_URL = "sqlite:///./test.db"
    LOG_LEVEL = "INFO"
    DB_POOL_RECYCLE = 3600
    DB_POOL_SIZE = 10
    DB_MAX_OVERFLOW = 20

sys.modules['core.config.config'].config = MockConfig()

from services.scheduler_service import (
    SyncScheduler,
    SchedulerConfig,
    ScheduledJob,
    get_scheduler,
    start_scheduler,
    stop_scheduler,
    trigger_manual_sync,
    get_scheduler_status,
    get_sync_history
)

from services.csv_sync_service import (
    CSVSyncer,
    SyncConfig as CSVSyncConfig,
    SyncResult,
    sync_all_drivers
)


class TestSchedulerConfig:
    """Test SchedulerConfig dataclass functionality."""

    def test_default_config(self):
        """Test default scheduler configuration."""
        config = SchedulerConfig()
        assert config.enabled is True
        assert config.sync_frequency == "daily"
        assert config.sync_time == "02:00"
        assert config.max_retries == 3
        assert config.retry_delay_seconds == 300
        assert config.email_notifications is False

    def test_custom_config(self):
        """Test custom scheduler configuration."""
        config = SchedulerConfig(
            enabled=False,
            sync_frequency="weekly",
            sync_time="03:30",
            max_retries=5,
            email_notifications=True,
            email_smtp_server="smtp.test.com",
            email_to=["admin@test.com"]
        )
        assert config.enabled is False
        assert config.sync_frequency == "weekly"
        assert config.sync_time == "03:30"
        assert config.max_retries == 5
        assert config.email_notifications is True
        assert config.email_smtp_server == "smtp.test.com"
        assert config.email_to == ["admin@test.com"]


class TestScheduledJob:
    """Test ScheduledJob dataclass functionality."""

    def test_default_job(self):
        """Test default scheduled job creation."""
        job = ScheduledJob(job_id="test_job", name="Test Job", schedule_type="daily")
        assert job.job_id == "test_job"
        assert job.name == "Test Job"
        assert job.schedule_type == "daily"
        assert job.success_count == 0
        assert job.error_count == 0
        assert job.is_active is True
        assert job.next_run is None
        assert job.last_run is None

    def test_job_with_timestamps(self):
        """Test scheduled job with run timestamps."""
        now = datetime.now()
        job = ScheduledJob(
            job_id="test_job",
            name="Test Job",
            schedule_type="hourly",
            next_run=now,
            last_run=now - timedelta(hours=1),
            success_count=5,
            error_count=1,
            is_active=True
        )
        assert job.next_run == now
        assert job.last_run == now - timedelta(hours=1)
        assert job.success_count == 5
        assert job.error_count == 1


class TestSyncSchedulerInitialization:
    """Test SyncScheduler initialization and basic functionality."""

    def test_scheduler_initialization_with_config(self):
        """Test scheduler initialization with custom config."""
        config = SchedulerConfig(enabled=False, sync_frequency="hourly")
        scheduler = SyncScheduler(config)

        assert scheduler.config == config
        assert scheduler.scheduler is None  # APScheduler not available in tests
        assert scheduler.jobs == {}
        assert scheduler.sync_results == []

    def test_scheduler_initialization_default_config(self):
        """Test scheduler initialization with default config."""
        scheduler = SyncScheduler()
        assert isinstance(scheduler.config, SchedulerConfig)
        assert scheduler.config.enabled is True
        assert scheduler.config.sync_frequency == "daily"

    @patch('services.scheduler_service.APSCHEDULER_AVAILABLE', True)
    @patch('services.scheduler_service.AsyncIOScheduler')
    def test_scheduler_with_apscheduler_available(self, mock_scheduler_class):
        """Test scheduler initialization when APScheduler is available."""
        mock_scheduler = Mock()
        mock_scheduler_class.return_value = mock_scheduler

        scheduler = SyncScheduler()
        assert scheduler.scheduler == mock_scheduler
        mock_scheduler_class.assert_called_once()

    def test_scheduler_without_apscheduler(self):
        """Test scheduler initialization when APScheduler is not available."""
        with patch('services.scheduler_service.APSCHEDULER_AVAILABLE', False):
            scheduler = SyncScheduler()
            assert scheduler.scheduler is None

    def test_get_scheduler_status_no_scheduler(self):
        """Test getting scheduler status when APScheduler is not available."""
        scheduler = SyncScheduler()
        status = scheduler.get_scheduler_status()

        assert status == {"status": "disabled", "reason": "APScheduler not available"}

    def test_get_sync_history_empty(self):
        """Test getting sync history when empty."""
        scheduler = SyncScheduler()
        history = scheduler.get_sync_history()
        assert history == []

    def test_get_sync_history_with_limit(self):
        """Test getting sync history with custom limit."""
        scheduler = SyncScheduler()

        # Add test results
        for i in range(10):
            scheduler.sync_results.append({"id": i, "type": "test"})

        history = scheduler.get_sync_history(limit=5)
        assert len(history) == 5
        assert history == scheduler.sync_results[-5:]


class TestSchedulerJobScheduling:
    """Test job scheduling functionality."""

    @patch('services.scheduler_service.APSCHEDULER_AVAILABLE', True)
    @patch('services.scheduler_service.AsyncIOScheduler')
    def test_create_daily_sync_job(self, mock_scheduler_class):
        """Test creating daily sync job."""
        mock_scheduler = Mock()
        mock_scheduler_class.return_value = mock_scheduler

        config = SchedulerConfig(sync_frequency="daily", sync_time="14:30")
        scheduler = SyncScheduler(config)

        # Mock the scheduler instance
        scheduler.scheduler = mock_scheduler

        # Test job creation
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(scheduler._create_sync_jobs())
        finally:
            loop.close()

        # Verify daily job was created
        mock_scheduler.add_job.assert_called_once()
        call_args = mock_scheduler.add_job.call_args

        assert call_args[1]['id'] == 'csv_sync_daily'
        assert call_args[1]['name'] == 'Daily CSV Sync'
        assert 'hour' in str(call_args[1]['trigger'])
        assert 'minute' in str(call_args[1]['trigger'])

    @patch('services.scheduler_service.APSCHEDULER_AVAILABLE', True)
    @patch('services.scheduler_service.AsyncIOScheduler')
    def test_create_weekly_sync_job(self, mock_scheduler_class):
        """Test creating weekly sync job."""
        mock_scheduler = Mock()
        mock_scheduler_class.return_value = mock_scheduler

        config = SchedulerConfig(sync_frequency="weekly", sync_time="10:00")
        scheduler = SyncScheduler(config)
        scheduler.scheduler = mock_scheduler

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(scheduler._create_sync_jobs())
        finally:
            loop.close()

        # Verify weekly job was created
        call_args = mock_scheduler.add_job.call_args
        assert call_args[1]['id'] == 'csv_sync_weekly'
        assert call_args[1]['name'] == 'Weekly CSV Sync'

    @patch('services.scheduler_service.APSCHEDULER_AVAILABLE', True)
    @patch('services.scheduler_service.AsyncIOScheduler')
    def test_create_hourly_sync_job(self, mock_scheduler_class):
        """Test creating hourly sync job."""
        mock_scheduler = Mock()
        mock_scheduler_class.return_value = mock_scheduler

        config = SchedulerConfig(sync_frequency="hourly", sync_interval_hours=6)
        scheduler = SyncScheduler(config)
        scheduler.scheduler = mock_scheduler

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(scheduler._create_sync_jobs())
        finally:
            loop.close()

        # Verify hourly job was created
        call_args = mock_scheduler.add_job.call_args
        assert call_args[1]['id'] == 'csv_sync_hourly'
        assert '6' in call_args[1]['name']

    @patch('services.scheduler_service.APSCHEDULER_AVAILABLE', True)
    @patch('services.scheduler_service.AsyncIOScheduler')
    def test_create_custom_sync_job(self, mock_scheduler_class):
        """Test creating custom cron sync job."""
        mock_scheduler = Mock()
        mock_scheduler_class.return_value = mock_scheduler

        config = SchedulerConfig(sync_frequency="custom", custom_cron="*/30 * * * *")
        scheduler = SyncScheduler(config)
        scheduler.scheduler = mock_scheduler

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(scheduler._create_sync_jobs())
        finally:
            loop.close()

        # Verify custom job was created
        call_args = mock_scheduler.add_job.call_args
        assert call_args[1]['id'] == 'csv_sync_custom'
        assert call_args[1]['name'] == 'Custom CSV Sync'

    @patch('services.scheduler_service.APSCHEDULER_AVAILABLE', True)
    @patch('services.scheduler_service.AsyncIOScheduler')
    def test_remove_existing_jobs(self, mock_scheduler_class):
        """Test that existing jobs are removed before creating new ones."""
        mock_scheduler = Mock()
        mock_scheduler_class.return_value = mock_scheduler

        config = SchedulerConfig(sync_frequency="daily")
        scheduler = SyncScheduler(config)
        scheduler.scheduler = mock_scheduler

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(scheduler._create_sync_jobs())
        finally:
            loop.close()

        # Verify remove_job was called for all job types
        expected_calls = [
            'csv_sync_daily', 'csv_sync_weekly',
            'csv_sync_hourly', 'csv_sync_custom'
        ]
        for job_id in expected_calls:
            mock_scheduler.remove_job.assert_any_call(job_id)


class TestSchedulerStartStop:
    """Test scheduler start and stop functionality."""

    @patch('services.scheduler_service.APSCHEDULER_AVAILABLE', True)
    @patch('services.scheduler_service.AsyncIOScheduler')
    def test_scheduler_start_success(self, mock_scheduler_class):
        """Test successful scheduler start."""
        mock_scheduler = Mock()
        mock_scheduler_class.return_value = mock_scheduler

        config = SchedulerConfig()
        scheduler = SyncScheduler(config)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(scheduler.start())
        finally:
            loop.close()

        assert result is True
        mock_scheduler.start.assert_called_once()
        assert 'csv_sync' in scheduler.jobs

    @patch('services.scheduler_service.APSCHEDULER_AVAILABLE', True)
    @patch('services.scheduler_service.AsyncIOScheduler')
    def test_scheduler_start_disabled_config(self, mock_scheduler_class):
        """Test scheduler start with disabled configuration."""
        config = SchedulerConfig(enabled=False)
        scheduler = SyncScheduler(config)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(scheduler.start())
        finally:
            loop.close()

        assert result is False
        # Scheduler should not be started when disabled

    def test_scheduler_start_apscheduler_unavailable(self):
        """Test scheduler start when APScheduler is not available."""
        with patch('services.scheduler_service.APSCHEDULER_AVAILABLE', False):
            scheduler = SyncScheduler()

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(scheduler.start())
            finally:
                loop.close()

            assert result is False

    @patch('services.scheduler_service.APSCHEDULER_AVAILABLE', True)
    @patch('services.scheduler_service.AsyncIOScheduler')
    def test_scheduler_stop_success(self, mock_scheduler_class):
        """Test successful scheduler stop."""
        mock_scheduler = Mock()
        mock_scheduler_class.return_value = mock_scheduler

        scheduler = SyncScheduler()
        scheduler.scheduler = mock_scheduler

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(scheduler.stop())
        finally:
            loop.close()

        assert result is True
        mock_scheduler.shutdown.assert_called_once_with(wait=True)

    def test_scheduler_stop_no_scheduler(self):
        """Test scheduler stop when no scheduler instance exists."""
        scheduler = SyncScheduler()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(scheduler.stop())
        finally:
            loop.close()

        assert result is True  # Should return True when no scheduler to stop


class TestScheduledSyncExecution:
    """Test scheduled sync job execution."""

    @patch('services.scheduler_service.sync_all_drivers')
    @patch('services.scheduler_service.APSCHEDULER_AVAILABLE', True)
    @patch('services.scheduler_service.AsyncIOScheduler')
    def test_run_scheduled_sync_success(self, mock_scheduler_class, mock_sync_all):
        """Test successful scheduled sync execution."""
        # Mock successful sync results
        mock_results = {
            "drivers1.csv": Mock(spec=SyncResult, success_count=10, error_count=0,
                                total_records=10, errors=[], warnings=[]),
            "drivers2.csv": Mock(spec=SyncResult, success_count=5, error_count=0,
                                total_records=5, errors=[], warnings=[])
        }
        mock_sync_all.return_value = mock_results

        scheduler = SyncScheduler()
        scheduler.scheduler = Mock()  # Mock scheduler to avoid APScheduler issues

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(scheduler._run_scheduled_sync())
        finally:
            loop.close()

        # Verify sync was called
        mock_sync_all.assert_called_once()

        # Verify result was stored
        assert len(scheduler.sync_results) == 1
        result = scheduler.sync_results[0]
        assert result["success"] is True
        assert result["total_files"] == 2
        assert result["success_count"] == 15
        assert result["error_count"] == 0

    @patch('services.scheduler_service.sync_all_drivers')
    @patch('services.scheduler_service.APSCHEDULER_AVAILABLE', True)
    @patch('services.scheduler_service.AsyncIOScheduler')
    def test_run_scheduled_sync_with_errors(self, mock_scheduler_class, mock_sync_all):
        """Test scheduled sync execution with errors."""
        # Mock sync results with errors
        mock_results = {
            "drivers1.csv": Mock(spec=SyncResult, success_count=8, error_count=2,
                                total_records=10, errors=["Error 1", "Error 2"],
                                warnings=["Warning 1"])
        }
        mock_sync_all.return_value = mock_results

        scheduler = SyncScheduler()
        scheduler.scheduler = Mock()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(scheduler._run_scheduled_sync())
        finally:
            loop.close()

        # Verify result indicates errors
        assert len(scheduler.sync_results) == 1
        result = scheduler.sync_results[0]
        assert result["success"] is False
        assert result["error_count"] == 2
        assert len(result["errors"]) == 2

    @patch('services.scheduler_service.sync_all_drivers')
    def test_run_scheduled_sync_exception(self, mock_sync_all):
        """Test scheduled sync execution with exceptions."""
        # Mock sync to raise exception
        mock_sync_all.side_effect = Exception("Sync failed")

        scheduler = SyncScheduler()
        scheduler.scheduler = Mock()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(scheduler._run_scheduled_sync())
        finally:
            loop.close()

        # Verify exception was handled
        assert len(scheduler.sync_results) == 1
        result = scheduler.sync_results[0]
        assert result["success"] is False
        assert "error" in result
        assert result["error"] == "Sync failed"


class TestManualSync:
    """Test manual sync functionality."""

    @patch('services.scheduler_service.sync_all_drivers')
    def test_run_sync_now_success(self, mock_sync_all):
        """Test successful manual sync."""
        # Mock successful sync results
        mock_results = {
            "drivers1.csv": Mock(spec=SyncResult, success_count=10, error_count=0,
                                total_records=10, errors=[], warnings=[])
        }
        mock_sync_all.return_value = mock_results

        scheduler = SyncScheduler()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(scheduler.run_sync_now())
        finally:
            loop.close()

        # Verify sync was called and result is correct
        mock_sync_all.assert_called_once()
        assert result["success"] is True
        assert result["job_type"] == "manual"
        assert result["total_files"] == 1
        assert result["success_count"] == 10

    @patch('services.scheduler_service.sync_all_drivers')
    def test_run_sync_now_exception(self, mock_sync_all):
        """Test manual sync with exception."""
        mock_sync_all.side_effect = Exception("Manual sync failed")

        scheduler = SyncScheduler()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(scheduler.run_sync_now())
        finally:
            loop.close()

        # Verify exception was handled
        assert result["success"] is False
        assert result["job_type"] == "manual"
        assert result["error"] == "Manual sync failed"

    @patch('services.scheduler_service.get_scheduler')
    def test_trigger_manual_sync_global(self, mock_get_scheduler):
        """Test triggering manual sync using global scheduler."""
        mock_scheduler = Mock()
        mock_result = {"success": True, "count": 10}
        mock_scheduler.run_sync_now = AsyncMock(return_value=mock_result)
        mock_get_scheduler.return_value = mock_scheduler

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(trigger_manual_sync())
        finally:
            loop.close()

        assert result == mock_result
        mock_scheduler.run_sync_now.assert_called_once()


class TestEmailNotifications:
    """Test email notification functionality."""

    def test_send_notification_email_disabled(self):
        """Test email notification when disabled."""
        config = SchedulerConfig(email_notifications=False)
        scheduler = SyncScheduler(config)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(scheduler._send_notification_email(
                "Test Subject", "Test Body"
            ))
        finally:
            loop.close()

        assert result is False

    def test_send_notification_email_no_recipients(self):
        """Test email notification with no recipients."""
        config = SchedulerConfig(email_notifications=True, email_to=[])
        scheduler = SyncScheduler(config)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(scheduler._send_notification_email(
                "Test Subject", "Test Body"
            ))
        finally:
            loop.close()

        assert result is False

    @patch('smtplib.SMTP')
    def test_send_notification_email_success(self, mock_smtp_class):
        """Test successful email notification."""
        # Mock SMTP server
        mock_server = Mock()
        mock_smtp_class.return_value = mock_server

        config = SchedulerConfig(
            email_notifications=True,
            email_smtp_server="smtp.test.com",
            email_smtp_port=587,
            email_username="test@example.com",
            email_password="password",
            email_from="noreply@test.com",
            email_to=["admin@test.com"]
        )
        scheduler = SyncScheduler(config)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(scheduler._send_notification_email(
                "Test Subject", "Test Body"
            ))
        finally:
            loop.close()

        assert result is True
        mock_smtp_class.assert_called_once_with("smtp.test.com", 587)
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("test@example.com", "password")
        mock_server.send_message.assert_called_once()
        mock_server.quit.assert_called_once()

    @patch('smtplib.SMTP')
    def test_send_notification_email_failure(self, mock_smtp_class):
        """Test email notification failure."""
        # Mock SMTP server to raise exception
        mock_smtp_class.side_effect = Exception("SMTP connection failed")

        config = SchedulerConfig(
            email_notifications=True,
            email_smtp_server="smtp.test.com",
            email_to=["admin@test.com"]
        )
        scheduler = SyncScheduler(config)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(scheduler._send_notification_email(
                "Test Subject", "Test Body"
            ))
        finally:
            loop.close()

        assert result is False


class TestSchedulerManagement:
    """Test scheduler management functionality."""

    @patch('services.scheduler_service.APSCHEDULER_AVAILABLE', True)
    @patch('services.scheduler_service.AsyncIOScheduler')
    def test_get_scheduler_status_running(self, mock_scheduler_class):
        """Test getting scheduler status when running."""
        # Mock scheduler and jobs
        mock_scheduler = Mock()
        mock_scheduler.running = True
        mock_scheduler.start_time = datetime.now()
        mock_scheduler_class.return_value = mock_scheduler

        # Mock job
        mock_job = Mock()
        mock_job.id = "test_job"
        mock_job.name = "Test Job"
        mock_job.next_run_time = datetime.now() + timedelta(hours=1)
        mock_job.trigger = "interval"
        mock_scheduler.get_jobs.return_value = [mock_job]

        scheduler = SyncScheduler()
        scheduler.scheduler = mock_scheduler

        status = scheduler.get_scheduler_status()

        assert status["status"] == "running"
        assert len(status["jobs"]) == 1
        assert status["jobs"][0]["id"] == "test_job"
        assert status["job_count"] == 1

    @patch('services.scheduler_service.APSCHEDULER_AVAILABLE', True)
    @patch('services.scheduler_service.AsyncIOScheduler')
    def test_get_scheduler_status_error(self, mock_scheduler_class):
        """Test getting scheduler status with error."""
        # Mock scheduler to raise exception
        mock_scheduler = Mock()
        mock_scheduler.get_jobs.side_effect = Exception("Scheduler error")
        mock_scheduler_class.return_value = mock_scheduler

        scheduler = SyncScheduler()
        scheduler.scheduler = mock_scheduler

        status = scheduler.get_scheduler_status()

        assert status["status"] == "error"
        assert "error" in status

    @patch('services.scheduler_service.get_scheduler')
    def test_get_scheduler_status_global(self, mock_get_scheduler):
        """Test getting scheduler status using global function."""
        mock_scheduler = Mock()
        mock_status = {"status": "running", "jobs": []}
        mock_scheduler.get_scheduler_status.return_value = mock_status
        mock_get_scheduler.return_value = mock_scheduler

        status = get_scheduler_status()
        assert status == mock_status
        mock_scheduler.get_scheduler_status.assert_called_once()


class TestSyncHistory:
    """Test sync history functionality."""

    def test_sync_history_tracking(self):
        """Test that sync results are properly tracked."""
        scheduler = SyncScheduler()

        # Add multiple sync results
        for i in range(5):
            result = {
                "id": i,
                "success": i % 2 == 0,
                "timestamp": datetime.now(),
                "count": i * 10
            }
            scheduler.sync_results.append(result)

        # Test getting all history
        history = scheduler.get_sync_history()
        assert len(history) == 5

        # Test getting limited history
        limited_history = scheduler.get_sync_history(limit=3)
        assert len(limited_history) == 3
        assert limited_history == scheduler.sync_results[-3:]

    def test_sync_history_automatic_cleanup(self):
        """Test that old sync results are automatically cleaned up."""
        scheduler = SyncScheduler()

        # Add more than 100 results (cleanup threshold)
        for i in range(150):
            result = {"id": i, "timestamp": datetime.now()}
            scheduler.sync_results.append(result)

        # Should only keep last 100 results
        assert len(scheduler.sync_results) == 100
        assert scheduler.sync_results[0]["id"] == 50  # First kept result
        assert scheduler.sync_results[-1]["id"] == 149  # Last result

    @patch('services.scheduler_service.get_scheduler')
    def test_get_sync_history_global(self, mock_get_scheduler):
        """Test getting sync history using global function."""
        mock_scheduler = Mock()
        mock_history = [{"id": 1}, {"id": 2}]
        mock_scheduler.get_sync_history.return_value = mock_history
        mock_get_scheduler.return_value = mock_scheduler

        history = get_sync_history(limit=5)
        assert history == mock_history
        mock_scheduler.get_sync_history.assert_called_once_with(5)


class TestGlobalSchedulerFunctions:
    """Test global scheduler functions."""

    @patch('services.scheduler_service.get_scheduler')
    def test_start_scheduler_global(self, mock_get_scheduler):
        """Test starting scheduler using global function."""
        mock_scheduler = Mock()
        mock_scheduler.start = AsyncMock(return_value=True)
        mock_get_scheduler.return_value = mock_scheduler

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(start_scheduler())
        finally:
            loop.close()

        assert result is True
        mock_scheduler.start.assert_called_once()

    @patch('services.scheduler_service.get_scheduler')
    def test_stop_scheduler_global(self, mock_get_scheduler):
        """Test stopping scheduler using global function."""
        mock_scheduler = Mock()
        mock_scheduler.stop = AsyncMock(return_value=True)
        mock_get_scheduler.return_value = mock_scheduler

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(stop_scheduler())
        finally:
            loop.close()

        assert result is True
        mock_scheduler.stop.assert_called_once()


class TestSchedulerIntegration:
    """Test scheduler integration with other services."""

    def test_scheduler_with_csv_sync_service(self):
        """Test scheduler integration with CSV sync service."""
        # This test ensures the scheduler can properly import and work with
        # the CSV sync service components
        from services.csv_sync_service import CSVSyncer, SyncConfig, SyncResult

        config = SchedulerConfig()
        scheduler = SyncScheduler(config)

        # Verify scheduler can be initialized alongside CSV sync components
        csv_config = CSVSyncConfig()
        csv_syncer = CSVSyncer(csv_config)

        assert scheduler is not None
        assert csv_syncer is not None

    @patch('services.scheduler_service.sync_all_drivers')
    def test_end_to_end_sync_workflow(self, mock_sync_all):
        """Test end-to-end sync workflow."""
        # Mock successful sync
        mock_results = {
            "test.csv": Mock(spec=SyncResult, success_count=5, error_count=0,
                           total_records=5, errors=[], warnings=[])
        }
        mock_sync_all.return_value = mock_results

        # Test complete workflow
        scheduler = SyncScheduler()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            # Manual sync
            manual_result = loop.run_until_complete(scheduler.run_sync_now())
            assert manual_result["success"] is True

            # Check history
            history = scheduler.get_sync_history()
            assert len(history) == 1
            assert history[0]["job_type"] == "manual"

            # Check status
            status = scheduler.get_scheduler_status()
            assert "status" in status

        finally:
            loop.close()


class TestErrorHandling:
    """Test error handling scenarios."""

    @patch('services.scheduler_service.APSCHEDULER_AVAILABLE', True)
    @patch('services.scheduler_service.AsyncIOScheduler')
    def test_scheduler_start_with_exception(self, mock_scheduler_class):
        """Test scheduler start with APScheduler exception."""
        # Mock scheduler to raise exception on start
        mock_scheduler = Mock()
        mock_scheduler.start.side_effect = Exception("Scheduler start failed")
        mock_scheduler_class.return_value = mock_scheduler

        scheduler = SyncScheduler()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(scheduler.start())
        finally:
            loop.close()

        assert result is False

    def test_job_creation_without_scheduler(self):
        """Test job creation when scheduler is not available."""
        scheduler = SyncScheduler()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            # Should not raise exception, just return without creating jobs
            loop.run_until_complete(scheduler._create_sync_jobs())
        finally:
            loop.close()

        # No jobs should be created
        assert scheduler.jobs == {}

    @patch('services.scheduler_service.sync_all_drivers')
    def test_sync_with_malformed_results(self, mock_sync_all):
        """Test sync execution with malformed results."""
        # Mock sync to return unexpected format
        mock_sync_all.return_value = "invalid_result_format"

        scheduler = SyncScheduler()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            # Should handle the error gracefully
            loop.run_until_complete(scheduler._run_scheduled_sync())
        finally:
            loop.close()

        # Should still record the result even with error
        assert len(scheduler.sync_results) == 1
        result = scheduler.sync_results[0]
        assert result["success"] is False


if __name__ == "__main__":
    # Run tests with pytest when script is executed directly
    pytest.main([__file__, "-v"])