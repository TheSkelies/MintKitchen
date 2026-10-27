import os
import unittest
from unittest.mock import patch

from sqlalchemy.engine import Engine

from app.config import Settings


class TestDatabaseConfig(unittest.TestCase):
    def test_default_database_url_is_postgresql(self):
        settings = Settings(_env_file=None)
        self.assertTrue(
            settings.database_url.startswith("postgresql://") or settings.database_url.startswith("postgresql+"),
            f"Expected PostgreSQL URL, got: {settings.database_url}",
        )

    def test_custom_database_url_from_env(self):
        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://myuser:mypass@localhost:5432/testdb"}):
            settings = Settings(_env_file=None)
            self.assertEqual(settings.database_url, "postgresql://myuser:mypass@localhost:5432/testdb")

    def test_db_engine_creation(self):
        from app import db

        self.assertIsInstance(db.engine, Engine)
        self.assertEqual(db.engine.pool._pre_ping, True)


if __name__ == "__main__":
    unittest.main()
