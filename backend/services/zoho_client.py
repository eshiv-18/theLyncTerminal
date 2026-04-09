import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
import logging

logger = logging.getLogger(__name__)


class ZohoBooksClient:
    """Client for interacting with Zoho Books API"""
    
    def __init__(
        self, 
        access_token: str, 
        organization_id: str, 
        api_domain: str = "https://www.zohoapis.com"
    ):
        self.access_token = access_token
        self.organization_id = organization_id
        self.api_domain = api_domain
        self.base_url = f"{api_domain}/books/v3"
        self.rate_limit_semaphore = asyncio.Semaphore(20)
        self.request_times = []  # Track request times for rate limiting
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        params: Optional[Dict] = None,
        data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to Zoho Books API with rate limiting and error handling"""
        
        # Enforce rate limiting (100 requests per minute)
        async with self.rate_limit_semaphore:
            now = datetime.now()
            # Remove requests older than 1 minute
            self.request_times = [
                t for t in self.request_times 
                if now - t < timedelta(minutes=1)
            ]
            
            if len(self.request_times) >= 100:
                sleep_time = 60 - (now - self.request_times[0]).total_seconds()
                if sleep_time > 0:
                    logger.warning(f"Rate limit approaching, waiting {sleep_time:.1f}s")
                    await asyncio.sleep(sleep_time)
            
            self.request_times.append(now)
        
        url = f"{self.base_url}/{endpoint}"
        headers = {
            "Authorization": f"Zoho-oauthtoken {self.access_token}",
            "Content-Type": "application/json"
        }
        
        # Add organization_id to params
        if params is None:
            params = {}
        params["organization_id"] = self.organization_id
        
        # Implement exponential backoff for retries
        max_retries = 3
        base_delay = 1
        
        for attempt in range(max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.request(
                        method, url, headers=headers, 
                        params=params, json=data, timeout=aiohttp.ClientTimeout(total=30)
                    ) as response:
                        response_data = await response.json()
                        
                        if response.status == 401:
                            logger.error("Unauthorized - access token may be expired")
                            raise Exception("Unauthorized - token expired")
                        
                        if response.status == 429:
                            wait_time = base_delay * (2 ** attempt)
                            logger.warning(f"Rate limited, retrying in {wait_time}s")
                            await asyncio.sleep(wait_time)
                            continue
                        
                        if response.status >= 400:
                            logger.error(f"API error {response.status}: {response_data}")
                            raise Exception(
                                f"API error: {response_data.get('message', 'Unknown error')}"
                            )
                        
                        return response_data
            
            except aiohttp.ClientError as e:
                if attempt < max_retries - 1:
                    wait_time = base_delay * (2 ** attempt)
                    logger.warning(f"Connection error, retrying in {wait_time}s: {e}")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Failed after {max_retries} attempts: {e}")
                    raise
    
    async def get_organizations(self) -> Dict[str, Any]:
        """Retrieve organizations accessible by the authenticated user"""
        response = await self._make_request("GET", "organizations", params={})
        return response
    
    async def get_invoices(
        self, 
        status: Optional[str] = None, 
        page: int = 1,
        per_page: int = 200
    ) -> Dict[str, Any]:
        """
        Retrieve invoices from Zoho Books
        
        Args:
            status: Filter by status (e.g., 'paid', 'unpaid', 'overdue')
            page: Page number for pagination
            per_page: Number of results per page (max 200)
        """
        params = {"page": page, "per_page": per_page}
        if status:
            params["status"] = status
        
        response = await self._make_request("GET", "invoices", params=params)
        return response
    
    async def get_expenses(
        self, 
        status: Optional[str] = None,
        page: int = 1,
        per_page: int = 200
    ) -> Dict[str, Any]:
        """
        Retrieve expenses from Zoho Books
        
        Args:
            status: Filter by status
            page: Page number for pagination
            per_page: Number of results per page
        """
        params = {"page": page, "per_page": per_page}
        if status:
            params["status"] = status
        
        response = await self._make_request("GET", "expenses", params=params)
        return response
    
    async def get_chart_of_accounts(self) -> Dict[str, Any]:
        """Retrieve chart of accounts from Zoho Books"""
        response = await self._make_request("GET", "chartofaccounts")
        return response
    
    async def get_bills(
        self,
        page: int = 1,
        per_page: int = 200
    ) -> Dict[str, Any]:
        """Retrieve bills from Zoho Books"""
        params = {"page": page, "per_page": per_page}
        response = await self._make_request("GET", "bills", params=params)
        return response
    
    async def get_bank_accounts(self) -> Dict[str, Any]:
        """Retrieve bank accounts from Zoho Books"""
        response = await self._make_request("GET", "bankaccounts")
        return response
