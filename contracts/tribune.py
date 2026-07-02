# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
TRIBUNE - Self-Judging Bounty Board
===================================
A sponsor posts a bounty with a clear spec and locks the reward. Anyone submits
a solution as a public URL. To judge a submission, the contract reads the linked
work against the spec and a validator set agrees (Equivalence Principle) whether
it genuinely solves the bounty. The first submission that passes wins the reward,
paid on-chain. No maintainer gatekeeping, no trust required - the work is judged
on its merits.

Bounty status:     OPEN(0) -> PAID(1) | CANCELLED(2)
Submission status: PENDING(0) -> ACCEPTED(1) | REJECTED(2)
"""

from genlayer import *
from dataclasses import dataclass
import json
import typing


B_OPEN = 0
B_PAID = 1
B_CANCELLED = 2

SUB_PENDING = 0
SUB_ACCEPTED = 1
SUB_REJECTED = 2


@allow_storage
@dataclass
class Bounty:
    sponsor: Address
    title: str
    spec: str
    reward: u256
    status: u8
    winner: Address
    rationale: str


@allow_storage
@dataclass
class Submission:
    bounty_id: u256
    solver: Address
    url: str
    status: u8
    rationale: str


class Tribune(gl.Contract):
    bounties: DynArray[Bounty]
    submissions: DynArray[Submission]

    def __init__(self) -> None:
        pass

    @gl.public.write.payable
    def post_bounty(self, title: str, spec: str) -> int:
        if len(title.strip()) == 0:
            raise gl.vm.UserError("a title is required")
        if len(spec.strip()) == 0:
            raise gl.vm.UserError("a spec is required")
        reward = gl.message.value
        if reward == u256(0):
            raise gl.vm.UserError("lock a reward to post a bounty")
        b = self.bounties.append_new_get()
        b.sponsor = gl.message.sender_address
        b.title = title
        b.spec = spec
        b.reward = reward
        b.status = u8(B_OPEN)
        b.winner = Address(bytes(20))
        b.rationale = ""
        return len(self.bounties) - 1

    @gl.public.write
    def submit_solution(self, bounty_id: int, url: str) -> int:
        b = self._get_bounty(bounty_id)
        if b.status != B_OPEN:
            raise gl.vm.UserError("bounty is not open")
        if len(url.strip()) == 0:
            raise gl.vm.UserError("a solution URL is required")
        s = self.submissions.append_new_get()
        s.bounty_id = u256(bounty_id)
        s.solver = gl.message.sender_address
        s.url = url
        s.status = u8(SUB_PENDING)
        s.rationale = ""
        return len(self.submissions) - 1

    @gl.public.write
    def judge(self, submission_id: int) -> None:
        """Read the submission against the bounty spec; validators agree whether
        it solves it. First passing submission wins the reward."""
        s = self._get_submission(submission_id)
        if s.status != SUB_PENDING:
            raise gl.vm.UserError("submission already judged")
        b = self.bounties[int(s.bounty_id)]
        if b.status != B_OPEN:
            raise gl.vm.UserError("bounty is no longer open")

        spec = b.spec
        title = b.title
        url = s.url

        def leader_fn() -> str:
            page = ""
            try:
                page = gl.nondet.web.get(url).body.decode("utf-8")[:6000]
            except Exception:
                page = "(solution page unreachable)"
            prompt = (
                f"Bounty: {title}\n"
                f"Specification the solution must satisfy:\n{spec}\n\n"
                f"Submitted solution page:\n{page}\n\n"
                "Judge strictly on the evidence in the page. Does this submission "
                "genuinely satisfy the bounty specification? Reply with ONLY JSON: "
                '{"solved": true} if it clearly does, {"solved": false} if it does '
                'not, plus a short "reason".'
            )
            return gl.nondet.exec_prompt(prompt)

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            return self._decision_of(leader_res.calldata)[0] == self._decision_of(leader_fn())[0]

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        solved, reason = self._decision_of(result)
        s.rationale = reason[:300]
        if solved:
            s.status = u8(SUB_ACCEPTED)
            b.status = u8(B_PAID)
            b.winner = s.solver
            b.rationale = reason[:300]
            self._pay(s.solver, b.reward)
        else:
            s.status = u8(SUB_REJECTED)

    @gl.public.write
    def cancel_bounty(self, bounty_id: int) -> None:
        b = self._get_bounty(bounty_id)
        if b.status != B_OPEN:
            raise gl.vm.UserError("only an open bounty can be cancelled")
        if gl.message.sender_address != b.sponsor:
            raise gl.vm.UserError("only the sponsor can cancel")
        b.status = u8(B_CANCELLED)
        self._pay(b.sponsor, b.reward)

    # ------------------------------------------------------------------ views
    @gl.public.view
    def get_bounty_count(self) -> int:
        return len(self.bounties)

    @gl.public.view
    def get_bounty(self, bounty_id: int) -> dict:
        b = self._get_bounty(bounty_id)
        return {
            "sponsor": b.sponsor.as_hex,
            "title": b.title,
            "spec": b.spec,
            "reward": str(b.reward),
            "status": int(b.status),
            "winner": b.winner.as_hex,
            "rationale": b.rationale,
        }

    @gl.public.view
    def get_submission_count(self) -> int:
        return len(self.submissions)

    @gl.public.view
    def get_submission(self, submission_id: int) -> dict:
        s = self._get_submission(submission_id)
        return {
            "bounty_id": int(s.bounty_id),
            "solver": s.solver.as_hex,
            "url": s.url,
            "status": int(s.status),
            "rationale": s.rationale,
        }

    # -------------------------------------------------------------- internals
    def _get_bounty(self, bounty_id: int) -> Bounty:
        if bounty_id < 0 or bounty_id >= len(self.bounties):
            raise gl.vm.UserError("no such bounty")
        return self.bounties[bounty_id]

    def _get_submission(self, submission_id: int) -> Submission:
        if submission_id < 0 or submission_id >= len(self.submissions):
            raise gl.vm.UserError("no such submission")
        return self.submissions[submission_id]

    def _decision_of(self, result: typing.Any) -> tuple:
        data = result
        if isinstance(data, str):
            data = self._extract_json(data)
        if not isinstance(data, dict):
            return (False, "")
        raw = data.get("solved", None)
        reason = str(data.get("reason", ""))
        if isinstance(raw, bool):
            return (raw, reason)
        if isinstance(raw, str):
            return (raw.strip().lower() == "true", reason)
        return (False, reason)

    def _extract_json(self, text: str) -> typing.Any:
        try:
            return json.loads(text)
        except (ValueError, TypeError):
            pass
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except (ValueError, TypeError):
                return None
        return None

    def _pay(self, recipient: Address, amount: u256) -> None:
        if amount == u256(0):
            return
        _Payee(recipient).emit_transfer(value=amount)


@gl.evm.contract_interface
class _Payee:
    class View:
        pass

    class Write:
        pass
