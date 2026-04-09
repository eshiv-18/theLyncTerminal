import asyncio
import aiohttp
from datetime import datetime
from typing import Dict, Optional, Any, List
import logging

logger = logging.getLogger(__name__)


class GitHubClient:
    """Client for interacting with GitHub API v3"""
    
    def __init__(self, access_token: str, api_domain: str = "https://api.github.com"):
        self.access_token = access_token
        self.api_domain = api_domain
        self.rate_limit_semaphore = asyncio.Semaphore(30)
        self.request_times = []
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        json: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to GitHub API with rate limiting"""
        
        # Basic rate limiting
        async with self.rate_limit_semaphore:
            pass
        
        url = f"{self.api_domain}{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Startup-Progress-Intel/1.0"
        }
        
        max_retries = 3
        base_delay = 1
        
        for attempt in range(max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.request(
                        method, url, headers=headers,
                        params=params, json=json,
                        timeout=aiohttp.ClientTimeout(total=30)
                    ) as response:
                        if response.status == 401:
                            logger.error("Unauthorized - access token may be expired")
                            raise Exception("Unauthorized - token expired")
                        
                        if response.status == 403:
                            # Rate limit hit
                            wait_time = base_delay * (2 ** attempt)
                            logger.warning(f"Rate limited, retrying in {wait_time}s")
                            await asyncio.sleep(wait_time)
                            continue
                        
                        if response.status >= 400:
                            error_text = await response.text()
                            logger.error(f"API error {response.status}: {error_text}")
                            raise Exception(f"API error: {error_text}")
                        
                        response_data = await response.json()
                        return response_data
            
            except aiohttp.ClientError as e:
                if attempt < max_retries - 1:
                    wait_time = base_delay * (2 ** attempt)
                    logger.warning(f"Connection error, retrying in {wait_time}s: {e}")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Failed after {max_retries} attempts: {e}")
                    raise
    
    async def get_user(self) -> Dict[str, Any]:
        """Get authenticated user information"""
        response = await self._make_request("GET", "/user")
        return response
    
    async def get_repositories(
        self,
        per_page: int = 100,
        page: int = 1,
        sort: str = "updated",
        direction: str = "desc"
    ) -> List[Dict[str, Any]]:
        """Get user's repositories"""
        params = {
            "per_page": per_page,
            "page": page,
            "sort": sort,
            "direction": direction
        }
        
        response = await self._make_request("GET", "/user/repos", params=params)
        return response if isinstance(response, list) else []
    
    async def get_repository(self, owner: str, repo: str) -> Dict[str, Any]:
        """Get specific repository details"""
        response = await self._make_request("GET", f"/repos/{owner}/{repo}")
        return response
    
    async def get_commits(
        self,
        owner: str,
        repo: str,
        since: Optional[str] = None,
        per_page: int = 100,
        page: int = 1
    ) -> List[Dict[str, Any]]:
        """Get commits for a repository"""
        params = {
            "per_page": per_page,
            "page": page
        }
        
        if since:
            params["since"] = since
        
        response = await self._make_request(
            "GET",
            f"/repos/{owner}/{repo}/commits",
            params=params
        )
        return response if isinstance(response, list) else []
    
    async def get_commit(self, owner: str, repo: str, sha: str) -> Dict[str, Any]:
        """Get detailed commit information"""
        response = await self._make_request(
            "GET",
            f"/repos/{owner}/{repo}/commits/{sha}"
        )
        return response
    
    async def get_pull_requests(
        self,
        owner: str,
        repo: str,
        state: str = "all",
        per_page: int = 100,
        page: int = 1
    ) -> List[Dict[str, Any]]:
        """Get pull requests for a repository"""
        params = {
            "state": state,
            "per_page": per_page,
            "page": page
        }
        
        response = await self._make_request(
            "GET",
            f"/repos/{owner}/{repo}/pulls",
            params=params
        )
        return response if isinstance(response, list) else []
    
    async def get_pull_request(
        self,
        owner: str,
        repo: str,
        pr_number: int
    ) -> Dict[str, Any]:
        """Get specific pull request details"""
        response = await self._make_request(
            "GET",
            f"/repos/{owner}/{repo}/pulls/{pr_number}"
        )
        return response
    
    async def get_contributors(
        self,
        owner: str,
        repo: str,
        per_page: int = 100
    ) -> List[Dict[str, Any]]:
        """Get repository contributors"""
        params = {"per_page": per_page}
        
        response = await self._make_request(
            "GET",
            f"/repos/{owner}/{repo}/contributors",
            params=params
        )
        return response if isinstance(response, list) else []
    
    async def get_languages(self, owner: str, repo: str) -> Dict[str, int]:
        """Get programming languages used in a repository"""
        response = await self._make_request(
            "GET",
            f"/repos/{owner}/{repo}/languages"
        )
        return response
    
    async def get_all_repositories(self, max_repos: int = 100) -> List[Dict]:
        """Fetch all user repositories with pagination"""
        all_repos = []
        page = 1
        per_page = 100
        
        while len(all_repos) < max_repos:
            repos = await self.get_repositories(per_page=per_page, page=page)
            
            if not repos:
                break
            
            all_repos.extend(repos)
            
            if len(repos) < per_page:
                break
            
            page += 1
        
        return all_repos[:max_repos]
    
    async def get_all_commits_for_repo(
        self,
        owner: str,
        repo: str,
        since: Optional[str] = None,
        max_commits: int = 500
    ) -> List[Dict]:
        """Fetch all commits for a repository with pagination"""
        all_commits = []
        page = 1
        per_page = 100
        
        while len(all_commits) < max_commits:
            commits = await self.get_commits(
                owner=owner,
                repo=repo,
                since=since,
                per_page=per_page,
                page=page
            )
            
            if not commits:
                break
            
            all_commits.extend(commits)
            
            if len(commits) < per_page:
                break
            
            page += 1
        
        return all_commits[:max_commits]
    
    async def get_all_prs_for_repo(
        self,
        owner: str,
        repo: str,
        state: str = "all",
        max_prs: int = 200
    ) -> List[Dict]:
        """Fetch all pull requests for a repository with pagination"""
        all_prs = []
        page = 1
        per_page = 100
        
        while len(all_prs) < max_prs:
            prs = await self.get_pull_requests(
                owner=owner,
                repo=repo,
                state=state,
                per_page=per_page,
                page=page
            )
            
            if not prs:
                break
            
            all_prs.extend(prs)
            
            if len(prs) < per_page:
                break
            
            page += 1
        
        return all_prs[:max_prs]
