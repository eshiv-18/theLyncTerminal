from typing import Dict, Any, List
from datetime import datetime, timedelta
from services.razorpay_client import RazorpayClient
from models.razorpay_models import RazorpayMetrics
import logging

logger = logging.getLogger(__name__)


class RazorpayMetricsService:
    """Service for aggregating payment metrics from Razorpay"""
    
    def __init__(self, razorpay_client: RazorpayClient, organization_id: str):
        self.client = razorpay_client
        self.organization_id = organization_id
    
    async def fetch_all_payment_metrics(self) -> RazorpayMetrics:
        """Fetch and aggregate all payment metrics"""
        
        try:
            # Calculate time ranges
            now = datetime.utcnow()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Quarter start
            current_quarter = (now.month - 1) // 3
            quarter_start_month = current_quarter * 3 + 1
            quarter_start = month_start.replace(month=quarter_start_month)
            
            # Year start
            year_start = month_start.replace(month=1)
            
            # Convert to Unix timestamps
            month_start_ts = int(month_start.timestamp())
            quarter_start_ts = int(quarter_start.timestamp())
            year_start_ts = int(year_start.timestamp())
            
            # Fetch payments
            logger.info("Fetching Razorpay payments...")
            payments = await self.client.get_all_payments(
                from_timestamp=year_start_ts,
                max_results=5000
            )
            
            # Fetch subscriptions
            logger.info("Fetching Razorpay subscriptions...")
            subscriptions = await self.client.get_all_subscriptions(max_results=1000)
            
            # Fetch customers
            logger.info("Fetching Razorpay customers...")
            customers_response = await self.client.get_customers(count=100)
            customers = customers_response.get("items", [])
            
            # Calculate metrics
            payment_metrics = self._calculate_payment_metrics(
                payments,
                month_start_ts,
                quarter_start_ts,
                year_start_ts
            )
            
            subscription_metrics = self._calculate_subscription_metrics(subscriptions)
            customer_metrics = self._calculate_customer_metrics(customers, month_start_ts)
            
            # Combine all metrics
            metrics = RazorpayMetrics(
                organization_id=self.organization_id,
                **payment_metrics,
                **subscription_metrics,
                **customer_metrics,
                fetched_at=datetime.utcnow()
            )
            
            logger.info("Razorpay payment metrics aggregation complete")
            return metrics
        
        except Exception as e:
            logger.error(f"Error fetching Razorpay metrics: {str(e)}")
            raise
    
    def _calculate_payment_metrics(
        self,
        payments: List[Dict],
        month_start_ts: int,
        quarter_start_ts: int,
        year_start_ts: int
    ) -> Dict[str, Any]:
        """Calculate payment-related metrics"""
        
        total_payments = len(payments)
        successful_payments = 0
        failed_payments = 0
        
        revenue_mtd = 0.0
        revenue_qtd = 0.0
        revenue_ytd = 0.0
        
        payment_methods = {}
        total_amount = 0.0
        
        for payment in payments:
            status = payment.get("status")
            amount = payment.get("amount", 0) / 100  # Convert paise to rupees
            created_at = payment.get("created_at", 0)
            method = payment.get("method", "unknown")
            
            # Count by status
            if status == "captured":
                successful_payments += 1
                total_amount += amount
                
                # Track payment methods
                payment_methods[method] = payment_methods.get(method, 0) + 1
                
                # Calculate revenue by time period
                if created_at >= month_start_ts:
                    revenue_mtd += amount
                    revenue_qtd += amount
                    revenue_ytd += amount
                elif created_at >= quarter_start_ts:
                    revenue_qtd += amount
                    revenue_ytd += amount
                elif created_at >= year_start_ts:
                    revenue_ytd += amount
            
            elif status in ["failed", "error"]:
                failed_payments += 1
        
        # Calculate average transaction value
        average_transaction_value = (
            total_amount / successful_payments 
            if successful_payments > 0 else 0.0
        )
        
        return {
            "total_payments": total_payments,
            "successful_payments": successful_payments,
            "failed_payments": failed_payments,
            "revenue_mtd": round(revenue_mtd, 2),
            "revenue_qtd": round(revenue_qtd, 2),
            "revenue_ytd": round(revenue_ytd, 2),
            "payment_methods": payment_methods,
            "average_transaction_value": round(average_transaction_value, 2)
        }
    
    def _calculate_subscription_metrics(self, subscriptions: List[Dict]) -> Dict[str, Any]:
        """Calculate subscription-related metrics"""
        
        total_subscriptions = len(subscriptions)
        active_subscriptions = 0
        cancelled_subscriptions = 0
        
        mrr = 0.0
        churned_mrr = 0.0
        
        # Get current month start for churn calculation
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_start_ts = int(month_start.timestamp())
        
        for subscription in subscriptions:
            status = subscription.get("status")
            plan_amount = subscription.get("plan_id_amount", 0) / 100  # Convert to rupees
            
            if status == "active":
                active_subscriptions += 1
                mrr += plan_amount
            
            elif status == "cancelled":
                cancelled_subscriptions += 1
                
                # Check if cancelled this month
                cancelled_at = subscription.get("cancelled_at", 0)
                if cancelled_at >= month_start_ts:
                    churned_mrr += plan_amount
        
        # Calculate ARR from MRR
        arr = mrr * 12
        
        # Calculate churn rate
        total_active_previous = active_subscriptions + cancelled_subscriptions
        churn_rate = (
            (cancelled_subscriptions / total_active_previous * 100)
            if total_active_previous > 0 else 0.0
        )
        
        return {
            "active_subscriptions": active_subscriptions,
            "total_subscriptions": total_subscriptions,
            "cancelled_subscriptions": cancelled_subscriptions,
            "mrr": round(mrr, 2),
            "arr": round(arr, 2),
            "churn_rate": round(churn_rate, 2),
            "churned_mrr": round(churned_mrr, 2)
        }
    
    def _calculate_customer_metrics(
        self,
        customers: List[Dict],
        month_start_ts: int
    ) -> Dict[str, Any]:
        """Calculate customer-related metrics"""
        
        total_customers = len(customers)
        new_customers_this_month = 0
        
        for customer in customers:
            created_at = customer.get("created_at", 0)
            
            if created_at >= month_start_ts:
                new_customers_this_month += 1
        
        return {
            "total_customers": total_customers,
            "new_customers_this_month": new_customers_this_month
        }
