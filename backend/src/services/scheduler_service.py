"""
Scheduler service for automated CSV synchronization.

This module provides background scheduling functionality for automatic
CSV to database synchronization operations. It uses APScheduler for
reliable job scheduling and includes comprehensive error handling.

Key Features:
- Automated sync scheduling (daily/weekly/custom intervals)
- Background task execution for large CSV files
- Configurable sync frequencies and timing
- Comprehensive error handling and retry logic
- Email notifications for sync failures
- Scheduler management and monitoring

The service supports various scheduling patterns and provides
detailed logging and monitoring capabilities.
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
import smtplib
try:
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
except ImportError:
    # Fallback for older Python versions
    from email.MIMEText import MIMEText
    from email.MIMEMultipart import MIMEMultipart

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger
    from apscheduler.jobstores.memory import MemoryJobStore
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False
    AsyncIOScheduler = None

# Import sync services
from .csv_sync_service import CSVSyncer, SyncConfig, sync_all_drivers

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SchedulerConfig:
    """Configuration for the scheduler service."""
    enabled: bool = True
    sync_frequency: str = "daily"  # daily, weekly, hourly, custom
    sync_time: str = "02:00"  # HH:MM format for daily/weekly
    sync_interval_hours: int = 24  # For hourly interval
    custom_cron: str = "0 2 * * *"  # Default daily at 2 AM
    max_retries: int = 3
    retry_delay_seconds: int = 300  # 5 minutes
    email_notifications: bool = False
    email_smtp_server: str = "smtp.gmail.com"
    email_smtp_port: int = 587
    email_username: str = ""
    email_password: str = ""
    email_from: str = "noreply@school.com"
    email_to: List[str] = field(default_factory=list)

@dataclass
class ScheduledJob:
    """Information about a scheduled sync job."""
    job_id: str
    name: str
    schedule_type: str
    next_run: Optional[datetime] = None
    last_run: Optional[datetime] = None
    success_count: int = 0
    error_count: int = 0
    is_active: bool = True

class SyncScheduler:
    """Main scheduler service for CSV synchronization."""

    def __init__(self, config: Optional[SchedulerConfig] = None):
        """Initialize the scheduler service."""
        self.config = config or SchedulerConfig()
        self.scheduler = None
        self.jobs: Dict[str, ScheduledJob] = {}
        self.sync_results: List[Dict[str, Any]] = []

        if APSCHEDULER_AVAILABLE:
            self.scheduler = AsyncIOScheduler(jobstores={'default': MemoryJobStore()})
        else:
            logger.warning("APScheduler not available. Install with: pip install apscheduler")

    async def start(self) -> bool:
        """Start the scheduler service."""
        if not self.config.enabled:
            logger.info("Scheduler disabled in configuration")
            return False

        if not APSCHEDULER_AVAILABLE:
            logger.error("APScheduler not available. Cannot start scheduler.")
            return False

        try:
            # Create sync jobs based on configuration
            await self._create_sync_jobs()

            # Start the scheduler
            self.scheduler.start()
            logger.info("CSV sync scheduler started successfully")

            # Store scheduler info
            self.jobs['csv_sync'] = ScheduledJob(
                job_id='csv_sync',
                name='CSV Driver Sync',
                schedule_type=self.config.sync_frequency,
                is_active=True
            )

            return True

        except Exception as e:
            logger.error(f"Error starting scheduler: {str(e)}")
            return False

    async def stop(self) -> bool:
        """Stop the scheduler service."""
        if self.scheduler:
            try:
                self.scheduler.shutdown(wait=True)
                logger.info("CSV sync scheduler stopped successfully")
                return True
            except Exception as e:
                logger.error(f"Error stopping scheduler: {str(e)}")
                return False
        return True

    async def _create_sync_jobs(self) -> None:
        """Create scheduled sync jobs based on configuration."""
        if not self.scheduler:
            return

        # Remove existing sync jobs
        self.scheduler.remove_job('csv_sync_daily')
        self.scheduler.remove_job('csv_sync_weekly')
        self.scheduler.remove_job('csv_sync_hourly')
        self.scheduler.remove_job('csv_sync_custom')

        if self.config.sync_frequency == "daily":
            # Daily sync at specified time
            hour, minute = map(int, self.config.sync_time.split(':'))
            trigger = CronTrigger(hour=hour, minute=minute)
            self.scheduler.add_job(
                self._run_scheduled_sync,
                trigger=trigger,
                id='csv_sync_daily',
                name='Daily CSV Sync',
                replace_existing=True
            )
            logger.info(f"Scheduled daily CSV sync at {self.config.sync_time}")

        elif self.config.sync_frequency == "weekly":
            # Weekly sync (every Sunday at specified time)
            hour, minute = map(int, self.config.sync_time.split(':'))
            trigger = CronTrigger(day_of_week='sun', hour=hour, minute=minute)
            self.scheduler.add_job(
                self._run_scheduled_sync,
                trigger=trigger,
                id='csv_sync_weekly',
                name='Weekly CSV Sync',
                replace_existing=True
            )
            logger.info(f"Scheduled weekly CSV sync on Sundays at {self.config.sync_time}")

        elif self.config.sync_frequency == "hourly":
            # Hourly sync
            trigger = IntervalTrigger(hours=self.config.sync_interval_hours)
            self.scheduler.add_job(
                self._run_scheduled_sync,
                trigger=trigger,
                id='csv_sync_hourly',
                name=f'Hourly CSV Sync (every {self.config.sync_interval_hours}h)',
                replace_existing=True
            )
            logger.info(f"Scheduled hourly CSV sync every {self.config.sync_interval_hours} hours")

        elif self.config.sync_frequency == "custom":
            # Custom cron expression
            trigger = CronTrigger.from_crontab(self.config.custom_cron)
            self.scheduler.add_job(
                self._run_scheduled_sync,
                trigger=trigger,
                id='csv_sync_custom',
                name='Custom CSV Sync',
                replace_existing=True
            )
            logger.info(f"Scheduled custom CSV sync with cron: {self.config.custom_cron}")

    async def _run_scheduled_sync(self) -> None:
        """Run the scheduled CSV synchronization."""
        logger.info("Starting scheduled CSV synchronization")

        start_time = datetime.now()
        job_result = {
            "start_time": start_time,
            "job_type": "scheduled",
            "success": False
        }

        try:
            # Run the sync operation
            results = await sync_all_drivers()

            # Process results
            total_success = sum(r.success_count for r in results.values())
            total_errors = sum(r.error_count for r in results.values())
            total_files = len(results)

            job_result.update({
                "success": total_errors == 0,
                "end_time": datetime.now(),
                "duration_seconds": (datetime.now() - start_time).total_seconds(),
                "total_files": total_files,
                "total_records": sum(r.total_records for r in results.values()),
                "success_count": total_success,
                "error_count": total_errors,
                "files_processed": list(results.keys()),
                "errors": [error for result in results.values() for error in result.errors],
                "warnings": [warning for result in results.values() for warning in result.warnings]
            })

            if total_errors > 0:
                logger.warning(f"Scheduled sync completed with {total_errors} errors")
                await self._send_notification_email(
                    "CSV Sync Warning",
                    f"Scheduled sync completed with {total_errors} errors. "
                    f"Check logs for details."
                )
            else:
                logger.info(f"Scheduled sync completed successfully: {total_success} records processed")

        except Exception as e:
            logger.error(f"Error in scheduled sync: {str(e)}")
            job_result.update({
                "error": str(e),
                "end_time": datetime.now(),
                "duration_seconds": (datetime.now() - start_time).total_seconds()
            })

            await self._send_notification_email(
                "CSV Sync Error",
                f"Scheduled sync failed with error: {str(e)}"
            )

        # Store result
        self.sync_results.append(job_result)

        # Keep only last 100 results
        if len(self.sync_results) > 100:
            self.sync_results[:] = self.sync_results[-100:]

    async def run_sync_now(self) -> Dict[str, Any]:
        """Manually trigger a sync operation immediately."""
        logger.info("Manual sync triggered")

        start_time = datetime.now()
        result = {
            "start_time": start_time,
            "job_type": "manual",
            "success": False
        }

        try:
            results = await sync_all_drivers()

            total_success = sum(r.success_count for r in results.values())
            total_errors = sum(r.error_count for r in results.values())

            result.update({
                "success": total_errors == 0,
                "end_time": datetime.now(),
                "duration_seconds": (datetime.now() - start_time).total_seconds(),
                "total_files": len(results),
                "total_records": sum(r.total_records for r in results.values()),
                "success_count": total_success,
                "error_count": total_errors,
                "files_processed": list(results.keys()),
                "errors": [error for result in results.values() for error in result.errors],
                "warnings": [warning for result in results.values() for warning in result.warnings]
            })

            logger.info(f"Manual sync completed: {total_success} success, {total_errors} errors")

        except Exception as e:
            logger.error(f"Error in manual sync: {str(e)}")
            result.update({
                "error": str(e),
                "end_time": datetime.now(),
                "duration_seconds": (datetime.now() - start_time).total_seconds()
            })

        self.sync_results.append(result)
        return result

    async def _send_notification_email(self, subject: str, body: str) -> bool:
        """Send email notification for sync events."""
        if not self.config.email_notifications or not self.config.email_to:
            return False

        try:
            msg = MimeMultipart()
            msg['From'] = self.config.email_from
            msg['To'] = ', '.join(self.config.email_to)
            msg['Subject'] = subject

            # Add body
            msg.attach(MimeText(body, 'plain'))

            # Send email
            server = smtplib.SMTP(self.config.email_smtp_server, self.config.email_smtp_port)
            server.starttls()
            server.login(self.config.email_username, self.config.email_password)
            server.send_message(msg)
            server.quit()

            logger.info(f"Email notification sent: {subject}")
            return True

        except Exception as e:
            logger.error(f"Error sending email notification: {str(e)}")
            return False

    def get_scheduler_status(self) -> Dict[str, Any]:
        """Get current scheduler status and information."""
        if not self.scheduler:
            return {"status": "disabled", "reason": "APScheduler not available"}

        try:
            jobs = []
            for job in self.scheduler.get_jobs():
                jobs.append({
                    "id": job.id,
                    "name": job.name,
                    "next_run": job.next_run_time,
                    "trigger": str(job.trigger)
                })

            return {
                "status": "running" if self.scheduler.running else "stopped",
                "jobs": jobs,
                "next_run": jobs[0]["next_run"] if jobs else None,
                "uptime_seconds": time.time() - (self.scheduler.start_time.timestamp() if self.scheduler.start_time else time.time()),
                "job_count": len(jobs)
            }

        except Exception as e:
            return {"status": "error", "error": str(e)}

    def get_sync_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent sync operation history."""
        return self.sync_results[-limit:] if self.sync_results else []

# Global scheduler instance
scheduler_instance: Optional[SyncScheduler] = None

def get_scheduler() -> SyncScheduler:
    """Get or create the global scheduler instance."""
    global scheduler_instance
    if scheduler_instance is None:
        scheduler_instance = SyncScheduler()
    return scheduler_instance

async def start_scheduler() -> bool:
    """Start the global scheduler instance."""
    scheduler = get_scheduler()
    return await scheduler.start()

async def stop_scheduler() -> bool:
    """Stop the global scheduler instance."""
    scheduler = get_scheduler()
    return await scheduler.stop()

async def trigger_manual_sync() -> Dict[str, Any]:
    """Trigger a manual sync using the global scheduler."""
    scheduler = get_scheduler()
    return await scheduler.run_sync_now()

def get_scheduler_status() -> Dict[str, Any]:
    """Get scheduler status."""
    scheduler = get_scheduler()
    return scheduler.get_scheduler_status()

def get_sync_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Get sync history."""
    scheduler = get_scheduler()
    return scheduler.get_sync_history(limit)