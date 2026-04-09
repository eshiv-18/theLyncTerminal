from typing import Dict, Any, List
from datetime import datetime, timedelta
from services.hubspot_client import HubSpotClient
from models.hubspot_models import HubSpotMetrics
import logging

logger = logging.getLogger(__name__)


class HubSpotCRMService:
    """Service for aggregating CRM data from HubSpot"""
    
    def __init__(self, hubspot_client: HubSpotClient, organization_id: str, hub_id: str):
        self.client = hubspot_client
        self.organization_id = organization_id
        self.hub_id = hub_id
    
    async def fetch_all_crm_metrics(self) -> HubSpotMetrics:
        """Fetch and aggregate all CRM metrics"""
        
        try:
            # Fetch contacts
            logger.info("Fetching HubSpot contacts...")
            contacts = await self.client.get_all_contacts(
                properties=["email", "firstname", "lastname", "createdate", "lifecyclestage"],
                max_results=1000
            )
            
            # Fetch companies
            logger.info("Fetching HubSpot companies...")
            companies = await self.client.get_all_companies(
                properties=["name", "domain", "industry", "createdate"],
                max_results=1000
            )
            
            # Fetch deals
            logger.info("Fetching HubSpot deals...")
            deals = await self.client.get_all_deals(
                properties=[
                    "dealname", "amount", "closedate", "dealstage", 
                    "pipeline", "hs_is_closed_won", "hs_is_closed_lost",
                    "hs_mrr", "hs_arr", "createdate"
                ],
                max_results=1000
            )
            
            # Calculate metrics
            contact_metrics = self._calculate_contact_metrics(contacts)
            company_metrics = self._calculate_company_metrics(companies)
            deal_metrics = self._calculate_deal_metrics(deals)
            
            # Combine all metrics
            metrics = HubSpotMetrics(
                organization_id=self.organization_id,
                hub_id=self.hub_id,
                **contact_metrics,
                **company_metrics,
                **deal_metrics,
                fetched_at=datetime.utcnow()
            )
            
            logger.info("HubSpot CRM metrics aggregation complete")
            return metrics
        
        except Exception as e:
            logger.error(f"Error fetching HubSpot CRM metrics: {str(e)}")
            raise
    
    def _calculate_contact_metrics(self, contacts: List[Dict]) -> Dict[str, Any]:
        """Calculate contact-related metrics"""
        total_contacts = len(contacts)
        
        # Count new contacts this month
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        new_this_month = 0
        for contact in contacts:
            create_date_str = contact.get("properties", {}).get("createdate")
            if create_date_str:
                try:
                    create_date = datetime.fromisoformat(create_date_str.replace("Z", "+00:00"))
                    if create_date >= month_start:
                        new_this_month += 1
                except (ValueError, TypeError):
                    continue
        
        return {
            "total_contacts": total_contacts,
            "new_contacts_this_month": new_this_month
        }
    
    def _calculate_company_metrics(self, companies: List[Dict]) -> Dict[str, Any]:
        """Calculate company-related metrics"""
        total_companies = len(companies)
        
        # Count new companies this month
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        new_this_month = 0
        for company in companies:
            create_date_str = company.get("properties", {}).get("createdate")
            if create_date_str:
                try:
                    create_date = datetime.fromisoformat(create_date_str.replace("Z", "+00:00"))
                    if create_date >= month_start:
                        new_this_month += 1
                except (ValueError, TypeError):
                    continue
        
        return {
            "total_companies": total_companies,
            "new_companies_this_month": new_this_month
        }
    
    def _calculate_deal_metrics(self, deals: List[Dict]) -> Dict[str, Any]:
        """Calculate deal-related metrics"""
        total_deals = len(deals)
        open_deals = 0
        closed_won_deals = 0
        closed_lost_deals = 0
        
        pipeline_value = 0.0
        closed_won_revenue = 0.0
        monthly_recurring_revenue = 0.0
        annual_recurring_revenue = 0.0
        
        deals_by_stage = {}
        value_by_stage = {}
        
        for deal in deals:
            props = deal.get("properties", {})
            
            amount_str = props.get("amount", "0")
            try:
                amount = float(amount_str) if amount_str else 0.0
            except (ValueError, TypeError):
                amount = 0.0
            
            is_closed_won = props.get("hs_is_closed_won") == "true"
            is_closed_lost = props.get("hs_is_closed_lost") == "true"
            deal_stage = props.get("dealstage", "unknown")
            
            # Count deal statuses
            if is_closed_won:
                closed_won_deals += 1
                closed_won_revenue += amount
            elif is_closed_lost:
                closed_lost_deals += 1
            else:
                open_deals += 1
                pipeline_value += amount
            
            # Track by stage
            deals_by_stage[deal_stage] = deals_by_stage.get(deal_stage, 0) + 1
            value_by_stage[deal_stage] = value_by_stage.get(deal_stage, 0.0) + amount
            
            # Calculate MRR/ARR if available
            mrr_str = props.get("hs_mrr", "0")
            arr_str = props.get("hs_arr", "0")
            
            try:
                deal_mrr = float(mrr_str) if mrr_str else 0.0
                deal_arr = float(arr_str) if arr_str else 0.0
                
                if deal_mrr > 0:
                    monthly_recurring_revenue += deal_mrr
                if deal_arr > 0:
                    annual_recurring_revenue += deal_arr
            except (ValueError, TypeError):
                pass
        
        # Calculate win rate
        total_closed = closed_won_deals + closed_lost_deals
        win_rate = (closed_won_deals / total_closed * 100) if total_closed > 0 else 0.0
        
        # If ARR not set, calculate from MRR
        if annual_recurring_revenue == 0.0 and monthly_recurring_revenue > 0:
            annual_recurring_revenue = monthly_recurring_revenue * 12
        
        return {
            "total_deals": total_deals,
            "open_deals": open_deals,
            "closed_won_deals": closed_won_deals,
            "closed_lost_deals": closed_lost_deals,
            "pipeline_value": pipeline_value,
            "closed_won_revenue": closed_won_revenue,
            "monthly_recurring_revenue": monthly_recurring_revenue,
            "annual_recurring_revenue": annual_recurring_revenue,
            "win_rate": round(win_rate, 2),
            "deals_by_stage": deals_by_stage,
            "value_by_stage": value_by_stage
        }
