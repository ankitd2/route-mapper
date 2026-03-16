---
name: Never commit code
description: User must review all code and behavior before committing — Claude must never run git commit
type: feedback
---

Never run `git commit` or `git push` under any circumstances.

**Why:** User wants to review all code and behavior changes themselves before any commit is created. This is a firm, permanent rule.

**How to apply:** Complete all code changes and checks, then stop. Tell the user what's ready to review and commit. Never stage, commit, or push on their behalf.
