# GitHub Private Email Fix Documentation

## Problem Description

### GitHub GH007 Error Overview

The **GH007 error** occurs when attempting to push commits to GitHub repositories that contain private email addresses. This error typically manifests as:

```
GH007: Your push would publish a private email address.
You can make your email public or disable this protection at:
https://github.com/settings/emails
```

### When This Error Occurs

This issue commonly happens when:
- Pushing commits that were made with a private email address configured in Git
- Working with repositories that have email privacy protection enabled
- Using development environments where commits were created with private email settings
- Collaborating on projects where different team members have different email visibility settings

### Impact

- **Blocks deployments** and continuous integration workflows
- **Prevents code pushes** to GitHub repositories
- **Disrupts development workflow** requiring immediate resolution
- **Affects team productivity** when multiple developers encounter this issue

## Root Cause

### Private Email Configuration

The primary cause is **existing commits containing private email addresses**:

1. **Git Configuration**: Local Git configuration may be set to use private email addresses
2. **Historical Commits**: Previous commits in the repository history contain private email addresses
3. **Email Privacy Settings**: GitHub's email privacy protection is enabled by default
4. **Mixed Email Usage**: Repository contains commits from both public and private email addresses

### Technical Details

```bash
# Common private email patterns that trigger GH007
user.private@example.com     # Private corporate email
user+private@company.com     # Private email with plus alias
private-user@internal.net    # Internal network email
```

## Solution Applied

### Complete Fix Process

#### Step 1: Environment Analysis
```bash
# Check current Git configuration
git config --global user.email
git config --local user.email

# Check recent commits for private emails
git log --format="%h %ae" -n 10
```

#### Step 2: Repository History Cleanup
```bash
# Method 1: Using git filter-branch (for older repositories)
git filter-branch --env-filter '
WRONG_EMAIL="wrong@example.com"
NEW_EMAIL="correct@example.com"
if [ "$GIT_COMMITTER_EMAIL" = "$WRONG_EMAIL" ]
then
    export GIT_COMMITTER_EMAIL="$NEW_EMAIL"
fi
if [ "$GIT_AUTHOR_EMAIL" = "$WRONG_EMAIL" ]
then
    export GIT_AUTHOR_EMAIL="$NEW_EMAIL"
fi
' --tag-name-filter cat -- --branches --tags
```

#### Step 3: Using BFG Repo-Cleaner (Recommended for large repositories)
```bash
# Download and use BFG Repo-Cleaner
java -jar bfg.jar --replace-text private-email-map.txt repository.git

# private-email-map.txt format:
wrong@example.com==>correct@example.com
user.private@company.com==>user.public@company.com
```

#### Step 4: Force Push After Cleanup
```bash
# Force push the cleaned history
git push --force-with-lease origin main

# Alternative for multiple branches
git push --force-with-lease origin --all
git push --force-with-lease origin --tags
```

### Alternative Solution: GitHub Email Settings

If repository history cleanup is not feasible:

1. **Make Email Public**: Change email visibility in GitHub settings
2. **Add Private Email to GitHub**: Register private email in GitHub account
3. **Use GitHub-provided Email**: Use `user@users.noreply.github.com`

## Prevention

### Best Practices for Email Management

#### 1. Use Public Email Addresses
```bash
# Set global Git configuration to use public email
git config --global user.email "your.email@example.com"
git config --global user.name "Your Name"
```

#### 2. Configure Repository-Specific Settings
```bash
# Set repository-specific email (if different from global)
git config user.email "project-specific@example.com"
```

#### 3. Use GitHub's Anonymous Email
```bash
# Enable GitHub's anonymous email feature
git config user.email "12345678+username@users.noreply.github.com"
```

### Team Guidelines

#### For Development Teams

1. **Standardize Email Configuration**
   ```bash
   # Create team configuration script
   #!/bin/bash
   git config --global user.email "team@company.com"
   git config --global user.name "Team Member"
   ```

2. **Pre-commit Hooks**
   ```bash
   #!/bin/sh
   # Pre-commit hook to check for private emails
   PRIVATE_EMAILS="private@company.com|internal@company.com"
   if git log -1 --format="%ae" | grep -qE "$PRIVATE_EMAILS"; then
       echo "Error: Commit contains private email address"
       exit 1
   fi
   ```

3. **CI/CD Pipeline Checks**
   ```yaml
   # GitHub Actions workflow
   - name: Check for private emails
     run: |
       if git log --format="%ae" | grep -q "private@"; then
         echo "Private email detected"
         exit 1
       fi
   ```

### Environment-Specific Configuration

#### Development Environment Setup
```bash
# .bashrc or .zshrc configuration
export GIT_AUTHOR_EMAIL="dev@public.example.com"
export GIT_COMMITTER_EMAIL="dev@public.example.com"
```

#### Production/Deployment Configuration
```bash
# Separate email for automated commits
git config user.email "ci@example.com"
git config user.name "CI/CD System"
```

## Verification Steps

### Confirming the Fix

#### 1. Check Git Configuration
```bash
# Verify email settings
git config --global user.email
git config --local user.email

# Check if emails are properly set
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
```

#### 2. Verify Repository History
```bash
# Check recent commits for public emails
git log --format="%h %an <%ae>" -n 5

# Search for any remaining private emails
git log --all --format="%ae" | grep -v "users.noreply.github.com" | sort | uniq
```

#### 3. Test Push Operation
```bash
# Attempt a test push to verify no GH007 error
git add .
git commit -m "Test: Verify GH007 fix"
git push origin feature-branch
```

#### 4. GitHub Email Verification
1. Go to GitHub Settings > Emails
2. Verify private emails are either:
   - Made public
   - Added to your GitHub account
   - Using GitHub's anonymous email service

### Monitoring and Alerts

#### Automated Monitoring
```bash
# Script to monitor for private emails in new commits
#!/bin/bash
PRIVATE_DOMAINS="private\.company\.com|internal\.net"

if git log --oneline -1 | grep -qE "$PRIVATE_DOMAINS"; then
    echo "Warning: Commit may contain private email"
    # Send alert or fail build
fi
```

## Related Information

### GitHub Official Documentation

- **[GitHub Email Settings](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/setting-your-commit-email-address)**: Official guide for configuring commit email addresses
- **[GitHub's Private Email Protection](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/blocking-command-line-pushes-that-expose-your-personal-email)**: Understanding GH007 protection
- **[BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)**: Tool for cleaning private data from Git history

### Additional Resources

- **[Git filter-branch Documentation](https://git-scm.com/docs/git-filter-branch)**: Manual method for cleaning Git history
- **[GitHub Community Discussions](https://github.community/)**: Community solutions and discussions
- **[Git Email Configuration Best Practices](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup)**: General Git email setup guidance

### Tools and Scripts

#### Repository Email Scanner
```bash
# Find all email addresses in repository
git log --format="%ae" --all | sort | uniq -c | sort -nr
```

#### Bulk Email Replacement Script
```bash
# Replace multiple private emails at once
git filter-branch -f --env-filter "
git_author_email='$GIT_AUTHOR_EMAIL'
git_committer_email='$GIT_COMMITTER_EMAIL'

# Replace old private emails with new public ones
git_author_email=\$(echo \$git_author_email | sed 's/old-private@company.com/new-public@company.com/g')
git_committer_email=\$(echo \$git_committer_email | sed 's/old-private@company.com/new-public@company.com/g')

export GIT_AUTHOR_EMAIL=\$git_author_email
export GIT_COMMITTER_EMAIL=\$git_committer_email
" HEAD
```

## Last Updated

This documentation was last updated on **October 19, 2025** to reflect the latest GitHub private email fix procedures and prevention strategies.

For questions or updates to this documentation, please refer to the project maintainers or submit updates through the standard documentation review process.