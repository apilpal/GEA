#!/usr/bin/env python3
"""
Comprehensive End-to-End Tests for Student Profiles PWA
Tests the complete application flow from frontend to backend including:
- CRUD operations
- Search and filtering
- Chart visualizations
- Responsive design
- Accessibility features
- Error handling
- Performance validation
"""

import subprocess
import time
import requests
import signal
import os
import sys
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
import pytest
import coverage

class ApplicationRunner:
    """Manages starting and stopping the application for E2E tests"""

    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.cov = None

    def start_backend(self):
        """Start the FastAPI backend server with coverage"""
        print("Starting backend server with coverage...")

        # Load environment variables from backend/.env file
        backend_env = os.environ.copy()
        env_file_path = os.path.join(self.base_dir, "backend", ".env")
        if os.path.exists(env_file_path):
            from dotenv import load_dotenv
            load_dotenv(env_file_path)
            # Update backend_env with loaded environment variables
            for key, value in os.environ.items():
                backend_env[key] = value

        # Start coverage before importing/subprocess
        self.cov = coverage.Coverage(
            source=['backend'],
            omit=['*/venv/*', '*/__pycache__/*', '*/test_*'],
            data_file='../e2e_coverage/.coverage'
        )
        self.cov.start()

        # Seed users before starting server
        print("Seeding test users...")
        seed_process = subprocess.run(
            ["python", "seed_users.py"],
            cwd=os.path.join(self.base_dir, "backend"),
            capture_output=True,
            text=True,
            env=backend_env
        )
        if seed_process.returncode != 0:
            print(f"Seeding failed: {seed_process.stderr}")
        else:
            print("✓ Test users seeded")

        self.backend_process = subprocess.Popen(
            ["uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
            cwd=os.path.join(self.base_dir, "backend"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=backend_env
        )
        # Wait for server to start
        time.sleep(3)

    def start_frontend(self):
        """Start the frontend server"""
        print("Starting frontend server...")
        self.frontend_process = subprocess.Popen(
            ["python", "-m", "http.server", "5173"],
            cwd=os.path.join(self.base_dir, "frontend"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        # Wait for server to start
        time.sleep(2)

    def start_application(self):
        """Start both backend and frontend"""
        self.start_backend()
        self.start_frontend()

        # Verify servers are running
        try:
            # Check backend health
            response = requests.get("http://127.0.0.1:8000/api/health", timeout=5)
            assert response.status_code == 200
            print("✓ Backend server is running")

            # Check frontend is accessible (basic connectivity)
            response = requests.get("http://127.0.0.1:5173", timeout=5)
            assert response.status_code == 200
            print("✓ Frontend server is running")

        except Exception as e:
            self.stop_application()
            raise AssertionError(f"Failed to start application: {e}")

    def stop_application(self):
        """Stop both backend and frontend servers and save coverage"""
        print("Stopping application servers...")

        # Stop coverage and save report
        if self.cov:
            self.cov.stop()
            self.cov.save()
            self.cov.html_report(directory='../e2e_coverage/htmlcov')
            self.cov.xml_report(outfile='../e2e_coverage/coverage.xml')
            print("✓ Coverage report saved")

        if self.backend_process:
            try:
                self.backend_process.terminate()
                self.backend_process.wait(timeout=5)
                print("✓ Backend server stopped")
            except subprocess.TimeoutExpired:
                self.backend_process.kill()
                print("✓ Backend server force killed")

        if self.frontend_process:
            try:
                self.frontend_process.terminate()
                self.frontend_process.wait(timeout=5)
                print("✓ Frontend server stopped")
            except subprocess.TimeoutExpired:
                self.frontend_process.kill()
                print("✓ Frontend server force killed")

class TestE2EStudentCRUD:
    """Test comprehensive CRUD operations for students"""

    @pytest.fixture
    def setup_app_and_browser(self):
        """Setup application and browser for testing"""
        app_runner = ApplicationRunner()
        app_runner.start_application()

        # Setup Chrome options for headless testing
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")

        driver = webdriver.Chrome(options=chrome_options)

        yield app_runner, driver

        # Cleanup
        driver.quit()
        app_runner.stop_application()

    def test_create_student_e2e(self, setup_app_and_browser):
        """Test creating a new student through the UI"""
        app_runner, driver = setup_app_and_browser

        # Navigate to application
        driver.get("http://127.0.0.1:5173")

        # Wait for page to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "student-table"))
        )

        # Get initial student count
        total_count_element = driver.find_element(By.ID, "total-count")
        initial_count = int(total_count_element.text)

        # Click add student button
        add_button = driver.find_element(By.ID, "add-student-btn")
        add_button.click()

        # Note: Assuming modal/form opens, but since we don't have the actual modal
        # implementation details, we'll test via API directly for now
        # In a real scenario, we'd fill out the form and submit

        # Verify via API that we can create a student
        student_data = {
            "name": "E2E Test Student",
            "father_name": "Test Father",
            "class": "5",
            "mobile": "1234567890",
            "route": "TEST",
            "address": "Test Address",
            "fees": "1000"
        }

        response = requests.post("http://127.0.0.1:8000/api/students/", json=student_data)
        assert response.status_code == 200

        created_student = response.json()
        assert created_student["name"] == "E2E Test Student"

        # Verify the count increased in UI
        driver.refresh()
        WebDriverWait(driver, 10).until(
            lambda d: int(d.find_element(By.ID, "total-count").text) > initial_count
        )

        # Cleanup - delete the test student
        student_id = created_student["id"]
        delete_response = requests.delete(f"http://127.0.0.1:8000/api/students/{student_id}/")
        assert delete_response.status_code == 200

    def test_read_students_e2e(self, setup_app_and_browser):
        """Test reading/displaying students in the UI"""
        app_runner, driver = setup_app_and_browser

        driver.get("http://127.0.0.1:5173")

        # Wait for student table to load
        student_table = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "student-table"))
        )

        # Check that table has data
        rows = driver.find_elements(By.CLASS_NAME, "student-row")
        assert len(rows) > 0

        # Check that each row has required columns
        for row in rows[:3]:  # Test first 3 rows
            cells = row.find_elements(By.TAG_NAME, "td")
            assert len(cells) >= 10  # Student table has 10 columns

            # Check that name is not empty
            name_cell = cells[4]  # Name column
            assert name_cell.text.strip() != ""

    def test_update_student_e2e(self, setup_app_and_browser):
        """Test updating a student through the UI"""
        app_runner, driver = setup_app_and_browser

        # First create a test student
        student_data = {
            "name": "Update Test Student",
            "father_name": "Test Father",
            "class": "5",
            "mobile": "1111111111",
            "route": "TEST",
            "address": "Test Address"
        }

        create_response = requests.post("http://127.0.0.1:8000/api/students/", json=student_data)
        assert create_response.status_code == 200
        student = create_response.json()
        student_id = student["id"]

        # Navigate to UI
        driver.get("http://127.0.0.1:5173")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "student-table"))
        )

        # Look for the edit button in the student row
        # Note: This assumes the edit button is visible and clickable
        # In practice, you might need to scroll or locate the specific student row

        # For now, test update via API and verify UI reflects changes
        update_data = {
            "name": "Updated Test Student",
            "father_name": "Updated Father"
        }

        update_response = requests.put(f"http://127.0.0.1:8000/api/students/{student_id}/", json=update_data)
        assert update_response.status_code == 200

        # Refresh and verify change in UI
        driver.refresh()
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "student-table"))
        )

        # Check if updated student appears in the table
        page_source = driver.page_source
        assert "Updated Test Student" in page_source

        # Cleanup
        requests.delete(f"http://127.0.0.1:8000/api/students/{student_id}/")

    def test_delete_student_e2e(self, setup_app_and_browser):
        """Test deleting a student through the UI"""
        app_runner, driver = setup_app_and_browser

        # Create test student
        student_data = {
            "name": "Delete Test Student",
            "father_name": "Test Father",
            "class": "5"
        }

        create_response = requests.post("http://127.0.0.1:8000/api/students/", json=student_data)
        assert create_response.status_code == 200
        student = create_response.json()
        student_id = student["id"]

        driver.get("http://127.0.0.1:5173")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "student-table"))
        )

        # Get count before delete
        total_count_element = driver.find_element(By.ID, "total-count")
        count_before = int(total_count_element.text)

        # Delete via API (since we don't have modal details)
        delete_response = requests.delete(f"http://127.0.0.1:8000/api/students/{student_id}/")
        assert delete_response.status_code == 200

        # Refresh and verify count decreased
        driver.refresh()
        WebDriverWait(driver, 10).until(
            lambda d: int(d.find_element(By.ID, "total-count").text) < count_before
        )

class TestE2ESearchAndFilter:
    """Test search and filtering functionality"""

    @pytest.fixture
    def setup_app_and_browser(self):
        """Setup application and browser for testing"""
        app_runner = ApplicationRunner()
        app_runner.start_application()

        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")

        driver = webdriver.Chrome(options=chrome_options)

        yield app_runner, driver

        driver.quit()
        app_runner.stop_application()

    def test_search_students(self, setup_app_and_browser):
        """Test searching students by name"""
        app_runner, driver = setup_app_and_browser

        # Create test students with unique names
        test_students = [
            {"name": "SearchTest Alice", "father_name": "Father A", "class": "5", "mobile": "1111111111"},
            {"name": "SearchTest Bob", "father_name": "Father B", "class": "6", "mobile": "2222222222"},
            {"name": "Regular Student", "father_name": "Father C", "class": "7", "mobile": "3333333333"}
        ]

        created_ids = []
        for student_data in test_students:
            response = requests.post("http://127.0.0.1:8000/api/students/", json=student_data)
            assert response.status_code == 200
            created_ids.append(response.json()["id"])

        # Navigate to application
        driver.get("http://127.0.0.1:5173")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "search-input"))
        )

        # Search for "SearchTest"
        search_input = driver.find_element(By.ID, "search-input")
        search_input.clear()
        search_input.send_keys("SearchTest")

        # Wait for search results (debounced)
        time.sleep(0.5)

        # Verify only SearchTest students are shown
        rows = driver.find_elements(By.CLASS_NAME, "student-row")
        assert len(rows) >= 2

        for row in rows:
            cells = row.find_elements(By.TAG_NAME, "td")
            name_cell = cells[4]  # Name column
            assert "SearchTest" in name_cell.text

        # Clear search
        clear_button = driver.find_element(By.ID, "clear-search")
        clear_button.click()

        # Verify all students are shown again
        time.sleep(0.5)
        all_rows = driver.find_elements(By.CLASS_NAME, "student-row")
        assert len(all_rows) >= len(test_students)

        # Cleanup
        for student_id in created_ids:
            requests.delete(f"http://127.0.0.1:8000/api/students/{student_id}/")

    def test_sort_students(self, setup_app_and_browser):
        """Test sorting students by different columns"""
        app_runner, driver = setup_app_and_browser

        driver.get("http://127.0.0.1:5173")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "student-table"))
        )

        # Test sorting by name (click sortable header)
        name_header = driver.find_element(By.CSS_SELECTOR, "[data-column='name']")
        name_header.click()

        # Wait for sort to apply
        time.sleep(0.5)

        # Get first few student names
        rows = driver.find_elements(By.CLASS_NAME, "student-row")[:3]
        names = []
        for row in rows:
            cells = row.find_elements(By.TAG_NAME, "td")
            names.append(cells[4].text.lower())  # Name column

        # Verify names are in ascending order
        assert names == sorted(names)

        # Click again for descending order
        name_header.click()
        time.sleep(0.5)

        # Get names again
        rows = driver.find_elements(By.CLASS_NAME, "student-row")[:3]
        desc_names = []
        for row in rows:
            cells = row.find_elements(By.TAG_NAME, "td")
            desc_names.append(cells[4].text.lower())

        # Verify names are in descending order
        assert desc_names == sorted(desc_names, reverse=True)

class TestE2ECharts:
    """Test chart visualization functionality"""

    @pytest.fixture
    def setup_app_and_browser(self):
        """Setup application and browser for testing"""
        app_runner = ApplicationRunner()
        app_runner.start_application()

        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")

        driver = webdriver.Chrome(options=chrome_options)

        yield app_runner, driver

        driver.quit()
        app_runner.stop_application()

    def test_chart_components_load(self, setup_app_and_browser):
        """Test that chart components load and display data"""
        app_runner, driver = setup_app_and_browser

        driver.get("http://127.0.0.1:5173")

        # Wait for page to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )

        # Check if chart components exist (they might be loaded dynamically)
        # This is a basic check - in real implementation, we'd check for specific chart elements
        page_source = driver.page_source

        # Check if we have chart-related API endpoints working
        chart_endpoints = [
            "http://127.0.0.1:8000/api/charts/student-distribution/",
            "http://127.0.0.1:8000/api/charts/revenue-by-driver/",
            "http://127.0.0.1:8000/api/charts/revenue-by-class/"
        ]

        for endpoint in chart_endpoints:
            response = requests.get(endpoint)
            assert response.status_code == 200

            chart_data = response.json()
            assert "type" in chart_data
            assert "labels" in chart_data
            assert "values" in chart_data

    def test_chart_data_integrity(self, setup_app_and_browser):
        """Test that chart data matches actual student data"""
        app_runner, driver = setup_app_and_browser

        # Get student distribution chart data
        response = requests.get("http://127.0.0.1:8000/api/charts/student-distribution/")
        assert response.status_code == 200

        chart_data = response.json()
        assert chart_data["type"] == "bar"
        assert len(chart_data["labels"]) > 0
        assert len(chart_data["values"]) > 0
        assert len(chart_data["labels"]) == len(chart_data["values"])

        # Get actual student count by route from API
        students_response = requests.get("http://127.0.0.1:8000/api/students")
        assert students_response.status_code == 200

        students_data = students_response.json()
        actual_students = students_data["students"]

        # Calculate actual distribution
        actual_distribution = {}
        for student in actual_students:
            route = student.get("route", "Unknown")
            actual_distribution[route] = actual_distribution.get(route, 0) + 1

        # Chart values should match actual distribution
        chart_total = sum(chart_data["values"])
        actual_total = len(actual_students)
        assert chart_total == actual_total

class TestE2EAccessibility:
    """Test accessibility features and responsive design"""

    @pytest.fixture
    def setup_app_and_browser(self):
        """Setup application and browser for testing"""
        app_runner = ApplicationRunner()
        app_runner.start_application()

        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")

        driver = webdriver.Chrome(options=chrome_options)

        yield app_runner, driver

        driver.quit()
        app_runner.stop_application()

    def test_accessibility_features(self, setup_app_and_browser):
        """Test accessibility features like ARIA labels and keyboard navigation"""
        app_runner, driver = setup_app_and_browser

        driver.get("http://127.0.0.1:5173")

        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "student-table"))
        )

        # Check for ARIA labels on action buttons
        action_buttons = driver.find_elements(By.CLASS_NAME, "action-btn")

        for button in action_buttons:
            aria_label = button.get_attribute("aria-label")
            assert aria_label is not None and aria_label.strip() != ""

        # Test keyboard navigation (tab through focusable elements)
        body = driver.find_element(By.TAG_NAME, "body")

        # Send tab key multiple times
        for _ in range(5):
            body.send_keys(Keys.TAB)
            active_element = driver.execute_script("return document.activeElement")
            # Should be able to focus on interactive elements
            assert active_element is not None

    def test_responsive_design(self, setup_app_and_browser):
        """Test responsive design at different screen sizes"""
        app_runner, driver = setup_app_and_browser

        # Test different screen sizes
        screen_sizes = [
            (1920, 1080),  # Desktop
            (768, 1024),   # Tablet
            (375, 667)     # Mobile
        ]

        for width, height in screen_sizes:
            driver.set_window_size(width, height)
            driver.get("http://127.0.0.1:5173")

            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "student-table"))
            )

            # Check that table is visible and functional at this size
            student_table = driver.find_element(By.TAG_NAME, "student-table")
            assert student_table.is_displayed()

            # Check that essential elements are visible
            total_count = driver.find_element(By.ID, "total-count")
            assert total_count.is_displayed()

            # Search input should be accessible
            search_input = driver.find_element(By.ID, "search-input")
            assert search_input.is_displayed()

class TestE2EErrorHandling:
    """Test error handling and recovery scenarios"""

    @pytest.fixture
    def setup_app_and_browser(self):
        """Setup application and browser for testing"""
        app_runner = ApplicationRunner()
        app_runner.start_application()

        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")

        driver = webdriver.Chrome(options=chrome_options)

        yield app_runner, driver

        driver.quit()
        app_runner.stop_application()

    def test_api_error_handling(self, setup_app_and_browser):
        """Test API error handling in the frontend"""
        app_runner, driver = setup_app_and_browser

        driver.get("http://127.0.0.1:5173")

        # Test invalid API calls
        invalid_endpoints = [
            "http://127.0.0.1:8000/api/students/999999",  # Non-existent student
            "http://127.0.0.1:8000/api/invalid-endpoint",  # Invalid endpoint
        ]

        for endpoint in invalid_endpoints:
            response = requests.get(endpoint)
            # Should return appropriate error status
            assert response.status_code in [404, 422, 500]

    def test_network_error_recovery(self, setup_app_and_browser):
        """Test application behavior when network is temporarily unavailable"""
        app_runner, driver = setup_app_and_browser

        driver.get("http://127.0.0.1:5173")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "student-table"))
        )

        # Initially should load data
        initial_rows = len(driver.find_elements(By.CLASS_NAME, "student-row"))
        assert initial_rows > 0

        # Simulate network issues by stopping backend temporarily
        app_runner.backend_process.terminate()
        time.sleep(1)

        # Try to perform an action that requires API (refresh the page)
        driver.refresh()

        # Page should still be accessible (static content)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )

        # Restart backend
        app_runner.start_backend()
        time.sleep(3)

        # Refresh and verify functionality is restored
        driver.refresh()
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "student-table"))
        )

        # Should be able to load data again
        restored_rows = len(driver.find_elements(By.CLASS_NAME, "student-row"))
        assert restored_rows > 0

class TestE2EPerformance:
    """Test performance and loading states"""

    @pytest.fixture
    def setup_app_and_browser(self):
        """Setup application and browser for testing"""
        app_runner = ApplicationRunner()
        app_runner.start_application()

        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")

        driver = webdriver.Chrome(options=chrome_options)

        yield app_runner, driver

        driver.quit()
        app_runner.stop_application()

    def test_page_load_performance(self, setup_app_and_browser):
        """Test page load times and performance"""
        app_runner, driver = setup_app_and_browser

        start_time = time.time()
        driver.get("http://127.0.0.1:5173")
        end_time = time.time()

        load_time = end_time - start_time
        print(f"Page load time: {load_time:.2f}s")

        # Should load within reasonable time (adjust threshold as needed)
        assert load_time < 10.0, f"Page took too long to load: {load_time}s"

        # Wait for content to be interactive
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "student-table"))
        )

    def test_api_response_times(self, setup_app_and_browser):
        """Test API response times"""
        app_runner, driver = setup_app_and_browser

        # Test various API endpoints
        endpoints = [
            "http://127.0.0.1:8000/api/health",
            "http://127.0.0.1:8000/api/students/",
            "http://127.0.0.1:8000/api/charts/student-distribution/"
        ]

        for endpoint in endpoints:
            start_time = time.time()
            response = requests.get(endpoint, timeout=10)
            end_time = time.time()

            response_time = end_time - start_time
            print(f"{endpoint}: {response_time:.3f}s")

            assert response.status_code == 200
            assert response_time < 2.0, f"API {endpoint} too slow: {response_time}s"

    def test_ui_interaction_performance(self, setup_app_and_browser):
        """Test UI interaction performance"""
        app_runner, driver = setup_app_and_browser

        driver.get("http://127.0.0.1:5173")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "search-input"))
        )

        # Test search performance
        search_input = driver.find_element(By.ID, "search-input")

        start_time = time.time()
        search_input.send_keys("test")
        time.sleep(0.5)  # Wait for debounced search
        end_time = time.time()

        search_time = end_time - start_time
        print(f"Search response time: {search_time:.2f}s")

        # Search should be reasonably fast
        assert search_time < 2.0, f"Search took too long: {search_time}s"

class TestE2EAuthentication:
    """Test comprehensive authentication and authorization functionality"""

    @pytest.fixture
    def setup_app_and_browser(self):
        """Setup application and browser for authentication testing"""
        app_runner = ApplicationRunner()
        app_runner.start_application()

        # Setup Chrome options for headless testing
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")

        driver = webdriver.Chrome(options=chrome_options)

        yield app_runner, driver

        driver.quit()
        app_runner.stop_application()

    def test_api_level_login_authentication(self, setup_app_and_browser):
        """Test API-level user login functionality"""
        app_runner, driver = setup_app_and_browser

        # Test login with dev credentials
        login_data = {
            "username_or_email": "dev_user",
            "password": "dev_password_123"
        }

        response = requests.post("http://127.0.0.1:8000/api/auth/login", json=login_data)

        # Should succeed with 200 status
        assert response.status_code == 200

        response_data = response.json()
        assert "access_token" in response_data
        assert response_data["access_token"] != ""
        assert "user" in response_data
        assert response_data["user"]["username"] == "dev_user"

        # Check that cookies are set (refresh token in HttpOnly cookie)
        cookies = response.cookies
        assert len(cookies) > 0

    def test_api_level_logout_authentication(self, setup_app_and_browser):
        """Test API-level user logout functionality"""
        app_runner, driver = setup_app_and_browser

        # First login to get authenticated
        login_data = {
            "username_or_email": "dev_user",
            "password": "dev_password_123"
        }

        login_response = requests.post("http://127.0.0.1:8000/api/auth/login", json=login_data)
        assert login_response.status_code == 200

        # Get access token for authenticated requests
        access_token = login_response.json()["access_token"]

        # Test logout
        logout_response = requests.post("http://127.0.0.1:8000/api/auth/logout",
                                      cookies=login_response.cookies)

        assert logout_response.status_code == 200

        logout_data = logout_response.json()
        assert "message" in logout_data
        assert "Successfully logged out" in logout_data["message"]

    def test_api_level_token_validation(self, setup_app_and_browser):
        """Test API-level token validation functionality"""
        app_runner, driver = setup_app_and_browser

        # Login first
        login_data = {
            "username_or_email": "dev_user",
            "password": "dev_password_123"
        }

        login_response = requests.post("http://127.0.0.1:8000/api/auth/login", json=login_data)
        assert login_response.status_code == 200

        access_token = login_response.json()["access_token"]

        # Test token validation endpoint
        headers = {"Authorization": f"Bearer {access_token}"}
        validate_response = requests.get("http://127.0.0.1:8000/api/auth/token/validate",
                                       headers=headers)

        assert validate_response.status_code == 200

        validate_data = validate_response.json()
        assert validate_data["valid"] == True
        assert validate_data["user"] == "dev_user"
        assert "role" in validate_data
        assert "expires_in_minutes" in validate_data

    def test_authentication_protected_endpoints(self, setup_app_and_browser):
        """Test authentication-protected API endpoints"""
        app_runner, driver = setup_app_and_browser

        # Test accessing protected endpoints without authentication
        protected_endpoints = [
            "http://127.0.0.1:8000/api/auth/me",
            "http://127.0.0.1:8000/api/students/",
            "http://127.0.0.1:8000/api/charts/student-distribution/"
        ]

        for endpoint in protected_endpoints:
            response = requests.get(endpoint)
            # Should return 401 or 403 for unauthenticated requests
            assert response.status_code in [401, 403]

        # Test accessing protected endpoints with valid authentication
        login_data = {
            "username_or_email": "dev_user",
            "password": "dev_password_123"
        }

        login_response = requests.post("http://127.0.0.1:8000/api/auth/login", json=login_data)
        assert login_response.status_code == 200

        access_token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        # Now test protected endpoints with valid token
        for endpoint in protected_endpoints:
            response = requests.get(endpoint, headers=headers)
            # Should succeed with valid authentication
            assert response.status_code in [200, 201]

    def test_guest_user_workflow_api(self, setup_app_and_browser):
        """Test guest user workflow from API perspective"""
        app_runner, driver = setup_app_and_browser

        # Test creating a guest user
        guest_response = requests.post("http://127.0.0.1:8000/api/auth/guest", json={})

        assert guest_response.status_code == 200

        guest_data = guest_response.json()
        assert "access_token" in guest_data
        assert "user" in guest_data
        assert guest_data["user"]["is_guest"] == True
        assert "guest_id" in guest_data

        # Test guest dashboard access
        guest_token = guest_data["access_token"]
        headers = {"Authorization": f"Bearer {guest_token}"}

        dashboard_response = requests.get("http://127.0.0.1:8000/api/auth/guest/dashboard",
                                        headers=headers)

        assert dashboard_response.status_code == 200

        dashboard_data = dashboard_response.json()
        assert dashboard_data["guest_access"] == True
        assert "permissions" in dashboard_data
        assert "summary" in dashboard_data

    def test_token_refresh_and_rotation_api(self, setup_app_and_browser):
        """Test token refresh and rotation functionality"""
        app_runner, driver = setup_app_and_browser

        # Login first
        login_data = {
            "username_or_email": "dev_user",
            "password": "dev_password_123"
        }

        login_response = requests.post("http://127.0.0.1:8000/api/auth/login", json=login_data)
        assert login_response.status_code == 200

        original_access_token = login_response.json()["access_token"]

        # Test token refresh
        refresh_response = requests.post("http://127.0.0.1:8000/api/auth/token/refresh",
                                       cookies=login_response.cookies)

        assert refresh_response.status_code == 200

        refresh_data = refresh_response.json()
        assert "access_token" in refresh_data
        new_access_token = refresh_data["access_token"]

        # New token should be different (rotation)
        assert new_access_token != original_access_token

        # Verify new token works
        headers = {"Authorization": f"Bearer {new_access_token}"}
        validate_response = requests.get("http://127.0.0.1:8000/api/auth/token/validate",
                                       headers=headers)

        assert validate_response.status_code == 200

    def test_authentication_error_scenarios(self, setup_app_and_browser):
        """Test authentication error scenarios"""
        app_runner, driver = setup_app_and_browser

        # Test invalid credentials
        invalid_login_data = {
            "username_or_email": "invalid_user",
            "password": "wrong_password"
        }

        invalid_response = requests.post("http://127.0.0.1:8000/api/auth/login", json=invalid_login_data)
        assert invalid_response.status_code == 401

        # Test expired token scenario (simulate with invalid token)
        headers = {"Authorization": "Bearer invalid_expired_token"}
        expired_response = requests.get("http://127.0.0.1:8000/api/auth/me", headers=headers)
        assert expired_response.status_code in [401, 403]

        # Test missing token
        no_token_response = requests.get("http://127.0.0.1:8000/api/auth/me")
        assert no_token_response.status_code in [401, 403]

    def test_role_based_access_control_api(self, setup_app_and_browser):
        """Test role-based access control for different user types"""
        app_runner, driver = setup_app_and_browser

        # Test guest user access restrictions
        guest_response = requests.post("http://127.0.0.1:8000/api/auth/guest", json={})
        assert guest_response.status_code == 200

        guest_token = guest_response.json()["access_token"]
        guest_headers = {"Authorization": f"Bearer {guest_token}"}

        # Guest users should not access admin endpoints
        admin_response = requests.post("http://127.0.0.1:8000/api/auth/register",
                                     json={
                                         "username": "test_user",
                                         "email": "test@example.com",
                                         "password": "password123",
                                         "role": "teacher"
                                     },
                                     headers=guest_headers)

        # Should be forbidden for guest users
        assert admin_response.status_code == 403

        # Test authenticated user access to their allowed endpoints
        login_data = {
            "username_or_email": "dev_user",
            "password": "dev_password_123"
        }

        login_response = requests.post("http://127.0.0.1:8000/api/auth/login", json=login_data)
        assert login_response.status_code == 200

        access_token = login_response.json()["access_token"]
        user_headers = {"Authorization": f"Bearer {access_token}"}

        # Authenticated users should access their profile
        profile_response = requests.get("http://127.0.0.1:8000/api/auth/me", headers=user_headers)
        assert profile_response.status_code == 200

        # Test different user roles if available (admin, teacher, student)
        # This would require multiple user accounts with different roles
        # For now, we test that role information is returned correctly
        profile_data = profile_response.json()
        assert "role" in profile_data
        assert profile_data["role"] in ["admin", "teacher", "driver", "student", "guest"]

    def test_guest_user_conversion_workflow(self, setup_app_and_browser):
        """Test complete guest user to registered user conversion workflow"""
        app_runner, driver = setup_app_and_browser

        # Create guest user
        guest_response = requests.post("http://127.0.0.1:8000/api/auth/guest", json={})
        assert guest_response.status_code == 200

        guest_data = guest_response.json()
        guest_id = guest_data["guest_id"]

        # Convert guest to registered user
        conversion_data = {
            "guest_id": guest_id,
            "username": "converted_user",
            "email": "converted@example.com",
            "password": "password123"
        }

        conversion_response = requests.post("http://127.0.0.1:8000/api/auth/convert-guest",
                                          json=conversion_data)

        assert conversion_response.status_code == 200

        conversion_result = conversion_response.json()
        assert conversion_result["username"] == "converted_user"
        assert conversion_result["email"] == "converted@example.com"
        assert conversion_result["is_active"] == True

        # Verify converted user can login with new credentials
        new_login_data = {
            "username_or_email": "converted_user",
            "password": "password123"
        }

        new_login_response = requests.post("http://127.0.0.1:8000/api/auth/login", json=new_login_data)
        assert new_login_response.status_code == 200

        # Cleanup - logout the converted user
        logout_response = requests.post("http://127.0.0.1:8000/api/auth/logout",
                                      cookies=new_login_response.cookies)
        assert logout_response.status_code == 200

    def test_token_blacklist_functionality(self, setup_app_and_browser):
        """Test token blacklisting and revocation"""
        app_runner, driver = setup_app_and_browser

        # Login to get tokens
        login_data = {
            "username_or_email": "dev_user",
            "password": "dev_password_123"
        }

        login_response = requests.post("http://127.0.0.1:8000/api/auth/login", json=login_data)
        assert login_response.status_code == 200

        access_token = login_response.json()["access_token"]

        # Test token revocation
        revoke_response = requests.post("http://127.0.0.1:8000/api/auth/token/revoke",
                                      cookies=login_response.cookies)

        assert revoke_response.status_code == 200

        # After revocation, the token should no longer work
        headers = {"Authorization": f"Bearer {access_token}"}
        protected_response = requests.get("http://127.0.0.1:8000/api/auth/me", headers=headers)

        # Should fail with revoked token
        assert protected_response.status_code in [401, 403]

    def test_enhanced_login_with_device_fingerprinting(self, setup_app_and_browser):
        """Test enhanced login with device fingerprinting and security features"""
        app_runner, driver = setup_app_and_browser

        # Test enhanced login endpoint
        enhanced_login_data = {
            "username_or_email": "dev_user",
            "password": "dev_password_123"
        }

        enhanced_response = requests.post("http://127.0.0.1:8000/api/auth/login-enhanced",
                                        json=enhanced_login_data)

        assert enhanced_response.status_code == 200

        enhanced_data = enhanced_response.json()
        assert "access_token" in enhanced_data
        assert "user" in enhanced_data

        # Enhanced login should provide the same token structure
        assert enhanced_data["access_token"] != ""
        assert enhanced_data["user"]["username"] == "dev_user"

    def test_rate_limiting_on_authentication(self, setup_app_and_browser):
        """Test rate limiting on authentication endpoints"""
        app_runner, driver = setup_app_and_browser

        # Test multiple rapid login attempts (rate limiting)
        login_data = {
            "username_or_email": "dev_user",
            "password": "wrong_password"  # Wrong password to trigger rate limiting
        }

        responses = []
        # Make multiple rapid requests
        for i in range(5):
            response = requests.post("http://127.0.0.1:8000/api/auth/login", json=login_data)
            responses.append(response.status_code)

        # Should eventually return 429 (Too Many Requests) due to rate limiting
        assert 429 in responses

    def test_cookie_minimization_strategy(self, setup_app_and_browser):
        """Test cookie minimization strategy implementation"""
        app_runner, driver = setup_app_and_browser

        # Login and check cookie behavior
        login_data = {
            "username_or_email": "dev_user",
            "password": "dev_password_123"
        }

        login_response = requests.post("http://127.0.0.1:8000/api/auth/login", json=login_data)

        # According to cookie minimization strategy:
        # - Access token should be in response body
        # - Refresh token should be in HttpOnly cookie only

        assert login_response.status_code == 200

        response_data = login_response.json()
        assert "access_token" in response_data  # Access token in response body

        # Check that we have cookies set (refresh token in HttpOnly cookie)
        cookies = login_response.cookies
        assert len(cookies) > 0

        # Cookies should be HttpOnly (we can't directly verify this, but we can check they're set)
        cookie_names = [cookie.name for cookie in cookies]
        assert any("refresh" in name.lower() for name in cookie_names)

    def test_authentication_integration_with_existing_api(self, setup_app_and_browser):
        """Test authentication integration with existing API endpoints"""
        app_runner, driver = setup_app_and_browser

        # Test that existing API endpoints require authentication
        existing_endpoints = [
            "http://127.0.0.1:8000/api/students/",
            "http://127.0.0.1:8000/api/drivers/",
            "http://127.0.0.1:8000/api/reports/",
            "http://127.0.0.1:8000/api/charts/"
        ]

        # Without authentication, should return 401/403
        for endpoint in existing_endpoints:
            response = requests.get(endpoint)
            assert response.status_code in [401, 403]

        # With authentication, should work
        login_data = {
            "username_or_email": "dev_user",
            "password": "dev_password_123"
        }

        login_response = requests.post("http://127.0.0.1:8000/api/auth/login", json=login_data)
        assert login_response.status_code == 200

        access_token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        # Test that authenticated requests work with existing endpoints
        for endpoint in existing_endpoints:
            response = requests.get(endpoint, headers=headers)
            # Should succeed or return valid data
            assert response.status_code in [200, 201, 404]  # 404 is acceptable for missing data

# Run basic E2E test if script is executed directly
if __name__ == "__main__":
    print("Running E2E tests...")
    pytest.main([__file__, "-v"])