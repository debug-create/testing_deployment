"""Regression tests for generate_dataset.py. Run: python tests/test_dataset.py   (or: pytest tests/)"""
import os
import shutil
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import generate_dataset as gd  # noqa: E402


def _cfg(seed, replicas=1):
    return dict(gd.DEFAULT_CONFIG, master_seed=seed, preset="smoke", replicas=replicas)


def test_reproducible_same_seed():
    assert gd.verify_repro(_cfg(20261014))


def test_invariants_hold_across_seeds():
    for seed in (1, 2, 3):
        d = tempfile.mkdtemp()
        try:
            gd.generate(d, _cfg(seed))
            ok, rep = gd.validate(d, verbose=False)
            assert ok, rep["errors"]
        finally:
            shutil.rmtree(d, ignore_errors=True)


def test_seed_changes_realisation():
    a, b = tempfile.mkdtemp(), tempfile.mkdtemp()
    try:
        gd.generate(a, _cfg(11))
        gd.generate(b, _cfg(12))
        ea = open(os.path.join(a, "data/model_input/events.jsonl")).read()
        eb = open(os.path.join(b, "data/model_input/events.jsonl")).read()
        assert ea != eb
    finally:
        shutil.rmtree(a, ignore_errors=True)
        shutil.rmtree(b, ignore_errors=True)


def test_model_input_has_no_hidden_labels():
    d = tempfile.mkdtemp()
    try:
        gd.generate(d, _cfg(5))
        ok, rep = gd.validate(d, verbose=False)
        assert ok and not any("forbidden" in e or "leak" in e for e in rep["errors"])
    finally:
        shutil.rmtree(d, ignore_errors=True)


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print("PASS", name)
