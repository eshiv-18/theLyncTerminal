from typing import Dict, Any, List
from datetime import datetime, timedelta
from services.github_client import GitHubClient
from models.github_models import GitHubMetrics
import logging

logger = logging.getLogger(__name__)


class GitHubMetricsService:
    """Service for aggregating code metrics from GitHub"""
    
    def __init__(self, github_client: GitHubClient, organization_id: str, github_user_id: int):
        self.client = github_client
        self.organization_id = organization_id
        self.github_user_id = github_user_id
    
    async def fetch_all_code_metrics(self) -> GitHubMetrics:
        """Fetch and aggregate all code metrics"""
        
        try:
            # Fetch repositories
            logger.info("Fetching GitHub repositories...")
            repositories = await self.client.get_all_repositories(max_repos=50)
            
            # Calculate time ranges
            now = datetime.utcnow()
            week_ago = (now - timedelta(days=7)).isoformat()
            month_ago = (now - timedelta(days=30)).isoformat()
            
            # Aggregate metrics from all repos
            total_commits = 0
            commits_this_week = 0
            commits_this_month = 0
            total_prs = 0
            open_prs = 0
            merged_prs = 0
            closed_prs = 0
            contributors_set = set()
            active_contributors_set = set()
            total_additions = 0
            total_deletions = 0
            languages = {}
            top_repos = []
            active_repos = 0
            
            # Process each repository
            for repo in repositories[:10]:  # Limit to top 10 active repos to avoid rate limits
                owner = repo["owner"]["login"]
                repo_name = repo["name"]
                full_name = repo["full_name"]
                language = repo.get("language")
                
                if language:
                    languages[language] = languages.get(language, 0) + 1
                
                try:
                    # Fetch commits for this repo
                    logger.info(f"Fetching commits for {full_name}...")
                    commits = await self.client.get_all_commits_for_repo(
                        owner=owner,
                        repo=repo_name,
                        since=month_ago,
                        max_commits=200
                    )
                    
                    repo_commits_count = len(commits)
                    total_commits += repo_commits_count
                    
                    # Count commits by time range
                    for commit in commits:
                        commit_date_str = commit.get("commit", {}).get("author", {}).get("date")
                        if commit_date_str:
                            commit_date = datetime.fromisoformat(commit_date_str.replace("Z", "+00:00"))
                            
                            if commit_date.isoformat() >= week_ago:
                                commits_this_week += 1
                            if commit_date.isoformat() >= month_ago:
                                commits_this_month += 1
                            
                            # Track contributors
                            author = commit.get("commit", {}).get("author", {}).get("name")
                            if author:
                                contributors_set.add(author)
                                if commit_date.isoformat() >= month_ago:
                                    active_contributors_set.add(author)
                    
                    # Check if repo is active
                    if repo_commits_count > 0:
                        active_repos += 1
                    
                    # Fetch pull requests
                    logger.info(f"Fetching pull requests for {full_name}...")
                    prs = await self.client.get_all_prs_for_repo(
                        owner=owner,
                        repo=repo_name,
                        state="all",
                        max_prs=100
                    )
                    
                    repo_prs_count = len(prs)
                    total_prs += repo_prs_count
                    
                    # PR metrics
                    repo_open_prs = 0
                    repo_merged_prs = 0
                    repo_closed_prs = 0
                    pr_merge_times = []
                    pr_review_comments = []
                    
                    for pr in prs:
                        state = pr.get("state")
                        merged_at = pr.get("merged_at")
                        
                        if state == "open":
                            open_prs += 1
                            repo_open_prs += 1
                        elif merged_at:
                            merged_prs += 1
                            repo_merged_prs += 1
                            
                            # Calculate merge time
                            created_at = pr.get("created_at")
                            if created_at and merged_at:
                                created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                                merged = datetime.fromisoformat(merged_at.replace("Z", "+00:00"))
                                merge_time = (merged - created).total_seconds() / 3600  # hours
                                pr_merge_times.append(merge_time)
                        else:
                            closed_prs += 1
                            repo_closed_prs += 1
                        
                        # Track review comments
                        review_comments = pr.get("review_comments", 0)
                        pr_review_comments.append(review_comments)
                    
                    # Track top repos
                    top_repos.append({
                        "name": full_name,
                        "commits": repo_commits_count,
                        "prs": repo_prs_count,
                        "open_prs": repo_open_prs
                    })
                    
                except Exception as e:
                    logger.warning(f"Error processing repo {full_name}: {str(e)}")
                    continue
            
            # Calculate averages
            average_pr_merge_time = (
                sum(pr_merge_times) / len(pr_merge_times)
                if pr_merge_times else 0.0
            )
            
            average_pr_review_comments = (
                sum(pr_review_comments) / len(pr_review_comments)
                if pr_review_comments else 0.0
            )
            
            # Sort top repos by activity
            top_repos = sorted(top_repos, key=lambda x: x["commits"], reverse=True)[:5]
            
            metrics = GitHubMetrics(
                organization_id=self.organization_id,
                github_user_id=self.github_user_id,
                total_repositories=len(repositories),
                active_repositories=active_repos,
                total_commits=total_commits,
                commits_this_week=commits_this_week,
                commits_this_month=commits_this_month,
                total_prs=total_prs,
                open_prs=open_prs,
                merged_prs=merged_prs,
                closed_prs=closed_prs,
                average_pr_merge_time_hours=round(average_pr_merge_time, 2),
                average_pr_review_comments=round(average_pr_review_comments, 2),
                total_contributors=len(contributors_set),
                active_contributors=len(active_contributors_set),
                total_additions=total_additions,
                total_deletions=total_deletions,
                net_lines_changed=total_additions - total_deletions,
                languages=languages,
                top_repos=top_repos,
                fetched_at=datetime.utcnow()
            )
            
            logger.info("GitHub code metrics aggregation complete")
            return metrics
        
        except Exception as e:
            logger.error(f"Error fetching GitHub metrics: {str(e)}")
            raise
