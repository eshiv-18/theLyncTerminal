import base64
import hmac
import hashlib
import aiohttp
from typing import Dict, Optional, Any, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class RazorpayClient:
    """Client for interacting with Razorpay API"""
    
    def __init__(self, key_id: str, key_secret: str, base_url: str = "https://api.razorpay.com/v1"):
        self.key_id = key_id
        self.key_secret = key_secret
        self.base_url = base_url
        
        # Create Basic Auth header
        auth_string = f"{key_id}:{key_secret}"
        auth_bytes = auth_string.encode('ascii')
        base64_bytes = base64.b64encode(auth_bytes)
        self.auth_header = base64_bytes.decode('ascii')
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        json: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to Razorpay API"""
        
        url = f"{self.base_url}{endpoint}"
        headers = {
            "Authorization": f"Basic {self.auth_header}",
            "Content-Type": "application/json"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method, url, headers=headers,
                    params=params, json=json,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    response_data = await response.json()
                    
                    if response.status == 401:
                        logger.error("Unauthorized - check Razorpay API credentials")
                        raise Exception("Unauthorized - invalid API credentials")
                    
                    if response.status >= 400:
                        error_msg = response_data.get("error", {}).get("description", "Unknown error")
                        logger.error(f"Razorpay API error {response.status}: {error_msg}")
                        raise Exception(f"API error: {error_msg}")
                    
                    return response_data
        
        except aiohttp.ClientError as e:
            logger.error(f"Connection error: {e}")
            raise Exception(f"Failed to connect to Razorpay: {str(e)}")
    
    async def create_order(
        self,
        amount: int,  # Amount in paise (e.g., 50000 for ₹500)
        currency: str = "INR",
        receipt: Optional[str] = None,
        notes: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Create a new payment order
        
        Args:
            amount: Amount in smallest currency unit (paise for INR)
            currency: Currency code (default INR)
            receipt: Receipt number for reference
            notes: Additional notes
        """
        data = {
            "amount": amount,
            "currency": currency,
            "receipt": receipt or f"receipt_{datetime.utcnow().timestamp()}",
            "notes": notes or {}
        }
        
        response = await self._make_request("POST", "/orders", json=data)
        return response
    
    async def get_payments(
        self,
        from_timestamp: Optional[int] = None,
        to_timestamp: Optional[int] = None,
        count: int = 100,
        skip: int = 0
    ) -> Dict[str, Any]:
        """
        Retrieve payments
        
        Args:
            from_timestamp: Unix timestamp to fetch payments from
            to_timestamp: Unix timestamp to fetch payments to
            count: Number of payments to fetch (max 100)
            skip: Number of payments to skip
        """
        params = {
            "count": count,
            "skip": skip
        }
        
        if from_timestamp:
            params["from"] = from_timestamp
        if to_timestamp:
            params["to"] = to_timestamp
        
        response = await self._make_request("GET", "/payments", params=params)
        return response
    
    async def get_payment(self, payment_id: str) -> Dict[str, Any]:
        """Fetch a specific payment by ID"""
        response = await self._make_request("GET", f"/payments/{payment_id}")
        return response
    
    async def capture_payment(
        self,
        payment_id: str,
        amount: int,
        currency: str = "INR"
    ) -> Dict[str, Any]:
        """Capture an authorized payment"""
        data = {
            "amount": amount,
            "currency": currency
        }
        
        response = await self._make_request(
            "POST",
            f"/payments/{payment_id}/capture",
            json=data
        )
        return response
    
    async def get_subscriptions(
        self,
        plan_id: Optional[str] = None,
        count: int = 100,
        skip: int = 0
    ) -> Dict[str, Any]:
        """
        Retrieve subscriptions
        
        Args:
            plan_id: Filter by plan ID
            count: Number of results (max 100)
            skip: Number to skip
        """
        params = {
            "count": count,
            "skip": skip
        }
        
        if plan_id:
            params["plan_id"] = plan_id
        
        response = await self._make_request("GET", "/subscriptions", params=params)
        return response
    
    async def get_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Fetch a specific subscription"""
        response = await self._make_request("GET", f"/subscriptions/{subscription_id}")
        return response
    
    async def cancel_subscription(
        self,
        subscription_id: str,
        cancel_at_cycle_end: bool = False
    ) -> Dict[str, Any]:
        """Cancel a subscription"""
        data = {
            "cancel_at_cycle_end": cancel_at_cycle_end
        }
        
        response = await self._make_request(
            "POST",
            f"/subscriptions/{subscription_id}/cancel",
            json=data
        )
        return response
    
    async def get_customers(
        self,
        count: int = 100,
        skip: int = 0
    ) -> Dict[str, Any]:
        """Retrieve customers"""
        params = {
            "count": count,
            "skip": skip
        }
        
        response = await self._make_request("GET", "/customers", params=params)
        return response
    
    async def create_customer(
        self,
        name: str,
        email: str,
        contact: Optional[str] = None,
        notes: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Create a new customer"""
        data = {
            "name": name,
            "email": email
        }
        
        if contact:
            data["contact"] = contact
        if notes:
            data["notes"] = notes
        
        response = await self._make_request("POST", "/customers", json=data)
        return response
    
    async def get_invoices(
        self,
        customer_id: Optional[str] = None,
        count: int = 100,
        skip: int = 0
    ) -> Dict[str, Any]:
        """Retrieve invoices"""
        params = {
            "count": count,
            "skip": skip
        }
        
        if customer_id:
            params["customer_id"] = customer_id
        
        response = await self._make_request("GET", "/invoices", params=params)
        return response
    
    @staticmethod
    def verify_webhook_signature(
        payload: bytes,
        signature: str,
        secret: str
    ) -> bool:
        """
        Verify Razorpay webhook signature
        
        Args:
            payload: Raw request body as bytes
            signature: X-Razorpay-Signature header value
            secret: Webhook secret from Razorpay dashboard
        
        Returns:
            True if signature is valid
        """
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)
    
    async def get_all_payments(
        self,
        from_timestamp: Optional[int] = None,
        to_timestamp: Optional[int] = None,
        max_results: int = 1000
    ) -> List[Dict]:
        """Fetch all payments with pagination"""
        all_payments = []
        skip = 0
        count = 100
        
        while len(all_payments) < max_results:
            response = await self.get_payments(
                from_timestamp=from_timestamp,
                to_timestamp=to_timestamp,
                count=count,
                skip=skip
            )
            
            items = response.get("items", [])
            if not items:
                break
            
            all_payments.extend(items)
            skip += count
            
            # Check if we've fetched all available
            if len(items) < count:
                break
        
        return all_payments[:max_results]
    
    async def get_all_subscriptions(self, max_results: int = 1000) -> List[Dict]:
        """Fetch all subscriptions with pagination"""
        all_subscriptions = []
        skip = 0
        count = 100
        
        while len(all_subscriptions) < max_results:
            response = await self.get_subscriptions(count=count, skip=skip)
            
            items = response.get("items", [])
            if not items:
                break
            
            all_subscriptions.extend(items)
            skip += count
            
            if len(items) < count:
                break
        
        return all_subscriptions[:max_results]
