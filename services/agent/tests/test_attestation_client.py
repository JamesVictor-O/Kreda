from app.chain.attestation_client import _friendly_revert_message


def test_friendly_revert_message_decodes_known_selector():
    error = Exception("('0x9fbfc589', '0x9fbfc589')")
    assert _friendly_revert_message(error) == (
        "This exact receivable was already attested on-chain. Select a different "
        "set of orders -- the same store, same orders always derives the same "
        "receivable id, so resubmitting it collides with the earlier attestation."
    )


def test_friendly_revert_message_returns_none_for_unknown_error():
    assert _friendly_revert_message(Exception("connection refused")) is None
