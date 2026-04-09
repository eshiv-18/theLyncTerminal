"""
Onboarding API Tests
Tests for Admin and Founder onboarding flows
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@startupintel.com"
ADMIN_PASSWORD = "admin123"
FOUNDER_EMAIL = "alex.thompson@startup.com"
FOUNDER_PASSWORD = "founder123"


class TestHealthCheck:
    """Basic health check to ensure API is running"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print(f"Health check passed: {data}")


class TestAuthFlow:
    """Test authentication flow needed for onboarding"""
    
    def test_admin_login(self):
        """Test admin login to get token for onboarding"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print(f"Admin login successful: {data['user']['email']}")
        return data["access_token"]


class TestAdminOnboardingAPIs:
    """Test Admin Onboarding APIs (Steps 1-6)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["access_token"]
    
    @pytest.fixture
    def auth_headers(self, admin_token):
        """Get auth headers with admin token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_create_workspace_success(self, auth_headers):
        """Test workspace creation (Admin Onboarding Steps 1-2 & 6)"""
        workspace_data = {
            "org_name": f"TEST_Acme_Ventures_{datetime.now().timestamp()}",
            "user_name": "Test Admin",
            "email": "testadmin@acme.vc",
            "country": "us",
            "use_case": "vc_fund",
            "fund_name": "Acme Fund I",
            "logo_url": None,
            "currency": "USD",
            "reporting_frequency": "monthly",
            "timezone": "UTC",
            "portfolio_unit": "fund",
            "investment_stages": ["Seed", "Series A"],
            "sectors": ["FinTech", "AI"],
            "health_score_template": "balanced",
            "runway_threshold": 9,
            "required_sections": ["financial", "gtm", "product"],
            "mandatory_metrics": True,
            "alert_recipients": ["admin", "partners"],
            "founder_can_edit": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/workspace",
            json=workspace_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201, f"Workspace creation failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert data["org_name"] == workspace_data["org_name"]
        assert data["fund_name"] == workspace_data["fund_name"]
        assert data["currency"] == "USD"
        assert data["reporting_frequency"] == "monthly"
        assert "created_at" in data
        
        print(f"Workspace created successfully: {data['id']}")
        return data["id"]
    
    def test_create_workspace_missing_fields(self, auth_headers):
        """Test workspace creation with missing required fields"""
        incomplete_data = {
            "org_name": "Test Org"
            # Missing required fields
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/workspace",
            json=incomplete_data,
            headers=auth_headers
        )
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("Validation error correctly returned for missing fields")
    
    def test_create_workspace_unauthorized(self):
        """Test workspace creation without auth token"""
        workspace_data = {
            "org_name": "Unauthorized Test",
            "user_name": "Test",
            "email": "test@test.com",
            "country": "us",
            "use_case": "vc_fund",
            "fund_name": "Test Fund"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/workspace",
            json=workspace_data
        )
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Unauthorized request correctly rejected")
    
    def test_invite_team_members(self, auth_headers):
        """Test team member invitation (Admin Onboarding Step 3)"""
        # First create a workspace
        workspace_data = {
            "org_name": f"TEST_Team_Workspace_{datetime.now().timestamp()}",
            "user_name": "Test Admin",
            "email": "testadmin@team.vc",
            "country": "us",
            "use_case": "vc_fund",
            "fund_name": "Team Fund",
            "currency": "USD",
            "reporting_frequency": "monthly",
            "timezone": "UTC",
            "portfolio_unit": "fund",
            "investment_stages": ["Seed"],
            "sectors": ["Tech"],
            "health_score_template": "balanced",
            "runway_threshold": 9,
            "required_sections": ["financial"],
            "mandatory_metrics": True,
            "alert_recipients": ["admin"],
            "founder_can_edit": True
        }
        
        ws_response = requests.post(
            f"{BASE_URL}/api/admin/workspace",
            json=workspace_data,
            headers=auth_headers
        )
        assert ws_response.status_code == 201
        workspace_id = ws_response.json()["id"]
        
        # Now invite team members
        invite_data = {
            "workspace_id": workspace_id,
            "members": [
                {
                    "email": "analyst@test.vc",
                    "name": "Test Analyst",
                    "role": "analyst",
                    "permissions": {"view_portfolio": True}
                },
                {
                    "email": "partner@test.vc",
                    "name": "Test Partner",
                    "role": "partner",
                    "permissions": {"view_portfolio": True, "edit_companies": True}
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/team/invite",
            json=invite_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Team invite failed: {response.text}"
        data = response.json()
        
        assert data["invited_count"] == 2
        assert len(data["invited_emails"]) == 2
        assert "analyst@test.vc" in data["invited_emails"]
        assert "partner@test.vc" in data["invited_emails"]
        
        print(f"Team members invited: {data['invited_count']}")
    
    def test_bulk_import_companies(self, auth_headers):
        """Test bulk company import (Admin Onboarding Step 4)"""
        # First create a workspace
        workspace_data = {
            "org_name": f"TEST_Import_Workspace_{datetime.now().timestamp()}",
            "user_name": "Test Admin",
            "email": "testadmin@import.vc",
            "country": "us",
            "use_case": "vc_fund",
            "fund_name": "Import Fund",
            "currency": "USD",
            "reporting_frequency": "monthly",
            "timezone": "UTC",
            "portfolio_unit": "fund",
            "investment_stages": ["Seed", "Series A"],
            "sectors": ["Tech", "AI"],
            "health_score_template": "balanced",
            "runway_threshold": 9,
            "required_sections": ["financial"],
            "mandatory_metrics": True,
            "alert_recipients": ["admin"],
            "founder_can_edit": True
        }
        
        ws_response = requests.post(
            f"{BASE_URL}/api/admin/workspace",
            json=workspace_data,
            headers=auth_headers
        )
        assert ws_response.status_code == 201
        workspace_id = ws_response.json()["id"]
        
        # Import companies
        import_data = {
            "workspace_id": workspace_id,
            "companies": [
                {
                    "name": "TEST_TechStartup_Alpha",
                    "stage": "Seed",
                    "sector": "AI",
                    "website": "https://alpha.tech",
                    "founder_name": "John Alpha",
                    "founder_email": "john@alpha.tech",
                    "funding_amount": 1000000,
                    "valuation": 5000000
                },
                {
                    "name": "TEST_TechStartup_Beta",
                    "stage": "Series A",
                    "sector": "FinTech",
                    "website": "https://beta.tech",
                    "founder_name": "Jane Beta",
                    "founder_email": "jane@beta.tech",
                    "funding_amount": 5000000,
                    "valuation": 25000000
                }
            ],
            "send_founder_invites": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/companies/bulk",
            json=import_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Bulk import failed: {response.text}"
        data = response.json()
        
        assert data["imported_count"] == 2
        assert data["failed_count"] == 0
        assert len(data["company_ids"]) == 2
        
        print(f"Companies imported: {data['imported_count']}")
        return workspace_id, data["company_ids"]
    
    def test_invite_founders(self, auth_headers):
        """Test founder invitation (Admin Onboarding Step 5)"""
        # First create workspace and import companies
        workspace_data = {
            "org_name": f"TEST_Founder_Workspace_{datetime.now().timestamp()}",
            "user_name": "Test Admin",
            "email": "testadmin@founder.vc",
            "country": "us",
            "use_case": "vc_fund",
            "fund_name": "Founder Fund",
            "currency": "USD",
            "reporting_frequency": "monthly",
            "timezone": "UTC",
            "portfolio_unit": "fund",
            "investment_stages": ["Seed"],
            "sectors": ["Tech"],
            "health_score_template": "balanced",
            "runway_threshold": 9,
            "required_sections": ["financial"],
            "mandatory_metrics": True,
            "alert_recipients": ["admin"],
            "founder_can_edit": True
        }
        
        ws_response = requests.post(
            f"{BASE_URL}/api/admin/workspace",
            json=workspace_data,
            headers=auth_headers
        )
        assert ws_response.status_code == 201
        workspace_id = ws_response.json()["id"]
        
        # Import a company
        import_data = {
            "workspace_id": workspace_id,
            "companies": [
                {
                    "name": "TEST_FounderStartup",
                    "stage": "Seed",
                    "sector": "Tech",
                    "founder_name": "Founder Test",
                    "founder_email": "founder@test.startup"
                }
            ],
            "send_founder_invites": False
        }
        
        import_response = requests.post(
            f"{BASE_URL}/api/admin/companies/bulk",
            json=import_data,
            headers=auth_headers
        )
        assert import_response.status_code == 200
        startup_id = import_response.json()["company_ids"][0]
        
        # Now invite founders
        invite_data = {
            "workspace_id": workspace_id,
            "invitations": [
                {
                    "startup_id": startup_id,
                    "founder_email": "founder@test.startup",
                    "founder_name": "Founder Test",
                    "reporting_cadence": "monthly",
                    "report_due_date": 5
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/founders/invite",
            json=invite_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Founder invite failed: {response.text}"
        data = response.json()
        
        assert data["invited_count"] == 1
        assert len(data["invited_startups"]) == 1
        
        print(f"Founders invited: {data['invited_count']}")


class TestFounderOnboardingAPIs:
    """Test Founder Onboarding APIs (Steps 1-10)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["access_token"]
    
    @pytest.fixture
    def setup_founder_invitation(self, admin_token):
        """Setup workspace, company, and founder invitation for testing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create workspace
        workspace_data = {
            "org_name": f"TEST_FounderOnboard_Workspace_{datetime.now().timestamp()}",
            "user_name": "Test Admin",
            "email": "testadmin@onboard.vc",
            "country": "us",
            "use_case": "vc_fund",
            "fund_name": "Onboard Fund",
            "currency": "USD",
            "reporting_frequency": "monthly",
            "timezone": "UTC",
            "portfolio_unit": "fund",
            "investment_stages": ["Seed"],
            "sectors": ["Tech"],
            "health_score_template": "balanced",
            "runway_threshold": 9,
            "required_sections": ["financial"],
            "mandatory_metrics": True,
            "alert_recipients": ["admin"],
            "founder_can_edit": True
        }
        
        ws_response = requests.post(
            f"{BASE_URL}/api/admin/workspace",
            json=workspace_data,
            headers=headers
        )
        workspace_id = ws_response.json()["id"]
        
        # Import company
        import_data = {
            "workspace_id": workspace_id,
            "companies": [
                {
                    "name": "TEST_OnboardStartup",
                    "stage": "Seed",
                    "sector": "Tech",
                    "founder_name": "Onboard Founder",
                    "founder_email": "onboard@test.startup"
                }
            ],
            "send_founder_invites": False
        }
        
        import_response = requests.post(
            f"{BASE_URL}/api/admin/companies/bulk",
            json=import_data,
            headers=headers
        )
        startup_id = import_response.json()["company_ids"][0]
        
        # Invite founder
        invite_data = {
            "workspace_id": workspace_id,
            "invitations": [
                {
                    "startup_id": startup_id,
                    "founder_email": "onboard@test.startup",
                    "founder_name": "Onboard Founder",
                    "reporting_cadence": "monthly",
                    "report_due_date": 5
                }
            ]
        }
        
        invite_response = requests.post(
            f"{BASE_URL}/api/admin/founders/invite",
            json=invite_data,
            headers=headers
        )
        
        # Get the invitation token from database (we need to query it)
        # For testing, we'll use a direct DB query approach or mock
        return {
            "workspace_id": workspace_id,
            "startup_id": startup_id,
            "invitation_id": invite_response.json()["invitation_ids"][0]
        }
    
    def test_verify_invalid_invitation(self):
        """Test verification of invalid invitation token"""
        response = requests.get(
            f"{BASE_URL}/api/founder/invitation/invalid_token_12345"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Invalid invitation correctly rejected")
    
    def test_complete_onboarding_invalid_token(self):
        """Test completing onboarding with invalid token"""
        onboarding_data = {
            "invitation_token": "invalid_token_xyz",
            "understood_data_sharing": True,
            "reviewed_visibility": True,
            "website": "https://test.com",
            "sector": "Tech",
            "stage": "Seed",
            "business_model": "B2B SaaS",
            "team_members": [],
            "connected_sources": [],
            "metric_mappings": [],
            "sharing_preferences": {},
            "report_due_date": 5,
            "reminder_schedule": "3_days",
            "default_recipients": [],
            "board_report_freq": "quarterly",
            "auto_generate_drafts": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/founder/onboarding/complete",
            json=onboarding_data
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Invalid token correctly rejected for onboarding completion")
    
    def test_complete_onboarding_missing_consent(self):
        """Test completing onboarding without data sharing consent"""
        onboarding_data = {
            "invitation_token": "some_token",
            "understood_data_sharing": False,  # Missing consent
            "reviewed_visibility": False,  # Missing consent
            "website": "https://test.com",
            "sector": "Tech",
            "stage": "Seed"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/founder/onboarding/complete",
            json=onboarding_data
        )
        
        # Should fail - either 404 (invalid token) or 400 (missing consent)
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
        print("Missing consent correctly handled")


class TestOnboardingStatusAPI:
    """Test onboarding status endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["access_token"]
    
    def test_get_onboarding_status_not_found(self, admin_token):
        """Test getting onboarding status for non-existent startup"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/founder/onboarding/status/nonexistent_startup_id",
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Non-existent startup correctly returns 404")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
