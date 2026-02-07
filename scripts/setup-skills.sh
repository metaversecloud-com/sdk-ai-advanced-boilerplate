#!/usr/bin/env bash
# Setup Claude Code skills for Topia SDK app development
# Run once after cloning: bash scripts/setup-skills.sh
# Re-run anytime to pick up new skills added to this list.
#
# Requires: npx (comes with npm)
# Skills source: https://skills.sh

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

installed=0
failed=0

install_skill() {
  local name="$1"
  shift
  printf "${BLUE}Installing${NC} %-30s " "$name"
  if npx -y skills add "$@" > /dev/null 2>&1; then
    printf "${GREEN}done${NC}\n"
    ((installed++))
  else
    printf "${YELLOW}failed${NC}\n"
    ((failed++))
  fi
}

echo ""
echo "=== Claude Code Skills Setup for Topia SDK App ==="
echo ""

# ── Core Workflow ────────────────────────────────────────────
echo "Core workflow skills:"
install_skill "brainstorming"              @anthropic/brainstorming
install_skill "writing-plans"              @anthropic/writing-plans
install_skill "systematic-debugging"       @anthropic/systematic-debugging
install_skill "skill-creator"              @anthropic/skill-creator
install_skill "remembering-conversations"  @anthropic/remembering-conversations

# ── UI & Design ──────────────────────────────────────────────
echo ""
echo "UI & design skills:"
install_skill "frontend-design"            @anthropic/frontend-design
install_skill "web-design-guidelines"      @anthropic/web-design-guidelines
install_skill "theme-factory"              @anthropic/theme-factory
install_skill "accessibility-compliance"   @anthropic/accessibility-compliance

# ── Testing & QA ─────────────────────────────────────────────
echo ""
echo "Testing & QA skills:"
install_skill "webapp-testing"             @anthropic/webapp-testing
install_skill "agent-browser"              @anthropic/agent-browser

# ── Documentation ────────────────────────────────────────────
echo ""
echo "Documentation skills:"
install_skill "mermaid-diagrams"           @anthropic/mermaid-diagrams

# ── Animation (optional — install if building animations) ────
echo ""
echo "Animation skills (optional):"
install_skill "lottie-bodymovin"           dylantarre/animation-principles --skill lottie-bodymovin
install_skill "gsap"                       martinholovsky/claude-skills-generator --skill gsap
install_skill "motion (framer)"            jezweb/claude-skills --skill motion

# ── Video Generation (optional — install if creating canvas videos) ──
echo ""
echo "Video generation skills (optional):"
install_skill "remotion-best-practices"    remotion-dev/skills --skill remotion-best-practices

# ── Summary ──────────────────────────────────────────────────
echo ""
echo "=== Setup Complete ==="
echo -e "  ${GREEN}Installed${NC}: $installed"
if [ "$failed" -gt 0 ]; then
  echo -e "  ${YELLOW}Failed${NC}:    $failed (re-run to retry, or install manually via npx skills add)"
fi
echo ""
echo "Skills are now available as slash commands in Claude Code."
echo "See .ai/skills/README.md for usage guide."
