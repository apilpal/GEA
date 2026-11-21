#!/usr/bin/env python3
"""
Login Flow End-to-End Test
Tests the complete login flow by running the frontend application and performing
login operations with valid and invalid credentials.
"""

import time
import requests
import subprocess
import signal
import sys
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys

class LoginE2ETest:
    """Test the login flow end-to-end"""

    def __init__(self):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.frontend_process = None
        self.backend_url = "http://127.0.0.1:8000"
        self.frontend_url = "http://127.0.0.1:5173"

    def start_frontend(self):
        """Start the frontend server"""
        print("Building frontend...")
        frontend_dir = os.path.join(self.base_dir, "frontend")
        subprocess.run(["npm", "run", "build"], cwd=frontend_dir, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("✓ Frontend build completed")

        print("Starting frontend server...")
        self.frontend_process = subprocess.Popen(
            ["python", "-m", "http.server", "3005", "--bind", "127.0.0.1"],
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        time.sleep(2)
        print("✓ Frontend server started on port 3005")

    def verify_backend_running(self):
        """Verify backend is running"""
        try:
            response = requests.get(f"{self.backend_url}/api/health", timeout=5)
            if response.status_code == 200:
                print("✓ Backend server is running")
                return True
            else:
                print(f"❌ Backend server returned status {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Backend server not accessible: {e}")
            return False

    def setup_browser(self):
        """Setup Chrome browser for testing"""
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument(f"--user-data-dir=/tmp/chrome_test_{os.getpid()}")
        chrome_options.binary_location = "/opt/google/chrome/google-chrome"

        driver = webdriver.Chrome(options=chrome_options)
        driver.implicitly_wait(10)
        return driver

    def verify_login_form_present(self, driver):
        """Verify login form is displayed"""
        try:
            login_component = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "login-component"))
            )
            print("✓ Login component is present")
            return True
        except Exception as e:
            print(f"❌ Login component not found: {e}")
            return False

    def test_valid_login(self, driver):
        """Test login with valid credentials"""
        print("\n--- Testing Valid Login ---")

        try:
            # Clear any existing cookies
            driver.delete_all_cookies()

            # Navigate to app
            driver.get(self.frontend_url)
            time.sleep(2)

            if not self.verify_login_form_present(driver):
                return False

            # Find form elements within shadow DOM
            login_component = driver.find_element(By.TAG_NAME, "login-component")
            shadow_root = driver.execute_script("return arguments[0].shadowRoot", login_component)

            username_input = shadow_root.find_element(By.ID, "username")
            password_input = shadow_root.find_element(By.ID, "password")
            submit_btn = shadow_root.find_element(By.ID, "submit-btn")

            # Enter valid credentials
            username_input.clear()
            username_input.send_keys("admin")
            password_input.clear()
            password_input.send_keys("admin123")

            # Submit form
            submit_btn.click()

            # Wait for login to complete - should redirect to main app
            WebDriverWait(driver, 15).until(
                lambda d: "main-app" in d.page_source and d.find_element(By.ID, "main-app").get_attribute("style") == ""
            )

            # Check if main app is visible
            main_app = driver.find_element(By.ID, "main-app")
            if "display: none" not in main_app.get_attribute("style"):
                print("✓ Valid login successful - main app displayed")
                return True
            else:
                print("❌ Valid login failed - main app not displayed")
                return False

        except Exception as e:
            print(f"❌ Valid login test failed: {e}")
            return False

    def test_invalid_login(self, driver):
        """Test login with invalid credentials"""
        print("\n--- Testing Invalid Login ---")

        try:
            # Clear cookies and refresh
            driver.delete_all_cookies()
            driver.refresh()
            time.sleep(2)

            if not self.verify_login_form_present(driver):
                return False

            # Find form elements within shadow DOM
            login_component = driver.find_element(By.TAG_NAME, "login-component")
            shadow_root = driver.execute_script("return arguments[0].shadowRoot", login_component)

            username_input = shadow_root.find_element(By.ID, "username")
            password_input = shadow_root.find_element(By.ID, "password")
            submit_btn = shadow_root.find_element(By.ID, "submit-btn")

            # Enter invalid credentials
            username_input.clear()
            username_input.send_keys("invaliduser")
            password_input.clear()
            password_input.send_keys("wrongpass")

            # Submit form
            submit_btn.click()
            time.sleep(2)

            # Check for error message within shadow DOM
            login_component = driver.find_element(By.TAG_NAME, "login-component")
            shadow_root = driver.execute_script("return arguments[0].shadowRoot", login_component)
            error_div = shadow_root.find_element(By.ID, "error-message")
            if "show" in error_div.get_attribute("class"):
                error_text = error_div.text.strip()
                if error_text:
                    print(f"✓ Invalid login correctly showed error: '{error_text}'")
                    return True
                else:
                    print("❌ Invalid login error message is empty")
                    return False
            else:
                print("❌ Invalid login did not show error message")
                return False

        except Exception as e:
            print(f"❌ Invalid login test failed: {e}")
            return False

    def test_empty_credentials(self, driver):
        """Test login with empty credentials"""
        print("\n--- Testing Empty Credentials ---")

        try:
            driver.delete_all_cookies()
            driver.refresh()
            time.sleep(2)

            if not self.verify_login_form_present(driver):
                return False

            # Find form elements within shadow DOM
            login_component = driver.find_element(By.TAG_NAME, "login-component")
            shadow_root = driver.execute_script("return arguments[0].shadowRoot", login_component)

            username_input = shadow_root.find_element(By.ID, "username")
            password_input = shadow_root.find_element(By.ID, "password")
            submit_btn = shadow_root.find_element(By.ID, "submit-btn")

            # Leave fields empty and submit
            username_input.clear()
            password_input.clear()
            submit_btn.click()
            time.sleep(2)

            # Check for error message within shadow DOM
            login_component = driver.find_element(By.TAG_NAME, "login-component")
            shadow_root = driver.execute_script("return arguments[0].shadowRoot", login_component)
            error_div = shadow_root.find_element(By.ID, "error-message")
            if "show" in error_div.get_attribute("class"):
                error_text = error_div.text.strip()
                if error_text:
                    print(f"✓ Empty credentials correctly showed error: '{error_text}'")
                    return True
                else:
                    print("❌ Empty credentials error message is empty")
                    return False
            else:
                print("❌ Empty credentials did not show error message")
                return False

        except Exception as e:
            print(f"❌ Empty credentials test failed: {e}")
            return False

    def test_logout_functionality(self, driver):
        """Test logout functionality"""
        print("\n--- Testing Logout Functionality ---")

        try:
            # First login with valid credentials
            driver.delete_all_cookies()
            driver.get(self.frontend_url)
            time.sleep(2)

            # Find form elements within shadow DOM
            login_component = driver.find_element(By.TAG_NAME, "login-component")
            shadow_root = driver.execute_script("return arguments[0].shadowRoot", login_component)

            username_input = shadow_root.find_element(By.ID, "username")
            password_input = shadow_root.find_element(By.ID, "password")
            submit_btn = shadow_root.find_element(By.ID, "submit-btn")

            username_input.clear()
            username_input.send_keys("admin")
            password_input.clear()
            password_input.send_keys("admin123")
            submit_btn.click()

            # Wait for login
            WebDriverWait(driver, 15).until(
                lambda d: "main-app" in d.page_source and d.find_element(By.ID, "main-app").get_attribute("style") == ""
            )

            # Find and click logout button
            logout_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "logout-btn"))
            )
            logout_btn.click()
            time.sleep(2)

            # Verify back to login screen
            login_container = driver.find_element(By.ID, "login-container")
            if "display: none" not in login_container.get_attribute("style"):
                print("✓ Logout successful - returned to login screen")
                return True
            else:
                print("❌ Logout failed - still showing main app")
                return False

        except Exception as e:
            print(f"❌ Logout test failed: {e}")
            return False

    def run_tests(self):
        """Run all login E2E tests"""
        print("🔍 Starting Login Flow E2E Tests")
        print("=" * 50)

        # Verify backend is running
        if not self.verify_backend_running():
            print("❌ Cannot proceed without backend server")
            return

        # Frontend is already running via npm run dev

        # Setup browser
        driver = self.setup_browser()

        try:
            results = []

            # Run tests
            results.append(("Valid Login", self.test_valid_login(driver)))
            results.append(("Invalid Login", self.test_invalid_login(driver)))
            results.append(("Empty Credentials", self.test_empty_credentials(driver)))
            results.append(("Logout", self.test_logout_functionality(driver)))

            # Summary
            print("\n" + "=" * 50)
            print("📊 Test Results Summary:")
            passed = 0
            total = len(results)

            for test_name, result in results:
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"  {test_name}: {status}")
                if result:
                    passed += 1

            print(f"\n📈 Overall: {passed}/{total} tests passed")

            if passed == total:
                print("🎉 All login E2E tests passed!")
            else:
                print("⚠️  Some tests failed. Check output above for details.")

        finally:
            driver.quit()
            # Frontend was already running, no need to stop

if __name__ == "__main__":
    tester = LoginE2ETest()
    tester.run_tests()