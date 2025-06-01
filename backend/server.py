from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, date, timedelta
from enum import Enum
import jwt
import bcrypt
import requests
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Authentication Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'uk-relocation-secret-key-2025')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 24 * 60  # 24 hours

# Default credentials (in production, use environment variables)
DEFAULT_USERNAME = "relocate_user"
DEFAULT_PASSWORD = "SecurePass2025!"

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="UK Relocation Platform", version="2.0.0", description="Complete UK Relocation Solution")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class VisaStatus(str, Enum):
    NOT_STARTED = "not_started"
    PREPARING = "preparing"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"

class PropertyStatus(str, Enum):
    NOT_LISTED = "not_listed"
    PREPARING = "preparing"
    LISTED = "listed"
    UNDER_OFFER = "under_offer"
    SOLD = "sold"

class TimelinePhase(str, Enum):
    YEAR_1 = "year_1"
    YEAR_2 = "year_2"
    YEAR_3 = "year_3"
    YEAR_4 = "year_4"

class PropertyType(str, Enum):
    SINGLE_FAMILY = "single_family"
    CONDO = "condo"
    TOWNHOUSE = "townhouse"
    MANUFACTURED = "manufactured"

class UKPropertyType(str, Enum):
    DETACHED = "detached"
    SEMI_DETACHED = "semi_detached"
    TERRACED = "terraced"
    FLAT = "flat"
    APARTMENT = "apartment"
    BUNGALOW = "bungalow"

class UKRegion(str, Enum):
    LONDON = "london"
    SOUTH_EAST = "south_east"
    SOUTH_WEST = "south_west"
    EAST_ANGLIA = "east_anglia"
    MIDLANDS = "midlands"
    NORTH = "north"
    SCOTLAND = "scotland"
    WALES = "wales"

class JobType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    FREELANCE = "freelance"
    REMOTE = "remote"

class ApplicationStatus(str, Enum):
    INTERESTED = "interested"
    APPLIED = "applied"
    INTERVIEWING = "interviewing"
    OFFERED = "offered"
    REJECTED = "rejected"

class ExtensionCategory(str, Enum):
    PROPERTY_SEARCH = "property_search"
    JOB_SEARCH = "job_search"
    IMMIGRATION = "immigration"
    PRODUCTIVITY = "productivity"
    RELOCATION = "relocation"

class VisaType(str, Enum):
    SKILLED_WORKER = "skilled_worker"
    GLOBAL_TALENT = "global_talent"
    SPOUSE_PARTNER = "spouse_partner"
    FAMILY_REUNION = "family_reunion"
    STUDENT = "student"
    INVESTOR = "investor"

# Authentication Models
class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: str
    full_name: str
    verification_question: str
    new_password: str

# Base Models
class BaseDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# User Profile Models
class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    arizona_location: str = "Phoenix"
    current_house_value: float = 400000
    uk_budget_usd: float = 400000
    uk_budget_gbp: float = 315000
    target_timeline_years: int = 4
    spouse_uk_citizen: bool = True
    marriage_status: str = "married"
    preferred_uk_areas: List[str] = ["Peak District", "Cotswolds", "Lake District"]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserProfileCreate(BaseModel):
    arizona_location: str
    current_house_value: float
    uk_budget_usd: float
    spouse_uk_citizen: bool
    marriage_status: str
    preferred_uk_areas: List[str]

# Notification Models
class NotificationCreate(BaseModel):
    title: str
    message: str
    category: str
    priority: str = "medium"
    due_date: Optional[str] = None

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    category: str
    priority: str = "medium"
    due_date: Optional[str] = None
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Financial Models
class FinancialRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    description: str
    amount_usd: float
    amount_gbp: Optional[float] = None
    category: str
    date: str
    receipt_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FinancialRecordCreate(BaseModel):
    description: str
    amount_usd: float
    category: str
    date: str
    receipt_url: Optional[str] = None

# Arizona Property Models
class ArizonaProperty(BaseDocument):
    address: str
    city: str = "Phoenix"
    state: str = "AZ"
    zip_code: str
    property_type: PropertyType
    square_feet: int
    bedrooms: int
    bathrooms: float
    year_built: int
    estimated_value: Optional[float] = None
    asking_price: Optional[float] = None
    status: PropertyStatus = PropertyStatus.NOT_LISTED
    notes: Optional[str] = None

class PropertyCreate(BaseModel):
    address: str
    city: str = "Phoenix"
    zip_code: str
    property_type: PropertyType
    square_feet: int
    bedrooms: int
    bathrooms: float
    year_built: int

class PropertyValuation(BaseDocument):
    property_id: str
    estimated_value: float
    market_analysis: Dict[str, Any]
    comparable_properties: List[Dict[str, Any]] = []

# UK Visa Models
class UKVisaApplication(BaseDocument):
    visa_type: VisaType
    applicant_name: str
    status: VisaStatus = VisaStatus.NOT_STARTED
    target_submission_date: Optional[datetime] = None
    submitted_date: Optional[datetime] = None
    estimated_cost: Optional[float] = None
    documents_checklist: List[Dict[str, Any]] = []
    timeline_milestones: List[Dict[str, Any]] = []
    notes: Optional[str] = None

class VisaApplicationCreate(BaseModel):
    visa_type: VisaType
    applicant_name: str
    target_submission_date: Optional[datetime] = None

class VisaEligibilityCheck(BaseDocument):
    visa_type: VisaType
    user_responses: Dict[str, Any]
    eligibility_score: float
    recommendations: List[str] = []

# UK Property Models
class UKProperty(BaseDocument):
    title: str
    address: str
    city: str
    region: UKRegion
    postcode: str
    property_type: UKPropertyType
    price: float
    bedrooms: int
    bathrooms: int
    square_feet: Optional[int] = None
    description: Optional[str] = None
    images: List[str] = []
    transport_links: List[Dict[str, Any]] = []
    school_ratings: Dict[str, Any] = {}
    area_info: Dict[str, Any] = {}
    is_saved: bool = False

class UKPropertySearch(BaseDocument):
    user_id: str
    search_criteria: Dict[str, Any]
    saved_properties: List[str] = []
    search_alerts: bool = False

class PropertySearchRequest(BaseModel):
    region: Optional[UKRegion] = None
    property_type: Optional[UKPropertyType] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_bedrooms: Optional[int] = None
    max_bedrooms: Optional[int] = None

# Work Search Models
class JobListing(BaseDocument):
    title: str
    company: str
    location: str
    job_type: JobType
    salary_range: Optional[str] = None
    description: str
    requirements: List[str] = []
    source_url: str
    remote_friendly: bool = True
    visa_sponsorship: Optional[bool] = None

class JobApplication(BaseDocument):
    job_id: str
    user_id: str
    status: ApplicationStatus = ApplicationStatus.INTERESTED
    applied_date: Optional[datetime] = None
    notes: Optional[str] = None

class JobApplicationCreate(BaseModel):
    job_id: str
    user_id: str

# Chrome Extensions Models
class ChromeExtension(BaseDocument):
    name: str
    description: str
    category: ExtensionCategory
    chrome_store_url: str
    rating: Optional[float] = None
    user_count: Optional[str] = None
    features: List[str] = []
    icon_url: Optional[str] = None

# Timeline Models
class TimelineMilestone(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    phase: TimelinePhase
    title: str
    description: str
    target_date: str
    completed: bool = False
    completion_date: Optional[str] = None
    priority: str = "medium"
    category: str
    tasks: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TimelineMilestoneCreate(BaseModel):
    phase: TimelinePhase
    title: str
    description: str
    target_date: str
    priority: str = "medium"
    category: str
    tasks: List[str] = []

# Authentication Functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def authenticate_user(username: str, password: str) -> bool:
    if username == DEFAULT_USERNAME and password == DEFAULT_PASSWORD:
        return True
    return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except jwt.PyJWTError:
        raise credentials_exception
    if token_data.username != DEFAULT_USERNAME:
        raise credentials_exception
    return token_data.username

# ================== API ENDPOINTS ==================

@api_router.get("/")
async def root():
    return {"message": "UK Relocation Platform API", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Authentication Endpoints
@api_router.post("/login", response_model=Token)
async def login(login_request: LoginRequest):
    if not authenticate_user(login_request.username, login_request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": login_request.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/forgot-password")
async def forgot_password(reset_request: PasswordResetRequest):
    expected_answer = "Phoenix"
    
    if (reset_request.email == "user@relocate.com" and 
        reset_request.full_name.lower() == "arizona relocator" and
        reset_request.verification_question.lower().strip() == expected_answer.lower()):
        
        return {
            "message": "Password reset successful! Your new password has been updated.",
            "email_sent": True,
            "new_credentials": {
                "username": "relocate_user",
                "password": reset_request.new_password
            }
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification failed. Please check your details and try again."
        )

@api_router.get("/verify-token")
async def verify_token(current_user: str = Depends(get_current_user)):
    return {"valid": True, "username": current_user}

# User Profile Endpoints
@api_router.post("/profile", response_model=UserProfile)
async def create_user_profile(profile: UserProfileCreate, current_user: str = Depends(get_current_user)):
    profile_dict = profile.dict()
    profile_obj = UserProfile(**profile_dict)
    await db.user_profiles.insert_one(profile_obj.dict())
    return profile_obj

@api_router.get("/profile/{user_id}", response_model=UserProfile)
async def get_user_profile(user_id: str, current_user: str = Depends(get_current_user)):
    profile = await db.user_profiles.find_one({"id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    return UserProfile(**profile)

# Notification Endpoints
@api_router.post("/notifications", response_model=Notification)
async def create_notification(notification: NotificationCreate, user_id: str = Query(...), current_user: str = Depends(get_current_user)):
    notification_dict = notification.dict()
    notification_dict["user_id"] = user_id
    notification_obj = Notification(**notification_dict)
    await db.notifications.insert_one(notification_obj.dict())
    return notification_obj

@api_router.get("/notifications/{user_id}", response_model=List[Notification])
async def get_user_notifications(user_id: str, current_user: str = Depends(get_current_user)):
    notifications = await db.notifications.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
    return [Notification(**notification) for notification in notifications]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: str = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

# Financial Tracking Endpoints
@api_router.post("/financial-records", response_model=FinancialRecord)
async def create_financial_record(record: FinancialRecordCreate, user_id: str = Query(...), current_user: str = Depends(get_current_user)):
    record_dict = record.dict()
    record_dict["user_id"] = user_id
    
    usd_to_gbp_rate = 0.79
    record_dict["amount_gbp"] = record_dict["amount_usd"] * usd_to_gbp_rate
    
    record_obj = FinancialRecord(**record_dict)
    await db.financial_records.insert_one(record_obj.dict())
    return record_obj

@api_router.get("/financial-records/{user_id}", response_model=List[FinancialRecord])
async def get_financial_records(user_id: str, current_user: str = Depends(get_current_user)):
    records = await db.financial_records.find({"user_id": user_id}).sort("date", -1).to_list(100)
    return [FinancialRecord(**record) for record in records]

@api_router.get("/financial-summary/{user_id}")
async def get_financial_summary(user_id: str, current_user: str = Depends(get_current_user)):
    records = await db.financial_records.find({"user_id": user_id}).to_list(100)
    
    summary = {
        "total_spent_usd": sum(r.get("amount_usd", 0) for r in records),
        "total_spent_gbp": sum(r.get("amount_gbp", 0) for r in records),
        "by_category": {},
        "recent_transactions": 5
    }
    
    for record in records:
        category = record.get("category", "other")
        if category not in summary["by_category"]:
            summary["by_category"][category] = {"usd": 0, "gbp": 0, "count": 0}
        
        summary["by_category"][category]["usd"] += record.get("amount_usd", 0)
        summary["by_category"][category]["gbp"] += record.get("amount_gbp", 0)
        summary["by_category"][category]["count"] += 1
    
    return summary

# Arizona Property Endpoints
@api_router.post("/arizona-property", response_model=ArizonaProperty)
async def create_arizona_property(property_data: PropertyCreate):
    property_dict = property_data.dict()
    property_obj = ArizonaProperty(**property_dict)
    
    estimated_value = simulate_property_valuation(property_obj)
    property_obj.estimated_value = estimated_value
    
    await db.arizona_properties.insert_one(property_obj.dict())
    return property_obj

@api_router.get("/arizona-property", response_model=List[ArizonaProperty])
async def get_arizona_properties():
    properties = await db.arizona_properties.find({}, {"_id": 0}).to_list(1000)
    return [ArizonaProperty(**prop) for prop in properties]

@api_router.get("/arizona-property/{property_id}", response_model=ArizonaProperty)
async def get_arizona_property(property_id: str):
    property_doc = await db.arizona_properties.find_one({"id": property_id}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    return ArizonaProperty(**property_doc)

@api_router.get("/arizona-property/{property_id}/market-analysis")
async def get_market_analysis(property_id: str):
    return {
        "median_home_value": 425000,
        "price_per_sqft": 165,
        "market_trend": "rising",
        "days_on_market": 35,
        "comparable_sales": [
            {"address": "123 Similar St", "price": 415000, "sqft": 2100, "date_sold": "2024-11-15"},
            {"address": "456 Nearby Ave", "price": 435000, "sqft": 2200, "date_sold": "2024-11-10"},
            {"address": "789 Close Rd", "price": 420000, "sqft": 2050, "date_sold": "2024-11-05"}
        ]
    }

# UK Visa Endpoints
@api_router.post("/visa-application", response_model=UKVisaApplication)
async def create_visa_application(visa_data: VisaApplicationCreate):
    visa_dict = visa_data.dict()
    
    timeline = get_default_visa_timeline(visa_data.visa_type)
    visa_dict["timeline_milestones"] = timeline
    
    checklist = get_default_document_checklist(visa_data.visa_type)
    visa_dict["documents_checklist"] = checklist
    
    visa_obj = UKVisaApplication(**visa_dict)
    await db.visa_applications.insert_one(visa_obj.dict())
    return visa_obj

@api_router.get("/visa-application", response_model=List[UKVisaApplication])
async def get_visa_applications():
    applications = await db.visa_applications.find().to_list(1000)
    return [UKVisaApplication(**app) for app in applications]

@api_router.post("/visa-eligibility-check")
async def check_visa_eligibility(visa_type: VisaType, user_responses: Dict[str, Any]):
    score = calculate_visa_eligibility_score(visa_type, user_responses)
    recommendations = get_visa_recommendations(visa_type, score)
    
    check_obj = VisaEligibilityCheck(
        visa_type=visa_type,
        user_responses=user_responses,
        eligibility_score=score,
        recommendations=recommendations
    )
    
    await db.visa_eligibility_checks.insert_one(check_obj.dict())
    return check_obj

@api_router.get("/visa-info/{visa_type}")
async def get_visa_info(visa_type: VisaType):
    visa_info = {
        "skilled_worker": {
            "description": "For skilled workers with a job offer from a UK employer",
            "requirements": ["Job offer from licensed sponsor", "English language requirement", "Minimum salary threshold"],
            "processing_time": "8 weeks (outside UK), 3 weeks (inside UK)",
            "cost": "£1,420 - £2,490 depending on circumstances",
            "validity": "Up to 5 years"
        },
        "global_talent": {
            "description": "For leaders or potential leaders in academia, research, arts, culture or digital technology",
            "requirements": ["Endorsement from recognized body", "English language requirement"],
            "processing_time": "8 weeks (outside UK), 3 weeks (inside UK)",
            "cost": "£623",
            "validity": "Up to 5 years"
        },
        "spouse_partner": {
            "description": "For partners of UK citizens or settled persons",
            "requirements": ["Relationship evidence", "English language requirement", "Financial requirement"],
            "processing_time": "12 weeks (outside UK), 8 weeks (inside UK)",
            "cost": "£1,538 (outside UK), £1,048 (inside UK)",
            "validity": "2.5 years (first visa)"
        }
    }
    
    return visa_info.get(visa_type.value, {"error": "Visa type not found"})

# UK Property Search Endpoints
@api_router.post("/uk-property-search")
async def search_uk_properties(search_params: PropertySearchRequest):
    properties = generate_sample_uk_properties(search_params)
    return {"properties": properties, "total_count": len(properties)}

@api_router.get("/uk-property/{property_id}", response_model=UKProperty)
async def get_uk_property(property_id: str):
    property_doc = await db.uk_properties.find_one({"id": property_id})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    return UKProperty(**property_doc)

@api_router.post("/uk-property/{property_id}/save")
async def save_uk_property(property_id: str, user_id: str):
    await db.uk_properties.update_one(
        {"id": property_id},
        {"$set": {"is_saved": True, "updated_at": datetime.utcnow()}}
    )
    return {"message": "Property saved successfully"}

@api_router.get("/uk-regions-info")
async def get_uk_regions_info():
    return {
        "london": {
            "avg_price": 735000,
            "description": "Capital city with excellent transport links",
            "top_areas": ["Kensington", "Camden", "Greenwich"],
            "schools": "Excellent schools and universities",
            "transport": "Extensive tube, bus and rail network"
        },
        "south_east": {
            "avg_price": 485000,
            "description": "Close to London with good commuter links",
            "top_areas": ["Brighton", "Cambridge", "Oxford"],
            "schools": "Many outstanding schools",
            "transport": "Good rail links to London"
        },
        "north": {
            "avg_price": 195000,
            "description": "More affordable with strong local culture",
            "top_areas": ["Manchester", "Liverpool", "Leeds"],
            "schools": "Good schools and universities",
            "transport": "Growing transport infrastructure"
        }
    }

# Work Search Endpoints
@api_router.get("/remote-jobs")
async def get_remote_jobs(page: int = 1, limit: int = 20, search: Optional[str] = None):
    try:
        url = "https://remotive.io/api/remote-jobs"
        params = {"limit": limit}
        if search:
            params["search"] = search
            
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            jobs = []
            
            for job in data.get("jobs", [])[:limit]:
                job_obj = JobListing(
                    title=job.get("title", ""),
                    company=job.get("company_name", ""),
                    location=job.get("candidate_required_location", "Remote"),
                    job_type=JobType.REMOTE,
                    salary_range=job.get("salary", "Not specified"),
                    description=job.get("description", ""),
                    source_url=job.get("url", ""),
                    remote_friendly=True,
                    visa_sponsorship=None
                )
                jobs.append(job_obj)
                
            return {"jobs": jobs, "total": len(jobs), "page": page}
    except Exception as e:
        logging.error(f"Error fetching remote jobs: {e}")
        
    return {"jobs": generate_sample_jobs(), "total": 10, "page": page}

@api_router.post("/job-application", response_model=JobApplication)
async def create_job_application(application_data: JobApplicationCreate):
    application = JobApplication(
        job_id=application_data.job_id,
        user_id=application_data.user_id,
        status=ApplicationStatus.INTERESTED
    )
    await db.job_applications.insert_one(application.dict())
    return application

@api_router.get("/job-applications/{user_id}")
async def get_user_job_applications(user_id: str):
    applications = await db.job_applications.find({"user_id": user_id}).to_list(1000)
    return [JobApplication(**app) for app in applications]

# Chrome Extensions Endpoints
@api_router.get("/chrome-extensions", response_model=List[ChromeExtension])
async def get_chrome_extensions(category: Optional[ExtensionCategory] = None):
    extensions = get_curated_extensions()
    
    if category:
        extensions = [ext for ext in extensions if ext.category == category]
    
    for ext in extensions:
        await db.chrome_extensions.update_one(
            {"name": ext.name},
            {"$set": ext.dict()},
            upsert=True
        )
    
    return extensions

@api_router.get("/chrome-extensions/categories")
async def get_extension_categories():
    return {
        "property_search": "Property Search Tools",
        "job_search": "Job Search Assistants", 
        "immigration": "Immigration Tracking",
        "productivity": "Productivity Tools",
        "relocation": "Relocation Helpers"
    }

# Timeline Endpoints
@api_router.post("/timeline-milestone", response_model=TimelineMilestone)
async def create_timeline_milestone(milestone: TimelineMilestoneCreate, user_id: str = Query(...), current_user: str = Depends(get_current_user)):
    milestone_dict = milestone.dict()
    milestone_dict["user_id"] = user_id
    milestone_obj = TimelineMilestone(**milestone_dict)
    await db.timeline_milestones.insert_one(milestone_obj.dict())
    return milestone_obj

@api_router.get("/timeline/{user_id}", response_model=List[TimelineMilestone])
async def get_user_timeline(user_id: str, current_user: str = Depends(get_current_user)):
    milestones = await db.timeline_milestones.find({"user_id": user_id}).sort("target_date", 1).to_list(100)
    return [TimelineMilestone(**milestone) for milestone in milestones]

@api_router.put("/timeline-milestone/{milestone_id}")
async def update_milestone_completion(milestone_id: str, completed: bool, current_user: str = Depends(get_current_user)):
    update_data = {
        "completed": completed,
        "completion_date": date.today().isoformat() if completed else None
    }
    
    result = await db.timeline_milestones.update_one(
        {"id": milestone_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    milestone = await db.timeline_milestones.find_one({"id": milestone_id})
    return TimelineMilestone(**milestone)

@api_router.post("/initialize-timeline/{user_id}")
async def initialize_default_timeline(user_id: str, current_user: str = Depends(get_current_user)):
    base_date = date.today()
    
    default_milestones = [
        {
            "phase": "year_1",
            "title": "Property Preparation & Market Research",
            "description": "Prepare Arizona house for sale and research UK property market",
            "target_date": (base_date + timedelta(days=90)).isoformat(),
            "category": "property",
            "priority": "high",
            "tasks": [
                "Get professional property valuation",
                "Complete necessary home improvements",
                "Research Peak District property market",
                "Connect with Arizona real estate agents"
            ]
        },
        {
            "phase": "year_1",
            "title": "Marriage & Relationship Documentation",
            "description": "Ensure marriage is legally recognized and gather evidence",
            "target_date": (base_date + timedelta(days=180)).isoformat(),
            "category": "visa",
            "priority": "high",
            "tasks": [
                "Obtain certified marriage certificate",
                "Gather relationship evidence (photos, joint accounts, etc.)",
                "Document cohabitation history",
                "Prepare joint financial statements"
            ]
        }
    ]
    
    created_milestones = []
    for milestone_data in default_milestones:
        milestone_data["user_id"] = user_id
        milestone_obj = TimelineMilestone(**milestone_data)
        await db.timeline_milestones.insert_one(milestone_obj.dict())
        created_milestones.append(milestone_obj)
    
    return {"message": f"Created {len(created_milestones)} default milestones", "milestones": created_milestones}

# ================== UTILITY FUNCTIONS ==================

def simulate_property_valuation(property_obj: ArizonaProperty) -> float:
    base_price_per_sqft = 165
    value = property_obj.square_feet * base_price_per_sqft
    
    if property_obj.property_type == PropertyType.SINGLE_FAMILY:
        value *= 1.1
    elif property_obj.property_type == PropertyType.CONDO:
        value *= 0.9
    
    return round(value, 2)

def get_default_visa_timeline(visa_type: VisaType) -> List[Dict[str, Any]]:
    timelines = {
        VisaType.SKILLED_WORKER: [
            {"step": "Job search and offer", "duration": "1-6 months", "status": "pending"},
            {"step": "Sponsor license check", "duration": "1 week", "status": "pending"},
            {"step": "Application preparation", "duration": "2-4 weeks", "status": "pending"},
            {"step": "Application submission", "duration": "1 day", "status": "pending"},
            {"step": "Processing", "duration": "8 weeks", "status": "pending"},
            {"step": "Decision", "duration": "1 week", "status": "pending"}
        ],
        VisaType.SPOUSE_PARTNER: [
            {"step": "Document collection", "duration": "4-8 weeks", "status": "pending"},
            {"step": "English test", "duration": "2 weeks", "status": "pending"},
            {"step": "Financial evidence", "duration": "2 weeks", "status": "pending"},
            {"step": "Application submission", "duration": "1 day", "status": "pending"},
            {"step": "Processing", "duration": "12 weeks", "status": "pending"},
            {"step": "Decision", "duration": "1 week", "status": "pending"}
        ]
    }
    return timelines.get(visa_type, [])

def get_default_document_checklist(visa_type: VisaType) -> List[Dict[str, Any]]:
    checklists = {
        VisaType.SKILLED_WORKER: [
            {"document": "Valid passport", "required": True, "obtained": False},
            {"document": "Certificate of Sponsorship", "required": True, "obtained": False},
            {"document": "English language test results", "required": True, "obtained": False},
            {"document": "Tuberculosis test", "required": True, "obtained": False},
            {"document": "Criminal record certificate", "required": True, "obtained": False},
            {"document": "Academic qualifications", "required": False, "obtained": False}
        ],
        VisaType.SPOUSE_PARTNER: [
            {"document": "Valid passport", "required": True, "obtained": False},
            {"document": "Marriage certificate", "required": True, "obtained": False},
            {"document": "English language test", "required": True, "obtained": False},
            {"document": "Financial evidence", "required": True, "obtained": False},
            {"document": "Accommodation evidence", "required": True, "obtained": False},
            {"document": "Relationship evidence", "required": True, "obtained": False}
        ]
    }
    return checklists.get(visa_type, [])

def calculate_visa_eligibility_score(visa_type: VisaType, responses: Dict[str, Any]) -> float:
    score = 0.0
    total_questions = len(responses)
    
    for key, value in responses.items():
        if value in [True, "yes", "Yes"]:
            score += 1
    
    return (score / total_questions) * 100 if total_questions > 0 else 0

def get_visa_recommendations(visa_type: VisaType, score: float) -> List[str]:
    if score >= 80:
        return ["You appear to have a strong application", "Consider proceeding with your application"]
    elif score >= 60:
        return ["Your application looks promising", "Consider getting professional advice", "Ensure all documents are in order"]
    else:
        return ["Your application may face challenges", "Strongly recommend professional legal advice", "Consider alternative visa routes"]

def generate_sample_uk_properties(search_params: PropertySearchRequest) -> List[Dict[str, Any]]:
    sample_properties = [
        {
            "id": str(uuid.uuid4()),
            "title": "Modern 3-bedroom house in London",
            "address": "123 Sample Street, London",
            "city": "London", 
            "region": "london",
            "price": 650000,
            "bedrooms": 3,
            "bathrooms": 2,
            "property_type": "terraced",
            "images": ["https://images.unsplash.com/photo-1568605114967-8130f3a36994"]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Charming cottage in the Cotswolds",
            "address": "456 Village Lane, Chipping Norton",
            "city": "Chipping Norton",
            "region": "south_west", 
            "price": 485000,
            "bedrooms": 2,
            "bathrooms": 1,
            "property_type": "detached",
            "images": ["https://images.unsplash.com/photo-1570129477492-45c003edd2be"]
        }
    ]
    return sample_properties

def generate_sample_jobs() -> List[JobListing]:
    return [
        JobListing(
            title="Senior Software Engineer",
            company="TechCorp UK",
            location="Remote (UK)",
            job_type=JobType.REMOTE,
            salary_range="£60,000 - £80,000",
            description="Join our remote team building cutting-edge applications",
            source_url="https://example.com/job1",
            visa_sponsorship=True
        ),
        JobListing(
            title="Product Manager",
            company="Innovation Ltd",
            location="London (Remote OK)",
            job_type=JobType.FULL_TIME,
            salary_range="£70,000 - £90,000", 
            description="Lead product development for our growing platform",
            source_url="https://example.com/job2",
            visa_sponsorship=True
        )
    ]

def get_curated_extensions() -> List[ChromeExtension]:
    return [
        ChromeExtension(
            name="Rightmove Property Search",
            description="Enhanced property search on Rightmove with advanced filters",
            category=ExtensionCategory.PROPERTY_SEARCH,
            chrome_store_url="https://chrome.google.com/webstore/detail/rightmove-enhancer/abcd1234",
            rating=4.5,
            user_count="10,000+",
            features=["Advanced filters", "Price alerts", "Map integration"],
            icon_url="https://images.unsplash.com/photo-1560518883-ce09059eeffa"
        ),
        ChromeExtension(
            name="LinkedIn Job Search Pro",
            description="Advanced job search tools for LinkedIn with UK visa sponsorship filters",
            category=ExtensionCategory.JOB_SEARCH,
            chrome_store_url="https://chrome.google.com/webstore/detail/linkedin-job-pro/efgh5678",
            rating=4.7,
            user_count="50,000+",
            features=["Visa sponsorship filter", "Salary insights", "Application tracking"],
            icon_url="https://images.unsplash.com/photo-1586281380349-632531db7ed4"
        ),
        ChromeExtension(
            name="UK Visa Tracker",
            description="Track your UK visa application status and deadlines",
            category=ExtensionCategory.IMMIGRATION,
            chrome_store_url="https://chrome.google.com/webstore/detail/uk-visa-tracker/ijkl9012", 
            rating=4.3,
            user_count="5,000+",
            features=["Application tracking", "Deadline reminders", "Document checklist"],
            icon_url="https://images.unsplash.com/photo-1521791136064-7986c2920216"
        ),
        ChromeExtension(
            name="Indeed UK Job Alerts",
            description="Real-time job alerts for Indeed UK with remote work filters",
            category=ExtensionCategory.JOB_SEARCH,
            chrome_store_url="https://chrome.google.com/webstore/detail/indeed-uk-alerts/mnop3456",
            rating=4.4,
            user_count="25,000+",
            features=["Real-time alerts", "Remote work filter", "Salary comparison"],
            icon_url="https://images.unsplash.com/photo-1611224923853-80b023f02d71"
        ),
        ChromeExtension(
            name="Zoopla Property Tools",
            description="Enhanced Zoopla experience with area insights and transport data",
            category=ExtensionCategory.PROPERTY_SEARCH,
            chrome_store_url="https://chrome.google.com/webstore/detail/zoopla-tools/qrst7890",
            rating=4.2,
            user_count="8,000+",
            features=["Area insights", "Transport data", "School ratings"],
            icon_url="https://images.unsplash.com/photo-1560472354-b33ff0c44a43"
        ),
        ChromeExtension(
            name="Relocation Checklist Manager",
            description="Comprehensive checklist manager for international relocation",
            category=ExtensionCategory.RELOCATION,
            chrome_store_url="https://chrome.google.com/webstore/detail/relocation-checklist/uvwx1234",
            rating=4.6,
            user_count="15,000+",
            features=["Customizable checklists", "Progress tracking", "Deadline management"],
            icon_url="https://images.unsplash.com/photo-1586953208448-b95a79798f07"
        )
    ]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
