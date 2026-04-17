# Branch Protection Rules Setup

This guide shows how to configure GitHub branch protection rules to enforce CI checks before merging.

## 🎯 Objective

Prevent direct pushes to `main` and require all PR checks to pass before merge.

---

## 📋 Step-by-Step Setup

### 1. Navigate to Branch Protection Settings

```
GitHub Repository → Settings → Branches → Branch protection rules
```

Or direct URL:
```
https://github.com/rajeevrajora77-lab/AION-v1/settings/branches
```

### 2. Add Rule for `main` Branch

Click **"Add branch protection rule"**

**Branch name pattern**: `main`

### 3. Enable These Settings

#### ✅ Required Checks

- [x] **Require status checks to pass before merging**
  - [x] **Require branches to be up to date before merging**
  
  **Select these status checks** (from PR Checks workflow):
  - `code-quality`
  - `security`
  - `test`
  - `health-check`
  - `pr-quality-gate`

#### ✅ Pull Request Requirements

- [x] **Require a pull request before merging**
  - **Required approvals**: `1` (recommended for team projects)
  - [x] **Dismiss stale pull request approvals when new commits are pushed**
  - [x] **Require review from Code Owners** (optional)

#### ✅ Force Push Protection

- [x] **Do not allow bypassing the above settings**
- [x] **Restrict who can push to matching branches**
  - Add administrators and trusted team members only

#### ✅ Additional Settings

- [x] **Require signed commits** (optional, for extra security)
- [x] **Require linear history** (prevents messy merge commits)
- [x] **Include administrators** (even admins must follow rules)

### 4. Save Changes

Click **"Create"** or **"Save changes"**

---

## 🧪 Test Your Setup

### Create a Test PR

```bash
# Create a test branch
git checkout -b test/branch-protection

# Make a small change
echo "# Test" >> README.md

# Commit and push
git add .
git commit -m "test: verify branch protection"
git push origin test/branch-protection
```

### Expected Behavior

1. ✅ PR created successfully
2. ✅ All CI checks run automatically
3. ✅ "Merge" button is disabled until checks pass
4. ✅ After checks pass, "Merge" button becomes enabled
5. ✅ Direct push to `main` is blocked

### Test Direct Push (Should Fail)

```bash
git checkout main
echo "test" >> test.txt
git add .
git commit -m "test: direct push"
git push origin main
# Should see: "protected branch hook declined"
```

---

## 🎨 Visual Indicators

Once configured, you'll see:

### On Pull Requests
```
✓ All checks have passed
  ✓ code-quality
  ✓ security
  ✓ test
  ✓ health-check
  ✓ pr-quality-gate

[✓] Merge pull request
```

### On Failed Checks
```
✗ Some checks were not successful
  ✗ test — Failed
  ✓ code-quality
  ✓ security

[ ] Merge pull request (Blocked)
```

---

## 🚨 Troubleshooting

### Issue: Checks Don't Run

**Solution**: Ensure workflows are in `.github/workflows/` on the branch

```bash
git checkout main
ls -la .github/workflows/
# Should see: pr-checks.yml, ci-main.yml
```

### Issue: "Merge" Button Still Disabled After Checks Pass

**Possible causes**:
1. Required checks not selected in branch protection
2. Branch is not up to date with base
3. Required reviewers haven't approved

**Solution**: Click "Update branch" button in PR

### Issue: Can't Push Even After Checks Pass

**Solution**: You must create a PR and merge through GitHub UI

---

## 📊 Recommended Configuration

### For Solo Projects (You Only)
```yaml
Required checks: ✅ All 5 checks
Required approvals: 0
Include administrators: ✅ Yes
Linear history: ✅ Yes
```

### For Team Projects (2+ Developers)
```yaml
Required checks: ✅ All 5 checks
Required approvals: 1-2
Code Owners review: ✅ Yes
Include administrators: ✅ Yes
Linear history: ✅ Yes
Signed commits: ✅ Yes (recommended)
```

---
## ✅ Quick Setup Checklist

- [ ] Navigate to Settings → Branches
- [ ] Create rule for `main` branch
- [ ] Enable "Require status checks to pass"
- [ ] Select all 5 status checks
- [ ] Enable "Require pull request before merging"
- [ ] Set required approvals (0 for solo, 1+ for team)
- [ ] Enable "Do not allow bypassing"
- [ ] Enable "Include administrators"
- [ ] Save changes
- [ ] Test with dummy PR
- [ ] Verify direct push is blocked

---

## 🎯 Result

After setup:
- ✅ No direct pushes to `main`
- ✅ All PRs must pass tests
- ✅ Health checks verified
- ✅ Security scans run
- ✅ Code quality enforced
- ✅ Professional workflow

**Your repository is now production-grade! 🚀**
