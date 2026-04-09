import pytest
from unittest.mock import patch, AsyncMock
from services.github_client import GitHubClient


@pytest.mark.asyncio
async def test_github_client_initialization():
    """Test GitHubClient initialization"""
    client = GitHubClient(
        access_token="ghp_test_token_123",
        api_domain="https://api.github.com"
    )
    
    assert client.access_token == "ghp_test_token_123"
    assert client.api_domain == "https://api.github.com"
    assert client.rate_limit_semaphore._value == 30


@pytest.mark.asyncio
async def test_get_user_success():
    """Test successful authenticated user retrieval"""
    mock_response = {
        "login": "testuser",
        "id": 12345,
        "name": "Test User",
        "email": "test@example.com",
        "public_repos": 25
    }
    
    client = GitHubClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_user()
        
        assert result["login"] == "testuser"
        assert result["public_repos"] == 25
        mock_request.assert_called_once()


@pytest.mark.asyncio
async def test_get_repositories_success():
    """Test successful repositories retrieval"""
    mock_response = [
        {
            "id": 1,
            "name": "repo1",
            "full_name": "user/repo1",
            "private": False,
            "stargazers_count": 100
        },
        {
            "id": 2,
            "name": "repo2",
            "full_name": "user/repo2",
            "private": True,
            "stargazers_count": 50
        }
    ]
    
    client = GitHubClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_repositories(per_page=100)
        
        assert len(result) == 2
        assert result[0]["name"] == "repo1"
        assert result[1]["stargazers_count"] == 50


@pytest.mark.asyncio
async def test_get_repository_success():
    """Test fetching a specific repository"""
    mock_response = {
        "id": 123,
        "name": "awesome-repo",
        "full_name": "user/awesome-repo",
        "description": "An awesome repository",
        "language": "Python",
        "stargazers_count": 500,
        "forks_count": 50
    }
    
    client = GitHubClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_repository("user", "awesome-repo")
        
        assert result["name"] == "awesome-repo"
        assert result["language"] == "Python"
        assert result["stargazers_count"] == 500


@pytest.mark.asyncio
async def test_get_commits_success():
    """Test successful commits retrieval"""
    mock_response = [
        {
            "sha": "abc123",
            "commit": {
                "message": "Initial commit",
                "author": {
                    "name": "Developer",
                    "date": "2024-01-01T10:00:00Z"
                }
            }
        },
        {
            "sha": "def456",
            "commit": {
                "message": "Add feature",
                "author": {
                    "name": "Developer",
                    "date": "2024-01-02T10:00:00Z"
                }
            }
        }
    ]
    
    client = GitHubClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_commits("user", "repo1")
        
        assert len(result) == 2
        assert result[0]["sha"] == "abc123"
        assert result[1]["commit"]["message"] == "Add feature"


@pytest.mark.asyncio
async def test_get_commit_details_success():
    """Test fetching detailed commit information"""
    mock_response = {
        "sha": "xyz789",
        "commit": {
            "message": "Fix bug",
            "author": {"name": "Dev"}
        },
        "stats": {
            "additions": 50,
            "deletions": 20,
            "total": 70
        },
        "files": [
            {"filename": "app.py", "additions": 30, "deletions": 10}
        ]
    }
    
    client = GitHubClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_commit("user", "repo1", "xyz789")
        
        assert result["sha"] == "xyz789"
        assert result["stats"]["additions"] == 50
        assert len(result["files"]) == 1


@pytest.mark.asyncio
async def test_get_pull_requests_success():
    """Test successful pull requests retrieval"""
    mock_response = [
        {
            "id": 1,
            "number": 10,
            "title": "Add new feature",
            "state": "open",
            "user": {"login": "contributor"}
        },
        {
            "id": 2,
            "number": 11,
            "title": "Fix bug",
            "state": "closed",
            "user": {"login": "maintainer"}
        }
    ]
    
    client = GitHubClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_pull_requests("user", "repo1", state="all")
        
        assert len(result) == 2
        assert result[0]["number"] == 10
        assert result[1]["state"] == "closed"


@pytest.mark.asyncio
async def test_get_pull_request_details_success():
    """Test fetching a specific pull request"""
    mock_response = {
        "id": 100,
        "number": 5,
        "title": "Implement API",
        "state": "open",
        "merged": False,
        "additions": 150,
        "deletions": 30
    }
    
    client = GitHubClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_pull_request("user", "repo1", 5)
        
        assert result["number"] == 5
        assert result["title"] == "Implement API"
        assert result["additions"] == 150


@pytest.mark.asyncio
async def test_get_contributors_success():
    """Test successful contributors retrieval"""
    mock_response = [
        {
            "login": "dev1",
            "contributions": 100
        },
        {
            "login": "dev2",
            "contributions": 50
        }
    ]
    
    client = GitHubClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_contributors("user", "repo1")
        
        assert len(result) == 2
        assert result[0]["contributions"] == 100


@pytest.mark.asyncio
async def test_get_languages_success():
    """Test successful languages retrieval"""
    mock_response = {
        "Python": 50000,
        "JavaScript": 30000,
        "HTML": 10000
    }
    
    client = GitHubClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_languages("user", "repo1")
        
        assert result["Python"] == 50000
        assert result["JavaScript"] == 30000
        assert len(result) == 3


@pytest.mark.asyncio
async def test_unauthorized_error():
    """Test handling of 401 unauthorized error"""
    client = GitHubClient("expired_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.side_effect = Exception("Unauthorized - token expired")
        
        with pytest.raises(Exception) as exc_info:
            await client.get_user()
        
        assert "Unauthorized" in str(exc_info.value)


@pytest.mark.asyncio
async def test_rate_limit_error_403():
    """Test handling of 403 rate limit error"""
    client = GitHubClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.side_effect = Exception("API error: rate limit exceeded")
        
        with pytest.raises(Exception):
            await client.get_repositories()


@pytest.mark.asyncio
async def test_api_error_handling():
    """Test general API error handling"""
    client = GitHubClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.side_effect = Exception("API connection failed")
        
        with pytest.raises(Exception) as exc_info:
            await client.get_user()
        
        assert "API connection failed" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_all_repositories_with_pagination():
    """Test fetching all repositories with pagination"""
    mock_response_page1 = [{"id": i, "name": f"repo{i}"} for i in range(100)]
    mock_response_page2 = [{"id": i, "name": f"repo{i}"} for i in range(100, 150)]
    mock_response_page3 = []
    
    client = GitHubClient("fake_token")
    
    with patch.object(client, 'get_repositories', new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [
            mock_response_page1,
            mock_response_page2,
            mock_response_page3
        ]
        
        result = await client.get_all_repositories(max_repos=150)
        
        assert len(result) == 150
        assert mock_get.call_count == 2


@pytest.mark.asyncio
async def test_get_all_commits_with_pagination():
    """Test fetching all commits for a repo with pagination"""
    mock_response_page1 = [{"sha": f"sha{i}"} for i in range(100)]
    mock_response_page2 = [{"sha": f"sha{i}"} for i in range(100, 180)]
    
    client = GitHubClient("fake_token")
    
    with patch.object(client, 'get_commits', new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [mock_response_page1, mock_response_page2]
        
        result = await client.get_all_commits_for_repo(
            "user", "repo1", max_commits=180
        )
        
        assert len(result) == 180
        assert mock_get.call_count == 2


@pytest.mark.asyncio
async def test_get_all_prs_with_pagination():
    """Test fetching all pull requests for a repo with pagination"""
    mock_response_page1 = [{"number": i} for i in range(1, 101)]
    mock_response_page2 = [{"number": i} for i in range(101, 151)]
    
    client = GitHubClient("fake_token")
    
    with patch.object(client, 'get_pull_requests', new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [mock_response_page1, mock_response_page2]
        
        result = await client.get_all_prs_for_repo(
            "user", "repo1", state="all", max_prs=150
        )
        
        assert len(result) == 150
        assert mock_get.call_count == 2


@pytest.mark.asyncio
async def test_pagination_parameters():
    """Test that pagination parameters are passed correctly"""
    client = GitHubClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = []
        
        await client.get_repositories(per_page=50, page=2, sort="created", direction="asc")
        
        # Verify pagination params were passed
        call_params = mock_request.call_args[1]['params']
        assert call_params['per_page'] == 50
        assert call_params['page'] == 2
        assert call_params['sort'] == "created"
        assert call_params['direction'] == "asc"


@pytest.mark.asyncio
async def test_since_parameter_for_commits():
    """Test that 'since' parameter is passed correctly for commits"""
    client = GitHubClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = []
        
        since_date = "2024-01-01T00:00:00Z"
        await client.get_commits("user", "repo1", since=since_date)
        
        # Verify since parameter was passed
        call_params = mock_request.call_args[1]['params']
        assert call_params['since'] == since_date


@pytest.mark.asyncio
async def test_pr_state_filter():
    """Test that PR state filter is applied correctly"""
    client = GitHubClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = []
        
        await client.get_pull_requests("user", "repo1", state="closed")
        
        # Verify state filter was passed
        call_params = mock_request.call_args[1]['params']
        assert call_params['state'] == "closed"
