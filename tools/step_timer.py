#!/usr/bin/env python3
"""Small monotonic timer used by CHAY_GAME.cmd."""

from __future__ import annotations

import argparse
import time


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("start", "elapsed"))
    parser.add_argument("start_ns", nargs="?", type=int)
    args = parser.parse_args()
    if args.action == "start":
        print(time.perf_counter_ns())
        return 0
    if args.start_ns is None:
        parser.error("elapsed cần start_ns")
    print(f"{(time.perf_counter_ns() - args.start_ns) / 1_000_000_000:.1f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
