from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class GitHubConnection(BaseModel):
    """Model for storing GitHub OAuth connection details"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str  # The startup organization
    user_id: str  # Which user authorized this connection
    
    # OAuth tokens
    access_token: str
    token_type: str = "bearer"
    scope: str
    
    # GitHub account details
    github_user_id: int
    github_username: str
    github_email: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class GitHubRepository(BaseModel):
    """Model for GitHub repository"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str
    github_user_id: int
    
    repo_id: int
    name: str
    full_name: str
    description: Optional[str] = None
    
    # Repository stats
    language: Optional[str] = None
    stars: int = 0
    forks: int = 0
    open_issues: int = 0
    watchers: int = 0
    
    # Dates
    created_at: datetime
    updated_at: datetime
    pushed_at: Optional[datetime] = None
    
    # Status
    is_private: bool = False
    is_fork: bool = False
    is_archived: bool = False
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class GitHubCommit(BaseModel):
    """Model for GitHub commit"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str
    repo_id: int
    repo_name: str
    
    sha: str
    message: str
    author_name: str
    author_email: str
    
    # Stats
    additions: int = 0
    deletions: int = 0
    total_changes: int = 0
    
    # Date
    committed_date: datetime
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class GitHubPullRequest(BaseModel):
    """Model for GitHub pull request"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str
    repo_id: int
    repo_name: str
    
    pr_number: int
    title: str
    state: str  # open, closed, merged
    
    # Author
    author: str
    
    # Dates
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None
    merged_at: Optional[datetime] = None
    
    # Review stats
    comments: int = 0
    review_comments: int = 0
    commits: int = 0
    additions: int = 0
    deletions: int = 0
    changed_files: int = 0
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class GitHubMetrics(BaseModel):
    """Model for aggregated GitHub code metrics"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str
    github_user_id: int
    
    # Repository metrics
    total_repositories: int = 0
    active_repositories: int = 0  # Repos with commits in last 30 days
    
    # Commit metrics
    total_commits: int = 0
    commits_this_week: int = 0
    commits_this_month: int = 0
    
    # Pull request metrics
    total_prs: int = 0
    open_prs: int = 0
    merged_prs: int = 0
    closed_prs: int = 0
    
    # PR velocity
    average_pr_merge_time_hours: float = 0.0  # Average time to merge PRs
    average_pr_review_comments: float = 0.0
    
    # Contributor metrics
    total_contributors: int = 0
    active_contributors: int = 0  # Contributors in last 30 days
    
    # Code metrics
    total_additions: int = 0
    total_deletions: int = 0
    net_lines_changed: int = 0
    
    # Language breakdown
    languages: dict = {}  # {language: repo_count}
    
    # Top repositories (by activity)
    top_repos: List[dict] = []  # [{name, commits, prs}]
    
    # Metadata
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
