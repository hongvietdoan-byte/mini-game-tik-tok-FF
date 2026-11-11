"""Hook SessionStart (startup | clear | compact): in gói bàn giao để phiên coordinator TỰ đọc và làm tiếp.

Theo skill "vòng làm việc theo plan" của người dùng: context ~70 % → ghi gói bàn giao vào docs/HANDOFF.md với dòng in đậm đầu tiên
`**PHIÊN KẾ … — ĐỌC ĐẦU TIÊN.**`, commit + push, làm tiếp; Claude Code tự nén context (CLAUDE_CODE_AUTO_COMPACT_WINDOW ở
.claude/settings.json) → hook này nạp lại gói. KHÔNG clear / archive / mở phiên mới cho phiên chính (làm đứt Remote Control).
Nhận gói → sửa "ĐỌC ĐẦU TIÊN" thành "ĐÃ NHẬN <giờ>" + commit, để lần mở phiên sau không làm lại.
Đọc bản trên origin/main (worktree có thể cũ); lỗi mạng → bản cục bộ. Mọi lỗi → in một dòng, thoát 0 (không bao giờ chặn phiên).
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REL = "docs/HANDOFF.md"
MARK, TAKEN = "ĐỌC ĐẦU TIÊN", "ĐÃ NHẬN"
MAX_CHARS = 7000


def git(*args: str) -> str:
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, timeout=10, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip())
    return r.stdout


def bold_head(text: str) -> str:
    for line in text.splitlines():
        a = line.find("**")
        b = line.find("**", a + 2) if a >= 0 else -1
        if b > a:
            return line[a + 2:b]
    return ""


def main() -> None:
    source = ""
    try:
        source = json.loads(sys.stdin.read() or "{}").get("source", "")
    except Exception:
        pass
    try:
        git("fetch", "--quiet", "origin", "main")
        text = git("show", f"origin/main:{REL}")
        where = "origin/main"
    except Exception:
        try:
            text = open(os.path.join(ROOT, REL), encoding="utf-8").read()
            where = "bản cục bộ"
        except Exception as e:  # noqa: BLE001
            print(f"[handoff] không đọc được {REL}: {e}")
            return
    head = bold_head(text)
    pending = MARK in head
    if not pending and source != "compact":
        print(f"[handoff] Không có gói bàn giao mới ({REL} — {TAKEN if TAKEN in head else 'không có dấu'}). "
              "Coordinator: py tools/mb.py status && py tools/mb.py read --for coordinator")
        return
    intro = ("PHIÊN NÀY VỪA TỰ NÉN CONTEXT — đọc gói dưới và làm tiếp điều phối." if source == "compact"
             else "CÓ GÓI BÀN GIAO — đọc và làm tiếp theo gói, không chờ người dùng nhắc.")
    print(f"[handoff] {intro} ({REL}, {where})")
    print("Nhận gói: sửa 'ĐỌC ĐẦU TIÊN' → 'ĐÃ NHẬN <giờ>' trong dòng in đậm đầu tiên, commit + push. "
          "KHÔNG clear/archive/mở phiên mới cho phiên chính.\n")
    print(text[:MAX_CHARS] + ("\n…(cắt bớt, đọc đủ file)" if len(text) > MAX_CHARS else ""))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"[handoff] lỗi hook: {e}")
    sys.exit(0)
