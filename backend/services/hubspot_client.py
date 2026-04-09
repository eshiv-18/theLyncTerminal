import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, Optional, Any, List
import logging

logger = logging.getLogger(__name__)


class HubSpotClient:
    """Client for interacting with HubSpot API v3"""
    
    def __init__(self, access_token: str, api_domain: str = "https://api.hubapi.com"):
        self.access_token = access_token
        self.api_domain = api_domain
        self.rate_limit_semaphore = asyncio.Semaphore(10)
        self.request_times = []  # Track request times for rate limiting
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        params: Optional[Dict] = None,
        data: Optional[Dict] = None,
        json: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to HubSpot API with rate limiting and error handling"""
        
        # Enforce rate limiting (HubSpot: 100 requests per 10 seconds)
        async with self.rate_limit_semaphore:
            now = datetime.now()
            # Remove requests older than 10 seconds
            self.request_times = [
                t for t in self.request_times 
                if now - t < timedelta(seconds=10)
            ]
            
            if len(self.request_times) >= 100:
                sleep_time = 10 - (now - self.request_times[0]).total_seconds()
                if sleep_time > 0:
                    logger.warning(f"Rate limit approaching, waiting {sleep_time:.1f}s")
                    await asyncio.sleep(sleep_time)
            
            self.request_times.append(now)
        
        url = f"{self.api_domain}{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        # Implement exponential backoff for retries
        max_retries = 3
        base_delay = 1
        
        for attempt in range(max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.request(
                        method, url, headers=headers, 
                        params=params, data=data, json=json,
                        timeout=aiohttp.ClientTimeout(total=30)
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
    
    async def get_contacts(
        self, 
        limit: int = 100,
        after: Optional[str] = None,
        properties: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Retrieve contacts from HubSpot
        
        Args:
            limit: Number of results per page (max 100)
            after: Pagination cursor
            properties: List of properties to retrieve
        """
        params = {"limit": limit}
        if after:
            params["after"] = after
        if properties:
            params["properties"] = ",".join(properties)
        
        response = await self._make_request("GET", "/crm/v3/objects/contacts", params=params)
        return response
    
    async def get_companies(
        self,
        limit: int = 100,
        after: Optional[str] = None,
        properties: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Retrieve companies from HubSpot"""
        params = {"limit": limit}
        if after:
            params["after"] = after
        if properties:
            params["properties"] = ",".join(properties)
        
        response = await self._make_request("GET", "/crm/v3/objects/companies", params=params)
        return response
    
    async def get_deals(
        self,
        limit: int = 100,
        after: Optional[str] = None,
        properties: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Retrieve deals from HubSpot"""
        params = {"limit": limit}
        if after:
            params["after"] = after
        if properties:
            params["properties"] = ",".join(properties)
        
        response = await self._make_request("GET", "/crm/v3/objects/deals", params=params)
        return response
    
    async def get_pipelines(self) -> Dict[str, Any]:
        """Retrieve deal pipelines"""
        response = await self._make_request("GET", "/crm/v3/pipelines/deals")
        return response
    
    async def get_deal_stages(self, pipeline_id: str) -> Dict[str, Any]:
        """Retrieve stages for a specific pipeline"""
        response = await self._make_request(
            "GET", 
            f"/crm/v3/pipelines/deals/{pipeline_id}"
        )
        return response
    
    async def search_contacts(
        self,
        filters: List[Dict],
        properties: Optional[List[str]] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Search contacts using filters
        
        Args:
            filters: List of filter objects
            properties: Properties to retrieve
            limit: Results per page
        """
        search_request = {
            "filterGroups": [{"filters": filters}],
            "properties": properties or [],
            "limit": limit
        }
        
        response = await self._make_request(
            "POST",
            "/crm/v3/objects/contacts/search",
            json=search_request
        )
        return response
    
    async def get_account_info(self) -> Dict[str, Any]:
        """Get HubSpot account details"""
        response = await self._make_request("GET", "/integrations/v1/me")
        return response
    
    async def get_all_contacts(
        self,
        properties: Optional[List[str]] = None,
        max_results: int = 1000
    ) -> List[Dict]:
        """Fetch all contacts with pagination"""
        all_contacts = []
        after = None
        
        while len(all_contacts) < max_results:
            response = await self.get_contacts(
                limit=100,
                after=after,
                properties=properties
            )
            
            results = response.get("results", [])
            all_contacts.extend(results)
            
            paging = response.get("paging", {})
            if not paging.get("next"):
                break
            
            after = paging["next"].get("after")
        
        return all_contacts[:max_results]
    
    async def get_all_companies(
        self,
        properties: Optional[List[str]] = None,
        max_results: int = 1000
    ) -> List[Dict]:
        """Fetch all companies with pagination"""
        all_companies = []
        after = None
        
        while len(all_companies) < max_results:
            response = await self.get_companies(
                limit=100,
                after=after,
                properties=properties
            )
            
            results = response.get("results", [])
            all_companies.extend(results)
            
            paging = response.get("paging", {})
            if not paging.get("next"):
                break
            
            after = paging["next"].get("after")
        
        return all_companies[:max_results]
    
    async def get_all_deals(
        self,
        properties: Optional[List[str]] = None,
        max_results: int = 1000
    ) -> List[Dict]:
        """Fetch all deals with pagination"""
        all_deals = []
        after = None
        
        while len(all_deals) < max_results:
            response = await self.get_deals(
                limit=100,
                after=after,
                properties=properties
            )
            
            results = response.get("results", [])
            all_deals.extend(results)
            
            paging = response.get("paging", {})
            if not paging.get("next"):
                break
            
            after = paging["next"].get("after")
        
        return all_deals[:max_results]
