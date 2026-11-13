"""Cold-initialization regression tests; upstream downloads are mocked."""
import importlib.util
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from time import sleep
import unittest
from unittest.mock import MagicMock, patch


def load_backend(calendar):
    path = Path(__file__).resolve().parents[1] / 'app.py'
    spec = importlib.util.spec_from_file_location('backend_under_test', path)
    module = importlib.util.module_from_spec(spec)
    with patch.dict('sys.modules', {'flask': MagicMock(), 'unipi_calendar': calendar}):
        spec.loader.exec_module(module)
    return module


class CalendarLoadingTests(unittest.TestCase):
    def test_concurrent_cold_requests_download_once(self):
        calendar = MagicMock()
        def download():
            sleep(0.02)
            return ['lesson']
        calendar.load_calendars_and_parse.side_effect = download
        backend = load_backend(calendar)
        def request(_):
            backend.update_calendars()
            return backend.calendari['lessons']
        with ThreadPoolExecutor(max_workers=4) as executor:
            results = list(executor.map(request, range(8)))
        self.assertEqual(results, [['lesson']] * 8)
        calendar.load_calendars_and_parse.assert_called_once()
        self.assertEqual(backend.calendari['lessons'], ['lesson'])

    def test_failed_refresh_is_retried(self):
        calendar = MagicMock()
        calendar.load_calendars_and_parse.side_effect = [RuntimeError('offline'), ['lesson']]
        backend = load_backend(calendar)
        with self.assertRaises(RuntimeError):
            backend.update_calendars()
        self.assertEqual(backend.calendari, {})
        backend.update_calendars()
        self.assertEqual(backend.calendari['lessons'], ['lesson'])
        self.assertEqual(calendar.load_calendars_and_parse.call_count, 2)

    def test_warm_requests_reuse_daily_cache(self):
        calendar = MagicMock()
        calendar.load_calendars_and_parse.return_value = ['lesson']
        backend = load_backend(calendar)
        backend.update_calendars()
        backend.update_calendars()
        calendar.load_calendars_and_parse.assert_called_once()

    def test_previous_day_refreshes(self):
        calendar = MagicMock()
        calendar.load_calendars_and_parse.return_value = ['new lesson']
        backend = load_backend(calendar)
        backend.calendari.update(date='2000-01-01', lessons=['old lesson'])
        backend.update_calendars()
        self.assertEqual(backend.calendari['lessons'], ['new lesson'])
        calendar.load_calendars_and_parse.assert_called_once()


if __name__ == '__main__':
    unittest.main()
