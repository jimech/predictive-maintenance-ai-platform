from app.core.config import Settings


def test_debug_accepts_release_environment_name():
    settings = Settings(debug="release")
    assert settings.debug is False

