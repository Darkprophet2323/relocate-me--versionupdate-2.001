#!/usr/bin/env python3
"""
Debug script to test database insertions and identify the root cause
of silent insertion failures in the Arizona Property and Visa endpoints.
"""

import asyncio
import motor.motor_asyncio
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime

# Add backend to path
sys.path.append('/app/backend')
from server import ArizonaProperty, UKVisaApplication, PropertyCreate, VisaApplicationCreate, VisaType

# Load environment
ROOT_DIR = Path('/app/backend')
load_dotenv(ROOT_DIR / '.env')

async def test_database_operations():
    """Test database operations to identify insertion issues"""
    
    print("🔧 Starting Database Insertion Debug...")
    
    try:
        # Connect to database
        mongo_url = os.environ['MONGO_URL']
        client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
        db = client[os.environ['DB_NAME']]
        
        print(f"✅ Connected to MongoDB: {mongo_url}")
        
        # Test 1: Direct insertion with dict
        print("\n📝 Test 1: Direct dict insertion")
        test_doc = {
            "id": "test-direct-dict",
            "name": "Test Document",
            "timestamp": datetime.utcnow()
        }
        
        result = await db.test_collection.insert_one(test_doc)
        print(f"✅ Direct dict insertion successful: {result.inserted_id}")
        
        # Clean up
        await db.test_collection.delete_one({"id": "test-direct-dict"})
        
        # Test 2: Test Arizona Property creation (like API does)
        print("\n🏠 Test 2: Arizona Property creation")
        
        # Create PropertyCreate object (like API receives)
        property_create_data = {
            "address": "123 Debug Lane",
            "city": "Phoenix",
            "zip_code": "85001",
            "property_type": "single_family",
            "square_feet": 2000,
            "bedrooms": 3,
            "bathrooms": 2,
            "year_built": 2010
        }
        
        property_create = PropertyCreate(**property_create_data)
        print(f"✅ PropertyCreate object: {property_create}")
        
        # Convert to dict (like API does)
        property_dict = property_create.dict()
        print(f"✅ PropertyCreate dict: {property_dict}")
        
        # Create ArizonaProperty object (like API does)
        property_obj = ArizonaProperty(**property_dict)
        print(f"✅ ArizonaProperty object: {property_obj}")
        
        # Try to serialize to dict for insertion
        property_insert_dict = property_obj.dict()
        print(f"✅ Property dict for insertion: {property_insert_dict}")
        
        # Check if it's JSON serializable
        try:
            json_str = json.dumps(property_insert_dict, default=str)
            print(f"✅ Property dict is JSON serializable")
        except Exception as e:
            print(f"❌ Property dict NOT JSON serializable: {e}")
        
        # Try to insert
        result = await db.arizona_properties.insert_one(property_insert_dict)
        print(f"✅ Arizona Property insertion successful: {result.inserted_id}")
        
        # Verify it was inserted
        found = await db.arizona_properties.find_one({"id": property_obj.id})
        if found:
            print(f"✅ Property found after insertion: {found['id']}")
        else:
            print(f"❌ Property NOT found after insertion")
        
        # Clean up
        await db.arizona_properties.delete_one({"id": property_obj.id})
        
        # Test 3: Test UK Visa Application creation
        print("\n📄 Test 3: UK Visa Application creation")
        
        visa_create_data = {
            "visa_type": "skilled_worker",
            "applicant_name": "Test Applicant"
        }
        
        visa_create = VisaApplicationCreate(**visa_create_data)
        print(f"✅ VisaApplicationCreate object: {visa_create}")
        
        # Convert to dict and add additional fields (like API does)
        visa_dict = visa_create.dict()
        
        # Add timeline and checklist (like API does)
        visa_dict["timeline_milestones"] = [
            {"step": "Test step", "duration": "1 week", "status": "pending"}
        ]
        visa_dict["documents_checklist"] = [
            {"document": "Test document", "required": True, "obtained": False}
        ]
        
        # Create UKVisaApplication object
        visa_obj = UKVisaApplication(**visa_dict)
        print(f"✅ UKVisaApplication object: {visa_obj}")
        
        # Try to serialize to dict for insertion
        visa_insert_dict = visa_obj.dict()
        print(f"✅ Visa dict for insertion: {visa_insert_dict}")
        
        # Check if it's JSON serializable
        try:
            json_str = json.dumps(visa_insert_dict, default=str)
            print(f"✅ Visa dict is JSON serializable")
        except Exception as e:
            print(f"❌ Visa dict NOT JSON serializable: {e}")
        
        # Try to insert
        result = await db.visa_applications.insert_one(visa_insert_dict)
        print(f"✅ Visa Application insertion successful: {result.inserted_id}")
        
        # Verify it was inserted
        found = await db.visa_applications.find_one({"id": visa_obj.id})
        if found:
            print(f"✅ Visa application found after insertion: {found['id']}")
        else:
            print(f"❌ Visa application NOT found after insertion")
        
        # Clean up
        await db.visa_applications.delete_one({"id": visa_obj.id})
        
        print("\n🎉 All database operations completed successfully!")
        
    except Exception as e:
        print(f"❌ Database operation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_database_operations())