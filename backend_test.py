import requests
import sys
import json
from datetime import datetime

class UKRelocationAPITester:
    def __init__(self, base_url="https://6ec0f8ad-18db-4790-bc6e-7578cae51741.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = {}
        self.token = None
        self.user_id = "demo-user-123"

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, auth=False):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Add authorization token if required and available
        if auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response: {json.dumps(response_data, indent=2)[:500]}...")
                except:
                    print(f"Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:200]}...")
            
            self.test_results[name] = {
                "success": success,
                "status_code": response.status_code,
                "expected_status": expected_status
            }
            
            return success, response.json() if success and response.text else {}
            
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results[name] = {
                "success": False,
                "error": str(e)
            }
            return False, {}

    # Authentication Tests
    def test_login_success(self):
        login_data = {
            "username": "relocate_user",
            "password": "SecurePass2025!"
        }
        success, response = self.run_test("Login Success", "POST", "login", 200, data=login_data)
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Successfully obtained token")
        return success, response
    
    def test_login_failure(self):
        login_data = {
            "username": "relocate_user",
            "password": "WrongPassword123"
        }
        return self.run_test("Login Failure", "POST", "login", 401, data=login_data)
    
    def test_verify_token(self):
        if not self.token:
            print("⚠️ No token available for verification test")
            return False, {}
        return self.run_test("Verify Token", "GET", "verify-token", 200, auth=True)
    
    def test_password_reset(self):
        reset_data = {
            "email": "user@relocate.com",
            "full_name": "Arizona Relocator",
            "verification_question": "Phoenix",
            "new_password": "NewSecurePass2025!"
        }
        return self.run_test("Password Reset", "POST", "forgot-password", 200, data=reset_data)
    
    # Health Check Tests
    def test_health_check(self):
        return self.run_test("API Health Check", "GET", "health", 200)

    # User Profile Tests
    def test_create_user_profile(self):
        profile_data = {
            "arizona_location": "Phoenix",
            "current_house_value": 450000,
            "uk_budget_usd": 500000,
            "spouse_uk_citizen": True,
            "marriage_status": "married",
            "preferred_uk_areas": ["Peak District", "Lake District"]
        }
        return self.run_test("Create User Profile", "POST", "profile", 200, data=profile_data, auth=True)
    
    def test_get_user_profile(self):
        return self.run_test("Get User Profile", "GET", f"profile/{self.user_id}", 200, auth=True)
    
    # Notification Tests
    def test_create_notification(self):
        notification_data = {
            "title": "Test Notification",
            "message": "This is a test notification",
            "category": "visa",
            "priority": "high"
        }
        return self.run_test("Create Notification", "POST", f"notifications?user_id={self.user_id}", 200, data=notification_data, auth=True)
    
    def test_get_notifications(self):
        return self.run_test("Get Notifications", "GET", f"notifications/{self.user_id}", 200, auth=True)
    
    # Financial Tracking Tests
    def test_create_financial_record(self):
        record_data = {
            "description": "Test Expense",
            "amount_usd": 1000,
            "category": "visa",
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        return self.run_test("Create Financial Record", "POST", f"financial-records?user_id={self.user_id}", 200, data=record_data, auth=True)
    
    def test_get_financial_records(self):
        return self.run_test("Get Financial Records", "GET", f"financial-records/{self.user_id}", 200, auth=True)
    
    def test_get_financial_summary(self):
        return self.run_test("Get Financial Summary", "GET", f"financial-summary/{self.user_id}", 200, auth=True)
    
    # Timeline Tests
    def test_create_timeline_milestone(self):
        milestone_data = {
            "phase": "year_1",
            "title": "Test Milestone",
            "description": "This is a test milestone",
            "target_date": (datetime.now().date()).isoformat(),
            "category": "visa",
            "tasks": ["Task 1", "Task 2"]
        }
        return self.run_test("Create Timeline Milestone", "POST", f"timeline-milestone?user_id={self.user_id}", 200, data=milestone_data, auth=True)
    
    def test_get_timeline(self):
        return self.run_test("Get Timeline", "GET", f"timeline/{self.user_id}", 200, auth=True)
    
    def test_initialize_timeline(self):
        return self.run_test("Initialize Timeline", "POST", f"initialize-timeline/{self.user_id}", 200, auth=True)

    # Arizona Property Tests
    def test_create_arizona_property(self):
        property_data = {
            "address": "123 Test St",
            "zip_code": "85001",
            "property_type": "single_family",
            "square_feet": 2000,
            "bedrooms": 3,
            "bathrooms": 2,
            "year_built": 2010
        }
        return self.run_test("Create Arizona Property", "POST", "arizona-property", 200, data=property_data)
    
    def test_get_arizona_properties(self):
        return self.run_test("Get Arizona Properties", "GET", "arizona-property", 200)
    
    def test_get_market_analysis(self, property_id):
        return self.run_test("Get Market Analysis", "GET", f"arizona-property/{property_id}/market-analysis", 200)

    # UK Visa Tests
    def test_create_visa_application(self):
        visa_data = {
            "visa_type": "skilled_worker",
            "applicant_name": "Test User"
        }
        return self.run_test("Create Visa Application", "POST", "visa-application", 200, data=visa_data)
    
    def test_get_visa_applications(self):
        return self.run_test("Get Visa Applications", "GET", "visa-application", 200)
    
    def test_get_visa_info(self, visa_type="skilled_worker"):
        return self.run_test("Get Visa Info", "GET", f"visa-info/{visa_type}", 200)

    # UK Property Tests
    def test_search_uk_properties(self):
        search_params = {
            "region": "london",
            "min_bedrooms": 2
        }
        return self.run_test("Search UK Properties", "POST", "uk-property-search", 200, data=search_params)
    
    def test_get_uk_regions_info(self):
        return self.run_test("Get UK Regions Info", "GET", "uk-regions-info", 200)

    # Work Search Tests
    def test_get_remote_jobs(self):
        return self.run_test("Get Remote Jobs", "GET", "remote-jobs", 200, params={"search": "engineer"})
    
    def test_create_job_application(self, job_id):
        data = {
            "job_id": job_id,
            "user_id": "user123"
        }
        return self.run_test("Create Job Application", "POST", "job-application", 200, data=data)

    # Chrome Extensions Tests
    def test_get_chrome_extensions(self):
        return self.run_test("Get Chrome Extensions", "GET", "chrome-extensions", 200)
    
    def test_get_extension_categories(self):
        return self.run_test("Get Extension Categories", "GET", "chrome-extensions/categories", 200)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting UK Relocation Platform API Tests")
        
        # Health Check
        self.test_health_check()
        
        # Authentication Tests
        print("\n=== Authentication Tests ===")
        success, _ = self.test_login_success()
        if not success:
            print("⚠️ Login failed, some authenticated tests may fail")
        
        self.test_login_failure()
        self.test_verify_token()
        self.test_password_reset()
        
        # User Profile Tests
        print("\n=== User Profile Tests ===")
        self.test_create_user_profile()
        self.test_get_user_profile()
        
        # Notification Tests
        print("\n=== Notification Tests ===")
        self.test_create_notification()
        self.test_get_notifications()
        
        # Financial Tests
        print("\n=== Financial Tests ===")
        self.test_create_financial_record()
        self.test_get_financial_records()
        self.test_get_financial_summary()
        
        # Timeline Tests
        print("\n=== Timeline Tests ===")
        self.test_create_timeline_milestone()
        self.test_get_timeline()
        self.test_initialize_timeline()
        
        # Arizona Property Tests
        print("\n=== Arizona Property Tests ===")
        success, property_data = self.test_create_arizona_property()
        self.test_get_arizona_properties()
        if success and property_data:
            self.test_get_market_analysis(property_data.get('id'))
        
        # UK Visa Tests
        print("\n=== UK Visa Tests ===")
        success, visa_data = self.test_create_visa_application()
        self.test_get_visa_applications()
        self.test_get_visa_info()
        
        # UK Property Tests
        print("\n=== UK Property Tests ===")
        self.test_search_uk_properties()
        self.test_get_uk_regions_info()
        
        # Work Search Tests
        print("\n=== Work Search Tests ===")
        success, jobs_data = self.test_get_remote_jobs()
        if success and jobs_data and 'jobs' in jobs_data and len(jobs_data['jobs']) > 0:
            job_id = jobs_data['jobs'][0].get('id')
            if job_id:
                self.test_create_job_application(job_id)
        
        # Chrome Extensions Tests
        print("\n=== Chrome Extensions Tests ===")
        self.test_get_chrome_extensions()
        self.test_get_extension_categories()
        
        # Print summary
        print("\n📊 Test Summary:")
        if self.tests_run > 0:
            pass_percentage = (self.tests_passed/self.tests_run)*100
            print(f"Tests Passed: {self.tests_passed}/{self.tests_run} ({pass_percentage:.1f}%)")
        else:
            print("No tests were run")
        
        # Print failed tests
        failed_tests = {name: details for name, details in self.test_results.items() if not details.get('success')}
        if failed_tests:
            print("\n❌ Failed Tests:")
            for name, details in failed_tests.items():
                error_msg = details.get('error')
                if error_msg:
                    print(f"- {name}: {error_msg}")
                else:
                    expected = details.get('expected_status')
                    actual = details.get('status_code')
                    print(f"- {name}: Expected {expected}, got {actual}")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = UKRelocationAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
