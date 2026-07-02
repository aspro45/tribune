"""Tests for TRIBUNE (direct runner). AI judge() validated live on studionet."""
from pathlib import Path

CONTRACT = str(Path(__file__).resolve().parents[1] / "contracts" / "tribune.py")
GEN = 10 ** 18

B_OPEN = 0; B_PAID = 1; B_CANCELLED = 2
SUB_PENDING = 0


def _post(t, vm, who, title="Fix the memory leak", spec="A PR that fixes the leak with a test", reward=5):
    vm.sender = who
    vm.value = reward * GEN
    bid = t.post_bounty(title, spec)
    vm.value = 0
    return bid


def test_post_bounty(deploy, direct_vm, direct_alice):
    t = deploy(CONTRACT)
    bid = _post(t, direct_vm, direct_alice)
    assert bid == 0
    b = t.get_bounty(0)
    assert b["status"] == B_OPEN
    assert int(b["reward"]) == 5 * GEN


def test_post_requires_reward(deploy, direct_vm, direct_alice):
    t = deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    with direct_vm.expect_revert("lock a reward"):
        t.post_bounty("t", "s")


def test_post_requires_spec(deploy, direct_vm, direct_alice):
    t = deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = GEN
    with direct_vm.expect_revert("a spec is required"):
        t.post_bounty("t", "")
    direct_vm.value = 0


def test_submit_solution(deploy, direct_vm, direct_alice, direct_bob):
    t = deploy(CONTRACT)
    _post(t, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    sid = t.submit_solution(0, "https://github.com/bob/fix")
    assert sid == 0
    s = t.get_submission(0)
    assert s["status"] == SUB_PENDING
    assert s["bounty_id"] == 0
    assert s["url"] == "https://github.com/bob/fix"


def test_submit_requires_open(deploy, direct_vm, direct_alice, direct_bob):
    t = deploy(CONTRACT)
    _post(t, direct_vm, direct_alice)
    direct_vm.sender = direct_alice
    t.cancel_bounty(0)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("bounty is not open"):
        t.submit_solution(0, "https://x.com")


def test_submit_requires_url(deploy, direct_vm, direct_alice, direct_bob):
    t = deploy(CONTRACT)
    _post(t, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("a solution URL is required"):
        t.submit_solution(0, "")


def test_cancel_bounty(deploy, direct_vm, direct_alice):
    t = deploy(CONTRACT)
    _post(t, direct_vm, direct_alice)
    direct_vm.sender = direct_alice
    t.cancel_bounty(0)
    assert t.get_bounty(0)["status"] == B_CANCELLED


def test_only_sponsor_cancels(deploy, direct_vm, direct_alice, direct_bob):
    t = deploy(CONTRACT)
    _post(t, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("only the sponsor can cancel"):
        t.cancel_bounty(0)


def test_judge_bad_id(deploy, direct_vm, direct_alice):
    t = deploy(CONTRACT)
    _post(t, direct_vm, direct_alice)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("no such submission"):
        t.judge(0)


def test_multiple(deploy, direct_vm, direct_alice, direct_bob):
    t = deploy(CONTRACT)
    _post(t, direct_vm, direct_alice, title="Bounty A")
    _post(t, direct_vm, direct_alice, title="Bounty B")
    direct_vm.sender = direct_bob
    t.submit_solution(0, "https://a.com")
    t.submit_solution(1, "https://b.com")
    assert t.get_bounty_count() == 2
    assert t.get_submission_count() == 2
    assert t.get_submission(1)["bounty_id"] == 1
