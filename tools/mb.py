"""Hòm thư dạng file trong git để điều phối Codex (người làm) và coordinator (Claude/người dùng).

Mỗi thư là một file Markdown có front matter trong mailbox/to_<role>/.
Mỗi role chỉ ghi vào: thư mình gửi đi + mailbox/state/<role>.json (con trỏ đã đọc, heartbeat).
Nhờ vậy hai bên không bao giờ sửa cùng một file → không xung đột khi rebase.

Ví dụ:
  py tools/mb.py new --from codex1 --type report --ref C-0001 --title "Xong C1-C6" --body-file out/r.md
  py tools/mb.py read --for codex1            # in mọi thư chưa xử lý (không tự đánh dấu)
  py tools/mb.py done --for codex1 --id C-0108  # đánh dấu đã xử lý sau khi làm theo
  py tools/mb.py wait --for codex1 --timeout 1800
  py tools/mb.py heartbeat --role codex1 --state working --task C-0001 --note "đang làm C4"
  py tools/mb.py status
"""
from __future__ import annotations

import argparse
import contextlib
import datetime as dt
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOX = ROOT / "mailbox"
ROLES = {"codex1": "X", "codex2": "Y", "cloud": "Z", "coordinator": "C"}
WORKERS = ("codex1", "codex2", "cloud")  # mỗi làn một hộp thư riêng, cùng gửi về to_coordinator
# Làn chạy ở phiên cloud: KHÔNG được push main, chỉ push nhánh riêng của mình.
# Thư đi của làn này nằm ở mailbox/outbox_<vai>/ trên nhánh đó; coordinator (checkout main) tự "nhập"
# vào to_coordinator với số thứ tự mới khi chạy read/wait/status/unread (xem ingest_remote).
REMOTE_WORKERS = {"cloud": "claude/zen-dijkstra-sop0bt"}
TYPES = {"task", "report", "question", "answer", "ack", "note", "live_window", "blocked"}
NAME_RE = re.compile(r"^(?P<prefix>[CXYZ])-(?P<num>\d{4})__")
CO_AUTHOR = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"


def other(role: str, to: str | None = None) -> str:
    if role != "coordinator":
        return "coordinator"
    return to or "codex1"


def inbox(role: str) -> Path:
    return BOX / f"to_{role}"


def now() -> str:
    return dt.datetime.now().astimezone().isoformat(timespec="seconds")


LOCK = ROOT / ".git" / "mb.lock"
TRANSIENT = ("index.lock", "couldn't set", "cannot lock ref", "Cannot rebase onto multiple",
             "COMMIT_EDITMSG", "Permission denied", "unable to write new index file")


def _pid_alive(pid: int) -> bool:
    if os.name == "nt":
        import ctypes
        handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if not handle:
            return False
        code = ctypes.c_ulong()
        ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
        ctypes.windll.kernel32.CloseHandle(handle)
        return code.value == 259  # STILL_ACTIVE
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _lock_is_stale() -> bool:
    try:
        owner = int(LOCK.read_text(encoding="utf-8").split()[0])
    except (OSError, ValueError, IndexError):
        owner = None
    try:
        age = time.time() - LOCK.stat().st_mtime
    except FileNotFoundError:
        return False
    return age > 60 or (owner is not None and not _pid_alive(owner))


def _remove_lock(attempts: int = 10) -> None:
    # Windows: antivirus/tiến trình khác có thể giữ file trong chốc lát → thử lại thay vì để lại khoá
    for _ in range(attempts):
        try:
            LOCK.unlink()
            return
        except FileNotFoundError:
            return
        except PermissionError:
            time.sleep(0.2)
    print(f"[mb] cảnh báo: chưa xoá được {LOCK}; lần sau sẽ tự dọn vì tiến trình chủ đã kết thúc", file=sys.stderr)


@contextlib.contextmanager
def repo_lock(timeout: float = 90.0):
    """Hai agent dùng chung một worktree: chỉ một bên được chạy git tại một thời điểm."""
    deadline = time.monotonic() + timeout
    while True:
        try:
            fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, f"{os.getpid()} {now()}".encode())
            os.close(fd)
            break
        except (FileExistsError, PermissionError):
            if _lock_is_stale():
                _remove_lock(attempts=3)  # khoá bỏ lại do process chết giữa chừng
                continue
            if time.monotonic() >= deadline:
                raise RuntimeError(f"Không lấy được {LOCK} sau {timeout:.0f}s")
            time.sleep(0.5)
    try:
        yield
    finally:
        _remove_lock()


def git(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    for attempt in range(5):
        proc = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True,
                              encoding="utf-8", errors="replace")
        if any(marker in proc.stderr for marker in TRANSIENT) and attempt < 4:
            time.sleep(1.5)  # agent khác đang thao tác git trong cùng worktree
            continue
        break
    if check and proc.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} lỗi:\n{proc.stdout}{proc.stderr}")
    return proc


def has_remote() -> bool:
    return bool(git("remote", check=False).stdout.strip())


def current_branch() -> str:
    return git("rev-parse", "--abbrev-ref", "HEAD", check=False).stdout.strip()


def remote_role() -> str | None:
    """Vai cloud nếu checkout đang ở nhánh riêng của một làn cloud (phiên cloud), ngược lại None."""
    branch = current_branch()
    return next((role for role, b in REMOTE_WORKERS.items() if b == branch), None)


def push_branch() -> str:
    role = remote_role()
    return REMOTE_WORKERS[role] if role else "main"


def outbox(role: str) -> Path:
    return BOX / f"outbox_{role}"


def ensure_main_checkout() -> None:
    """Hòm thư chỉ chạy được từ checkout chính đang ở nhánh main.

    Trong worktree khác, `.git` là file (khoá mb.lock hỏng) và `push origin main` đẩy nhầm ref local main.
    """
    branch = current_branch()
    if remote_role():
        return  # phiên cloud: checkout nhánh riêng, mb.py tự gộp main để nhận thư
    if not (ROOT / ".git").is_dir() or branch != "main":
        raise SystemExit(f"[mb] LỖI: {ROOT} không phải checkout chính ở nhánh main (nhánh hiện tại: {branch or '?'}).\n"
                         "Hãy gọi mb.py của thư mục chính: py \"E:\\Ai\\2026\\Trend mini game tiktok\\tools\\mb.py\" ...")


PULL_OK = True


def rebase_in_progress() -> bool:
    return (ROOT / ".git" / "rebase-merge").exists() or (ROOT / ".git" / "rebase-apply").exists()


def tree_dirty() -> bool:
    """Có thay đổi đã theo dõi chưa commit (code đang sửa dở của agent khác)."""
    return bool(git("status", "--porcelain", "--untracked-files=no", check=False).stdout.strip())


def pull() -> bool:
    global PULL_OK
    if not has_remote():
        return True
    if rebase_in_progress():
        PULL_OK = False
        print("[mb] CẢNH BÁO: checkout đang dở một lần rebase (.git/rebase-merge). Không pull để khỏi làm hỏng thêm; "
              "báo coordinator xử lý (git rebase --continue hoặc --quit sau khi xem).", file=sys.stderr)
        return False
    if remote_role():
        return _pull_remote()
    with repo_lock():
        # Ghi rõ origin main: FETCH_HEAD nhiều dòng (do fetch song song) làm rebase báo "multiple branches".
        # Khi có code đang sửa dở: không autostash (từng kẹt rebase và cất mất code sửa dở của agent khác);
        # chỉ fetch + fast-forward, vì thư chỉ đổi file trong mailbox/ nên không đụng code.
        if tree_dirty():
            proc = git("fetch", "--quiet", "origin", "main", check=False)
            if proc.returncode == 0:
                proc = git("merge", "--ff-only", "--quiet", "FETCH_HEAD", check=False)
        else:
            proc = git("pull", "--rebase", "--quiet", "origin", "main", check=False)
    PULL_OK = proc.returncode == 0
    if not PULL_OK:
        print(f"[mb] CẢNH BÁO: pull lỗi, đang dùng bản local có thể CŨ — thư mới có thể chưa hiện.\n"
              f"{proc.stderr.strip()}", file=sys.stderr)
    return PULL_OK


def _pull_remote() -> bool:
    """Phiên cloud: đồng bộ nhánh riêng với remote rồi gộp origin/main (để nhận thư to_<vai>)."""
    global PULL_OK
    branch = push_branch()
    with repo_lock():
        proc = git("fetch", "--quiet", "origin", "main", branch, check=False)
        if proc.returncode != 0:  # nhánh cloud chưa có trên remote (lần đầu) → chỉ lấy main
            proc = git("fetch", "--quiet", "origin", "main", check=False)
        if proc.returncode == 0 and git("rev-parse", "--verify", "--quiet", f"origin/{branch}",
                                        check=False).returncode == 0:
            proc = git("merge", "--ff-only", "--quiet", f"origin/{branch}", check=False)
            if proc.returncode != 0:  # nhánh local có commit chưa push → rebase lên remote
                proc = git("pull", "--rebase", "--quiet", "origin", branch, check=False)
        if proc.returncode == 0:
            if tree_dirty():
                # Code đang sửa dở: không gộp main (tránh đụng). Đọc thư trực tiếp từ origin/main.
                proc = subprocess.CompletedProcess([], 0, "", "")
                print("[mb] CẢNH BÁO: có thay đổi chưa commit → chưa gộp origin/main, thư mới có thể chưa hiện. "
                      "Commit (hoặc stash) code rồi chạy lại.", file=sys.stderr)
            else:
                proc = git("merge", "--no-edit", "--quiet", "origin/main", "-m",
                           f"mailbox: gộp main vào {branch}", check=False)
                if proc.returncode != 0:
                    git("merge", "--abort", check=False)
    PULL_OK = proc.returncode == 0
    if not PULL_OK:
        print(f"[mb] CẢNH BÁO: đồng bộ nhánh {branch} lỗi:\n{proc.stdout.strip()}\n{proc.stderr.strip()}",
              file=sys.stderr)
    return PULL_OK


def commit_and_push(paths: list[Path], message: str, role: str) -> None:
    with repo_lock():
        pushed = _commit(paths, message, role)
    if pushed is False:
        for _ in range(3):
            pull()
            with repo_lock():
                if git("push", "--quiet", "origin", push_branch(), check=False).returncode == 0:
                    return
        print("[mb] cảnh báo: push thất bại sau 3 lần; thư đã commit local", file=sys.stderr)


def _commit(paths: list[Path], message: str, role: str) -> bool | None:
    """Commit + push một lần. Trả về None nếu không cần push, True/False theo kết quả push."""
    rel = [str(p.relative_to(ROOT)) for p in paths]
    git("add", "--", *rel)
    if not git("diff", "--cached", "--quiet", "--", *rel, check=False).returncode:
        return None  # không có gì thay đổi
    if role in ("coordinator", "cloud"):
        message = f"{message}\n\n{CO_AUTHOR}"
    proc = git("commit", "-m", message, "--only", "--", *rel, check=False)
    if proc.returncode != 0 and not git("diff", "HEAD", "--quiet", "--", *rel, check=False).returncode == 0:
        raise RuntimeError(f"git commit lỗi:\n{proc.stdout}{proc.stderr}")
    if not has_remote():
        return None
    branch = push_branch()
    return git("push", "--quiet", "-u", "origin", branch, check=False).returncode == 0


def state_path(role: str) -> Path:
    return BOX / "state" / f"{role}.json"


def load_state(role: str) -> dict:
    path = state_path(role)
    if role in REMOTE_WORKERS and remote_role() != role and has_remote():
        path = BOX / "state" / f"{role}.mirror.json"  # trên main: bản sao do ingest_remote chép từ nhánh cloud
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"role": role, "last_read": 0, "heartbeat": None, "state": "idle", "task": None, "note": ""}


def save_state(role: str, data: dict) -> Path:
    path = state_path(role)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def messages(role: str) -> list[tuple[int, Path]]:
    return scan(inbox(role))


def scan(folder: Path) -> list[tuple[int, Path]]:
    found = []
    for path in sorted(folder.glob("*.md")):
        match = NAME_RE.match(path.name)
        if match and path.stat().st_size > 0:
            found.append((int(match["num"]), path))
    return sorted(found)


def unread(role: str) -> list[tuple[int, Path]]:
    """Thư chưa xử lý: số > con trỏ last_read và chưa nằm trong danh sách done."""
    state = load_state(role)
    cursor = int(state.get("last_read", 0))
    handled = {int(n) for n in state.get("done", [])}
    return [(num, path) for num, path in messages(role) if num > cursor and num not in handled]


def header_field(path: Path, key: str) -> str:
    for line in path.read_text(encoding="utf-8").splitlines()[1:14]:
        if line.startswith(f"{key}:"):
            return line.split(":", 1)[1].strip()
        if line == "---":
            break
    return ""


def mark_done(role: str, nums: list[int]) -> dict:
    """Ghi các thư đã xử lý; dồn con trỏ last_read khi các số đã liền mạch để danh sách done không phình."""
    state = load_state(role)
    cursor = int(state.get("last_read", 0))
    handled = {int(n) for n in state.get("done", [])} | set(nums)
    pending = [num for num, _ in messages(role) if num > cursor]
    for num in pending:
        if num not in handled:
            break
        cursor = num
    state["last_read"] = cursor
    state["done"] = sorted(n for n in handled if n > cursor)
    state["heartbeat"] = now()
    return state


def slug(text: str) -> str:
    # Tên file ASCII để tránh lỗi mã hoá đường dẫn giữa các công cụ trên Windows
    text = unicodedata.normalize("NFKD", text.casefold().replace("đ", "d"))
    text = text.encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-z0-9_-]+", "-", text).strip("-")
    return text[:48] or "msg"


def cmd_new(args) -> None:
    sender = args.sender
    if args.to and (sender != "coordinator" or args.to not in WORKERS):
        raise SystemExit(f"--to chỉ dùng cho coordinator, giá trị thuộc {list(WORKERS)}")
    target = other(sender, args.to)
    if sender in REMOTE_WORKERS and remote_role() != sender:
        raise SystemExit(f"[mb] vai {sender} chỉ gửi thư từ phiên cloud (nhánh {REMOTE_WORKERS[sender]})")
    if args.type not in TYPES:
        raise SystemExit(f"type phải thuộc {sorted(TYPES)}")
    if args.body_file:
        body = Path(args.body_file).read_text(encoding="utf-8-sig")
    else:
        # Đọc bytes: stdin của PowerShell không phải lúc nào cũng là UTF-8
        raw = sys.stdin.buffer.read()
        try:
            body = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            body = raw.decode(sys.stdin.encoding or "utf-8", errors="replace")
    if not body.strip():
        raise SystemExit("Thân thư rỗng")
    pull()
    # Làn cloud không push được main → thư đi nằm ở outbox riêng, coordinator nhập vào to_coordinator sau
    folder = outbox(sender) if sender in REMOTE_WORKERS else inbox(target)
    folder.mkdir(parents=True, exist_ok=True)
    # Thư của coordinator đánh số chung qua mọi hộp thư Codex để id C-xxxx không trùng giữa hai nhánh
    if sender in REMOTE_WORKERS:
        nums = [num for num, _ in scan(folder)]
    else:
        boxes = WORKERS if sender == "coordinator" else (target,)
        nums = [num for box in boxes for num, _ in messages(box)]
    num = (max(nums) + 1) if nums else 1
    msg_id = f"{ROLES[sender]}-{num:04d}"
    path = folder / f"{msg_id}__{args.type}__{slug(args.title)}.md"
    header = ["---", f"id: {msg_id}", f"from: {sender}", f"to: {target}", f"type: {args.type}",
              f"title: {args.title}", f"ref: {args.ref or ''}", f"priority: {args.priority}",
              f"needs: {args.needs or ''}", f"created: {now()}", "---", ""]
    # Ghi nguyên khối: lỗi giữa chừng không để lại thư rỗng chiếm số thứ tự
    tmp = path.with_suffix(".tmp")
    tmp.write_text("\n".join(header) + body.rstrip() + "\n", encoding="utf-8", errors="replace")
    tmp.replace(path)
    commit_and_push([path], f"mailbox: {msg_id} {args.type} — {args.title}", sender)
    print(path.relative_to(ROOT))


INGEST = BOX / "state" / "ingest.json"


def mirror_state_path(role: str) -> Path:
    # Bản sao trạng thái làn cloud trên main; tên khác state/<vai>.json để không xung đột khi gộp nhánh
    return BOX / "state" / f"{role}.mirror.json"


def ingest_remote() -> list[Path]:
    """Coordinator (checkout main): nhập thư outbox_<vai> từ nhánh cloud vào to_coordinator, đánh số mới."""
    if remote_role() or not has_remote() or current_branch() != "main":
        return []
    log = json.loads(INGEST.read_text(encoding="utf-8")) if INGEST.is_file() else {}
    changed: list[Path] = []
    for role, branch in REMOTE_WORKERS.items():
        ref = f"origin/{branch}"
        with repo_lock():
            if git("fetch", "--quiet", "origin", branch, check=False).returncode != 0:
                continue
        seen = set(log.get(role, []))
        listing = git("ls-tree", "--name-only", ref, f"mailbox/outbox_{role}/", check=False).stdout.split()
        for rel in sorted(listing):
            name = Path(rel).name
            match = NAME_RE.match(name)
            if not match or name in seen:
                continue
            body = git("show", f"{ref}:{rel}").stdout
            nums = [num for num, _ in messages("coordinator")]
            num = (max(nums) + 1) if nums else 1
            new_id = f"{ROLES[role]}-{num:04d}"
            old_id = name.split("__")[0]
            body = body.replace(f"id: {old_id}\n", f"id: {new_id}\noutbox_id: {old_id}\n", 1)
            dest = inbox("coordinator") / name.replace(old_id, new_id, 1)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(body, encoding="utf-8")
            seen.add(name)
            changed.append(dest)
        state = git("show", f"{ref}:mailbox/state/{role}.json", check=False)
        if state.returncode == 0:
            mirror = mirror_state_path(role)
            if not mirror.is_file() or mirror.read_text(encoding="utf-8") != state.stdout:
                mirror.parent.mkdir(parents=True, exist_ok=True)
                mirror.write_text(state.stdout, encoding="utf-8")
                changed.append(mirror)
        log[role] = sorted(seen)
    if changed:
        INGEST.write_text(json.dumps(log, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        new_msgs = [p for p in changed if p.suffix == ".md"]
        title = ", ".join(p.stem.split("__")[0] for p in new_msgs) or "trạng thái"
        commit_and_push([*changed, INGEST], f"mailbox: nhập thư làn cloud ({title})", "coordinator")
    return changed


def sync() -> bool:
    ok = pull()
    ingest_remote()
    return ok


def cmd_read(args) -> None:
    """In mọi thư CHƯA XỬ LÝ, không tự đánh dấu: thư còn hiện lại cho tới khi chạy `done`."""
    sync()
    pending = unread(args.role)
    if not pending:
        print("(không có thư chưa xử lý)")
        return
    print(f"===== {len(pending)} THƯ CHƯA XỬ LÝ cho {args.role} (đọc HẾT, làm theo, rồi chạy lệnh done ở cuối) =====")
    for _, path in pending:
        print(f"  - {path.stem.split('__')[0]} [{header_field(path, 'type')}] ref={header_field(path, 'ref') or '-'}: "
              f"{header_field(path, 'title')}")
    for _, path in pending:
        print(f"\n===== {path.relative_to(ROOT)} =====")
        print(path.read_text(encoding="utf-8"))
    ids = " ".join(path.stem.split("__")[0] for _, path in pending)
    print(f"\n===== HẾT {len(pending)} THƯ. Thư mới hơn đè lên thư cũ và lên kế hoạch đang làm. =====")
    print(f"Sau khi đã làm theo, đánh dấu: py \"{ROOT / 'tools' / 'mb.py'}\" done --for {args.role} --id {ids}")


def cmd_done(args) -> None:
    pull()
    known = {num: path for num, path in messages(args.role)}
    nums = []
    for raw in args.ids:
        match = re.fullmatch(r"(?:[CXYZ]-)?(\d{1,4})", raw.strip())
        if not match or int(match[1]) not in known:
            raise SystemExit(f"[mb] không có thư {raw} trong hộp {args.role}")
        nums.append(int(match[1]))
    state = mark_done(args.role, nums)
    commit_and_push([save_state(args.role, state)],
                    f"mailbox: {args.role} đã xử lý {', '.join(f'#{n:04d}' for n in sorted(nums))}", args.role)
    left = unread(args.role)
    print(f"Đã đánh dấu xử lý: {', '.join(f'#{n:04d}' for n in sorted(nums))}. Còn chưa xử lý: {len(left)}")
    for _, path in left:
        print(f"  - {path.name}")


def cmd_unread(args) -> None:
    sync()
    for _, path in unread(args.role):
        print(path.relative_to(ROOT))


def cmd_wait(args) -> None:
    deadline = time.monotonic() + args.timeout
    while True:
        sync()
        pending = unread(args.role)
        if pending:
            for _, path in pending:
                print(path.relative_to(ROOT))
            return
        if time.monotonic() >= deadline:
            print("(hết thời gian chờ, không có thư mới)")
            raise SystemExit(3)
        time.sleep(args.interval)


def cmd_heartbeat(args) -> None:
    pull()
    state = load_state(args.role)
    state.update({"heartbeat": now(), "state": args.state, "task": args.task, "note": args.note or ""})
    commit_and_push([save_state(args.role, state)], f"mailbox: {args.role} {args.state} {args.task or ''}".strip(),
                    args.role)
    pending = unread(args.role)
    print(f"Đã ghi heartbeat cho vai '{args.role}' lúc {state['heartbeat']}.")
    if pending:
        print(f"CHÚ Ý: vai '{args.role}' còn {len(pending)} thư CHƯA XỬ LÝ — chạy read --for {args.role} và làm theo.")


def answered_questions(role: str) -> list[str]:
    """Câu hỏi/blocked của một vai Codex đã có thư trả lời (ref) của coordinator nhưng thư đó chưa xử lý."""
    pending = {header_field(path, "ref"): path for _, path in unread(role)}
    lines = []
    for _, path in messages("coordinator"):
        if header_field(path, "from") != role or header_field(path, "type") not in ("question", "blocked"):
            continue
        qid = path.stem.split("__")[0]
        if qid in pending:
            lines.append(f"{qid} ĐÃ CÓ TRẢ LỜI: {pending[qid].stem.split('__')[0]} (chưa xử lý)")
    return lines


def cmd_status(_args) -> None:
    sync()
    if not PULL_OK:
        print("!!! pull lỗi: trạng thái dưới đây có thể CŨ !!!")
    for role in ROLES:
        state = load_state(role)
        print(f"{role:12} state={state.get('state')} task={state.get('task')} "
              f"heartbeat={state.get('heartbeat')} last_read={state.get('last_read')} "
              f"unread={len(unread(role))}")
        if state.get("note"):
            print(f"{'':12} note: {state['note']}")
        if role in WORKERS:
            for line in answered_questions(role):
                print(f"{'':12} >>> {line}")


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(description="Hòm thư điều phối Codex qua git")
    sub = parser.add_subparsers(dest="cmd", required=True)
    new = sub.add_parser("new", help="gửi thư")
    new.add_argument("--from", dest="sender", choices=sorted(ROLES), required=True)
    new.add_argument("--to", choices=WORKERS, help="coordinator chọn làn nhận (mặc định codex1)")
    new.add_argument("--type", required=True)
    new.add_argument("--title", required=True)
    new.add_argument("--ref")
    new.add_argument("--priority", default="normal", choices=["low", "normal", "high"])
    new.add_argument("--needs", help="ví dụ: user (cần người dùng thao tác/trả lời)")
    new.add_argument("--body-file", help="file Markdown chứa thân thư; bỏ trống thì đọc stdin")
    new.set_defaults(func=cmd_new)
    for name, func, help_text in (("read", cmd_read, "in mọi thư chưa xử lý (không tự đánh dấu)"),
                                  ("unread", cmd_unread, "liệt kê thư chưa xử lý")):
        sp = sub.add_parser(name, help=help_text)
        sp.add_argument("--for", dest="role", choices=sorted(ROLES), required=True)
        if name == "read":
            sp.add_argument("--no-mark", action="store_true", help="giữ để tương thích; read không còn tự đánh dấu")
        sp.set_defaults(func=func)
    done = sub.add_parser("done", help="đánh dấu thư đã xử lý xong (sau khi làm theo)")
    done.add_argument("--for", dest="role", choices=sorted(ROLES), required=True)
    done.add_argument("--id", dest="ids", nargs="+", required=True, help="ví dụ: C-0108 C-0109 hoặc 108")
    done.set_defaults(func=cmd_done)
    wait = sub.add_parser("wait", help="chặn tới khi có thư mới (exit 3 nếu hết giờ)")
    wait.add_argument("--for", dest="role", choices=sorted(ROLES), required=True)
    wait.add_argument("--timeout", type=int, default=1800)
    wait.add_argument("--interval", type=int, default=60)
    wait.set_defaults(func=cmd_wait)
    hb = sub.add_parser("heartbeat", help="cập nhật trạng thái làm việc")
    hb.add_argument("--role", choices=sorted(ROLES), required=True)
    hb.add_argument("--state", required=True, choices=["working", "waiting", "blocked", "idle"])
    hb.add_argument("--task")
    hb.add_argument("--note")
    hb.set_defaults(func=cmd_heartbeat)
    sub.add_parser("status", help="trạng thái hai bên").set_defaults(func=cmd_status)
    args = parser.parse_args(argv)
    if has_remote():
        ensure_main_checkout()
    own = getattr(args, "role", None) if args.cmd in ("done", "heartbeat") else None
    if own in REMOTE_WORKERS and remote_role() != own:
        raise SystemExit(f"[mb] {args.cmd} cho vai {own} chỉ chạy từ phiên cloud (nhánh {REMOTE_WORKERS[own]})")
    args.func(args)


if __name__ == "__main__":
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    main()
