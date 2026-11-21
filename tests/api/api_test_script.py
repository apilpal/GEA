#!/usr/bin/env python3
"""
API-Only E2E Tests for Fixed Endpoints
Tests the core API functionality without browser automation
"""

import requests
import json
import time

def test_api_endpoints():
    """Test all API endpoints are working correctly"""
    print("🚀 Starting API-Only E2E Tests for Fixed Endpoints")
    print("=" * 60)

    results = {
        'passed': 0,
        'failed': 0,
        'total': 0
    }

    # Test 1: Health Check
    print("1. Testing Health Endpoint...")
    results['total'] += 1
    try:
        response = requests.get('http://127.0.0.1:8000/api/health', timeout=5)
        if response.status_code == 200:
            print("   ✅ /api/health: PASS")
            results['passed'] += 1
        else:
            print(f"   ❌ /api/health: FAIL - {response.status_code}")
            results['failed'] += 1
    except Exception as e:
        print(f"   ❌ /api/health: ERROR - {e}")
        results['failed'] += 1

    print()

    # Test 2: Students CRUD Operations
    print("2. Testing Students CRUD Operations...")
    student_id = None

    # 2a. GET all students
    results['total'] += 1
    try:
        response = requests.get('http://127.0.0.1:8000/api/students/', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ GET /api/students/: PASS - Found {data.get('total_count', 0)} students")
            results['passed'] += 1
        else:
            print(f"   ❌ GET /api/students/: FAIL - {response.status_code}")
            results['failed'] += 1
    except Exception as e:
        print(f"   ❌ GET /api/students/: ERROR - {e}")
        results['failed'] += 1

    # 2b. POST create student
    print("   Creating test student...")
    student_data = {
        'name': 'API Test Student',
        'father_name': 'Test Father',
        'class': '10',
        'mobile': '9876543210',
        'route': 'TEST',
        'address': 'Test Address',
        'fees': '1500'
    }

    results['total'] += 1
    try:
        response = requests.post('http://127.0.0.1:8000/api/students/', json=student_data, timeout=5)
        if response.status_code == 200:
            created_student = response.json()
            student_id = created_student['id']
            print(f"   ✅ POST /api/students/: PASS - Created ID: {student_id}")
            results['passed'] += 1
        else:
            print(f"   ❌ POST /api/students/: FAIL - {response.status_code}")
            results['failed'] += 1
    except Exception as e:
        print(f"   ❌ POST /api/students/: ERROR - {e}")
        results['failed'] += 1

    # 2c. GET single student
    if student_id:
        results['total'] += 1
        try:
            response = requests.get(f'http://127.0.0.1:8000/api/students/{student_id}/', timeout=5)
            if response.status_code == 200:
                student = response.json()
                print(f"   ✅ GET /api/students/{student_id}/: PASS - {student['name']}")
                results['passed'] += 1
            else:
                print(f"   ❌ GET /api/students/{student_id}/: FAIL - {response.status_code}")
                results['failed'] += 1
        except Exception as e:
            print(f"   ❌ GET /api/students/{student_id}/: ERROR - {e}")
            results['failed'] += 1

        # 2d. PUT update student
        update_data = {
            'name': 'Updated API Test Student',
            'fees': '2000'
        }
        results['total'] += 1
        try:
            response = requests.put(f'http://127.0.0.1:8000/api/students/{student_id}/', json=update_data, timeout=5)
            if response.status_code == 200:
                updated_student = response.json()
                print(f"   ✅ PUT /api/students/{student_id}/: PASS - Updated to {updated_student['name']}")
                results['passed'] += 1
            else:
                print(f"   ❌ PUT /api/students/{student_id}/: FAIL - {response.status_code}")
                results['failed'] += 1
        except Exception as e:
            print(f"   ❌ PUT /api/students/{student_id}/: ERROR - {e}")
            results['failed'] += 1

        # 2e. DELETE student
        results['total'] += 1
        try:
            response = requests.delete(f'http://127.0.0.1:8000/api/students/{student_id}/', timeout=5)
            if response.status_code == 200:
                print(f"   ✅ DELETE /api/students/{student_id}/: PASS - Deleted successfully")
                results['passed'] += 1
            else:
                print(f"   ❌ DELETE /api/students/{student_id}/: FAIL - {response.status_code}")
                results['failed'] += 1
        except Exception as e:
            print(f"   ❌ DELETE /api/students/{student_id}/: ERROR - {e}")
            results['failed'] += 1

    print()

    # Test 3: Chart Endpoints
    print("3. Testing Chart Endpoints...")
    chart_endpoints = [
        ('http://127.0.0.1:8000/api/charts/student-distribution/', 'student-distribution'),
        ('http://127.0.0.1:8000/api/charts/revenue-by-driver/', 'revenue-by-driver'),
        ('http://127.0.0.1:8000/api/charts/revenue-by-class/', 'revenue-by-class')
    ]

    for endpoint, name in chart_endpoints:
        results['total'] += 1
        try:
            response = requests.get(endpoint, timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ {name}: PASS - {data.get('type', 'unknown')} chart")
                results['passed'] += 1
            else:
                print(f"   ❌ {name}: FAIL - {response.status_code}")
                results['failed'] += 1
        except Exception as e:
            print(f"   ❌ {name}: ERROR - {e}")
            results['failed'] += 1

    print()

    # Test 4: Error Handling
    print("4. Testing Error Handling...")
    error_endpoints = [
        ('http://127.0.0.1:8000/api/students/999999/', 'non-existent-student'),
        ('http://127.0.0.1:8000/api/nonexistent/', 'invalid-endpoint')
    ]

    for endpoint, name in error_endpoints:
        results['total'] += 1
        try:
            response = requests.get(endpoint, timeout=5)
            if response.status_code in [404, 422]:
                print(f"   ✅ {name}: PASS - Proper error {response.status_code}")
                results['passed'] += 1
            else:
                print(f"   ⚠️  {name}: UNEXPECTED - Status {response.status_code}")
                results['failed'] += 1
        except Exception as e:
            print(f"   ❌ {name}: ERROR - {e}")
            results['failed'] += 1

    print()

    # Test 5: Trailing Slash Fix Verification
    print("5. Testing Trailing Slash Fix...")
    results['total'] += 1
    try:
        # Without trailing slash should fail
        response = requests.get('http://127.0.0.1:8000/api/students', timeout=5)
        if response.status_code == 404:
            print("   ✅ /api/students (no slash): PASS - Returns 404 as expected")
            results['passed'] += 1
        else:
            print(f"   ⚠️  /api/students (no slash): UNEXPECTED - {response.status_code}")
            results['failed'] += 1
    except Exception as e:
        print(f"   ❌ /api/students (no slash): ERROR - {e}")
        results['failed'] += 1

    results['total'] += 1
    try:
        # With trailing slash should work
        response = requests.get('http://127.0.0.1:8000/api/students/', timeout=5)
        if response.status_code == 200:
            print("   ✅ /api/students/ (with slash): PASS - Works correctly")
            results['passed'] += 1
        else:
            print(f"   ❌ /api/students/ (with slash): FAIL - {response.status_code}")
            results['failed'] += 1
    except Exception as e:
        print(f"   ❌ /api/students/ (with slash): ERROR - {e}")
        results['failed'] += 1

    print()

    # Summary
    print("🎉 API-Only E2E Tests Summary:")
    print("=" * 40)
    print(f"Total Tests: {results['total']}")
    print(f"Passed: {results['passed']}")
    print(f"Failed: {results['failed']}")
    print(f"Success Rate: {(results['passed']/results['total']*100):.1f}%")

    if results['failed'] == 0:
        print("🎉 All API endpoints are working correctly!")
        print("✅ API endpoint fixes have been successfully validated")
    else:
        print(f"❌ {results['failed']} test(s) failed - some issues remain")

    return results

if __name__ == "__main__":
    test_api_endpoints()