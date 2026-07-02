"""Seed TRIBUNE with real on-chain data on studionet."""
from pathlib import Path

from gltest_cli.config.general import get_general_config
from gltest_cli.config.user import load_user_config
from gltest import get_contract_factory, get_default_account

ROOT = Path(__file__).resolve().parents[1]
ADDR = "0xF87b116d92A6EBD0Bb0A6917B9205Fa442Fd534D"
GEN = 10 ** 18
URL = "https://example.com"

cfg = load_user_config(str(ROOT / "gltest.config.yaml"))
get_general_config().user_config = cfg
c = get_contract_factory(contract_file_path=str(ROOT / "contracts" / "tribune.py")).build_contract(
    ADDR, account=get_default_account())

BOUNTIES = [
    ("Publish the project reference page",
     "Deliver a public web page that states the domain is for use in illustrative examples in documents.",
     5 * GEN),
    ("Build a Discord moderation bot",
     "A public repository containing a working Discord moderation bot with setup instructions in a README.",
     3 * GEN),
]


def main():
    if c.get_bounty_count().call() == 0:
        for (title, spec, reward) in BOUNTIES:
            c.post_bounty(args=[title, spec]).transact(value=reward)
            print("posted:", title)
    if c.get_submission_count().call() == 0:
        c.submit_solution(args=[0, URL]).transact(); print("submitted to 0")
        c.submit_solution(args=[1, URL]).transact(); print("submitted to 1")
    for sid in (0, 1):
        s = c.get_submission(args=[sid]).call()
        if int(s["status"]) == 0:
            print("judging", sid, "(AI)...")
            try:
                c.judge(args=[sid]).transact()
            except Exception as e:
                print("judge", sid, "->", e)
    for bid in (0, 1):
        b = c.get_bounty(args=[bid]).call()
        print(bid, ["OPEN", "PAID", "CANCELLED"][int(b["status"])], b["title"], "|", (b["rationale"] or "")[:70])


if __name__ == "__main__":
    main()
