import requests
import sys
import json
import traceback
from datetime import datetime

class FocusedAPITester:
    def __init__(self, base_url="https://6ec0f8ad-18db-4790-bc6e-7578cae51741.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = "demo-user-123"
        
    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, auth=False, debug=False):
        """Run a single API test with detailed error reporting"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Add authorization token if required and available
        if auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                print(f"Request Data: {json.dumps(data, indent=2)}")
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            
            print(f"Status Code: {response.status_code}")
            
            try:
                response_data = response.json()
                print(f"Response: {json.dumps(response_data, indent=2)}")
            except:
                print(f"Response Text: {response.text}")
            
            success = response.status_code == expected_status
            if success:
                print(f"✅ Passed - Status: {response.status_code}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
            
            return success, response.json() if success and response.text else {}
            
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            if debug:
                print("Traceback:")
                traceback.print_exc()
            return False, {}

    def test_login(self):
        login_data = {
            "username": "relocate_user",
            "password": "SecurePass2025!"
        }
        success, response = self.run_test("Login", "POST", "login", 200, data=login_data)
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Successfully obtained token")
        return success, response
    
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
        return self.run_test("Get User Profile", "GET", f"profile/{self.user_id}", 200, auth=True, debug=True)
    
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
        return self.run_test("Create Arizona Property", "POST", "arizona-property", 200, data=property_data, debug=True)
    
    def test_get_arizona_properties(self):
        return self.run_test("Get Arizona Properties", "GET", "arizona-property", 200, debug=True)
    
    def test_create_visa_application(self):
        visa_data = {
            "visa_type": "skilled_worker",
            "applicant_name": "Test User"
        }
        return self.run_test("Create Visa Application", "POST", "visa-application", 200, data=visa_data, debug=True)
    
    def test_get_visa_applications(self):
        return self.run_test("Get Visa Applications", "GET", "visa-application", 200, debug=True)

def main():
    tester = FocusedAPITester()
    
    # Login first to get token
    tester.test_login()
    
    # Test problematic endpoints
    print("\n=== User Profile Tests ===")
    tester.test_create_user_profile()
    tester.test_get_user_profile()
    
    print("\n=== Arizona Property Tests ===")
    tester.test_create_arizona_property()
    tester.test_get_arizona_properties()
    
    print("\n=== UK Visa Tests ===")
    tester.test_create_visa_application()
    tester.test_get_visa_applications()

if __name__ == "__main__":
    main()
