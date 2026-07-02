"""Deploy TRIBUNE to studionet and print its address."""
from pathlib import Path

from gltest_cli.config.general import get_general_config
from gltest_cli.config.user import load_user_config
from gltest import get_contract_factory

ROOT = Path(__file__).resolve().parents[1]

cfg = load_user_config(str(ROOT / "gltest.config.yaml"))
get_general_config().user_config = cfg

factory = get_contract_factory(contract_file_path=str(ROOT / "contracts" / "tribune.py"))
contract = factory.deploy(args=[])
print("ADDR=" + str(contract.address), flush=True)
