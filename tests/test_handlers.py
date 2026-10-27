import json
import os
import unittest
from unittest import mock

from src.engine.simulator import normalize_simulation_params, run_monte_carlo_ensemble
from src.handlers import orchestrator, worker

SMALL = {"seed": 11, "monte_carlo_runs": 3, "n_nodes": 300}
ENV_KEYS = ["SIMULATIONS_TABLE_NAME", "RESULTS_BUCKET_NAME", "STATE_MACHINE_ARN"]


def _v2(method, path, body=None, **extra):
    event = {"rawPath": path, "requestContext": {"http": {"method": method}}}
    if body is not None:
        event["body"] = body if isinstance(body, str) else json.dumps(body)
    event.update(extra)
    return event


def _call(event):
    response = orchestrator.lambda_handler(event)
    body = json.loads(response["body"]) if response["body"] else None
    return response, body


class HandlersTestBase(unittest.TestCase):
    """Aisla cada prueba: sin AWS configurado y con la cache vacia."""

    def setUp(self):
        self._saved_env = {k: os.environ.pop(k, None) for k in ENV_KEYS}
        orchestrator._MEMORY_CACHE.clear()
        orchestrator._SFN_CLIENT = None
        orchestrator._S3_CLIENT = None
        orchestrator._DDB_TABLE = None
        worker._S3_CLIENT = None

    def tearDown(self):
        for key, value in self._saved_env.items():
            os.environ.pop(key, None)
            if value is not None:
                os.environ[key] = value
        orchestrator._MEMORY_CACHE.clear()


class WorkerTests(HandlersTestBase):
    def test_worker_returns_serializable_batch_for_three_strategies(self):
        result = worker.lambda_handler(
            {"batch_id": 0, "params": SMALL, "run_indices": [0, 1]}
        )
        self.assertEqual(result["run_indices"], [0, 1])
        self.assertEqual(set(result["strategies"]), {"none", "random", "shield"})
        self.assertEqual(len(result["strategies"]["shield"]), 2)
        self.assertGreaterEqual(result["worker_time_ms"], 0)
        json.dumps(result)

    def test_spatial_series_only_in_first_batch(self):
        first = worker.lambda_handler({"batch_id": 0, "params": SMALL, "run_indices": [0]})
        second = worker.lambda_handler({"batch_id": 1, "params": SMALL, "run_indices": [1]})
        self.assertTrue(first["spatial"])
        self.assertEqual(second["spatial"], {})

    def test_empty_run_indices_is_rejected(self):
        with self.assertRaises(ValueError):
            worker.lambda_handler({"params": SMALL, "run_indices": []})

    def test_spatial_offloaded_to_s3_when_bucket_configured(self):
        s3 = mock.Mock()
        worker._S3_CLIENT = s3
        os.environ["RESULTS_BUCKET_NAME"] = "bucket-test"
        result = worker.lambda_handler(
            {"batch_id": 0, "params": SMALL, "run_indices": [0], "sim_hash": "cf-abc"}
        )
        self.assertEqual(result["spatial"], {})
        self.assertEqual(result["spatial_ref"], {"bucket": "bucket-test", "key": "spatial/cf-abc.json"})
        s3.put_object.assert_called_once()

    def test_s3_failure_falls_back_to_inline_spatial(self):
        worker._S3_CLIENT = mock.Mock(put_object=mock.Mock(side_effect=RuntimeError("s3 caido")))
        os.environ["RESULTS_BUCKET_NAME"] = "bucket-test"
        result = worker.lambda_handler(
            {"batch_id": 0, "params": SMALL, "run_indices": [0], "sim_hash": "cf-abc"}
        )
        self.assertTrue(result["spatial"])
        self.assertNotIn("spatial_ref", result)


class HashAndCacheTests(HandlersTestBase):
    def test_hash_is_deterministic_and_order_independent(self):
        params = normalize_simulation_params(SMALL)
        reordered = dict(reversed(list(params.items())))
        sim_hash = orchestrator.compute_sim_hash(params)
        self.assertEqual(sim_hash, orchestrator.compute_sim_hash(reordered))
        self.assertRegex(sim_hash, r"^cf-[0-9a-f]{16}$")

    def test_hash_changes_with_seed(self):
        a = orchestrator.compute_sim_hash(normalize_simulation_params({**SMALL, "seed": 1}))
        b = orchestrator.compute_sim_hash(normalize_simulation_params({**SMALL, "seed": 2}))
        self.assertNotEqual(a, b)

    def test_memory_cache_roundtrip(self):
        self.assertIsNone(orchestrator.get_cached_simulation("cf-x"))
        payload = {"sim_hash": "cf-x", "value": 0.5}
        orchestrator.save_simulation_cache("cf-x", payload)
        self.assertEqual(orchestrator.get_cached_simulation("cf-x"), payload)

    def test_dynamodb_and_s3_persistence(self):
        store = {}
        table = mock.Mock()
        table.put_item = lambda Item: store.update(item=Item)
        table.get_item = lambda Key: {"Item": store.get("item")}
        s3 = mock.Mock()
        s3.put_object = lambda **kw: store.update(s3=kw)
        s3.get_object = lambda **kw: {"Body": mock.Mock(read=lambda: store["s3"]["Body"])}
        orchestrator._DDB_TABLE, orchestrator._S3_CLIENT = table, s3
        os.environ["SIMULATIONS_TABLE_NAME"] = "tabla"
        os.environ["RESULTS_BUCKET_NAME"] = "bucket"

        payload = {"sim_hash": "cf-y", "summary_kpis": {"x": 0.25}, "spatial_timelines": {"none": [1.5]}}
        orchestrator.save_simulation_cache("cf-y", payload)

        self.assertNotIn("spatial_timelines", store["item"]["payload"])
        self.assertEqual(store["s3"]["Key"], "simulations/cf-y.json")
        self.assertEqual(store["item"]["ttl"] - store["item"]["created_at"], 14 * 86400)

        orchestrator._MEMORY_CACHE.clear()
        self.assertEqual(orchestrator.get_cached_simulation("cf-y"), payload)

    def test_aws_failure_does_not_break_reads_or_writes(self):
        table = mock.Mock()
        table.get_item.side_effect = RuntimeError("boom")
        table.put_item.side_effect = RuntimeError("boom")
        orchestrator._DDB_TABLE = table
        os.environ["SIMULATIONS_TABLE_NAME"] = "tabla"
        self.assertIsNone(orchestrator.get_cached_simulation("cf-z"))
        orchestrator.save_simulation_cache("cf-z", {"a": 1})
        self.assertEqual(orchestrator.get_cached_simulation("cf-z"), {"a": 1})


class EndpointTests(HandlersTestBase):
    def test_options_preflight(self):
        response, body = _call(_v2("OPTIONS", "/simulate"))
        self.assertEqual(response["statusCode"], 200)
        self.assertIsNone(body)
        self.assertEqual(response["headers"]["Access-Control-Allow-Origin"], "*")
        self.assertIn("POST", response["headers"]["Access-Control-Allow-Methods"])

    def test_health_v2_and_v1_events(self):
        for event in (_v2("GET", "/health"), {"path": "/health", "httpMethod": "GET"}):
            response, body = _call(event)
            self.assertEqual(response["statusCode"], 200)
            self.assertEqual(body["status"], "ok")
            self.assertEqual(body["backend_mode"], "local")
            self.assertEqual(body["execution_mode"], "local-hybrid")
            self.assertFalse(body["dynamodb_connected"])
            self.assertIn("timestamp", body)

    def test_simulate_second_call_is_cache_hit(self):
        first_response, first = _call(_v2("POST", "/simulate", SMALL))
        _, second = _call(_v2("POST", "/simulate", SMALL))
        self.assertEqual(first_response["statusCode"], 200)
        self.assertFalse(first["cache_hit"])
        self.assertTrue(second["cache_hit"])
        self.assertEqual(first["sim_hash"], second["sim_hash"])
        self.assertLess(second["execution_time_ms"], 50)
        for key in ("params", "summary_kpis", "strategies", "spatial_timelines", "execution_time_ms"):
            self.assertIn(key, first)

    def test_force_recompute_skips_cache_and_keeps_hash(self):
        _, first = _call(_v2("POST", "/simulate", SMALL))
        _, forced = _call(_v2("POST", "/simulate", {**SMALL, "force_recompute": True}))
        self.assertFalse(forced["cache_hit"])
        self.assertEqual(first["sim_hash"], forced["sim_hash"])

    def test_get_simulation_by_hash(self):
        _, created = _call(_v2("POST", "/simulate", SMALL))
        response, body = _call(_v2("GET", f"/simulations/{created['sim_hash']}"))
        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(body["sim_hash"], created["sim_hash"])
        self.assertTrue(body["cache_hit"])

    def test_get_unknown_simulation_is_404(self):
        response, _ = _call(_v2("GET", "/simulations/cf-inexistente"))
        self.assertEqual(response["statusCode"], 404)
        self.assertIn("Access-Control-Allow-Origin", response["headers"])

    def test_invalid_json_body_is_400(self):
        response, _ = _call(_v2("POST", "/simulate", "{no es json"))
        self.assertEqual(response["statusCode"], 400)

    def test_unknown_route_is_404(self):
        response, _ = _call(_v2("GET", "/no-existe"))
        self.assertEqual(response["statusCode"], 404)


class DistributedExecutionTests(HandlersTestBase):
    def _fake_sfn(self, captured):
        def start_sync_execution(stateMachineArn, input):
            captured.append(json.loads(input))
            results = [worker.lambda_handler(b) for b in captured[-1]["batches"]]
            return {"status": "SUCCEEDED", "output": json.dumps({"batchResults": results})}

        return mock.Mock(start_sync_execution=start_sync_execution)

    def test_batches_cover_all_runs_with_spatial_only_in_first(self):
        params = normalize_simulation_params({**SMALL, "monte_carlo_runs": 12})
        batches = orchestrator._build_batches(params, "cf-t")
        self.assertEqual([b["run_indices"] for b in batches], [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11]])
        self.assertEqual([b["record_spatial"] for b in batches], [True, False, False])
        self.assertTrue(all(b["sim_hash"] == "cf-t" for b in batches))

    def test_distributed_result_equals_local_result(self):
        params = normalize_simulation_params({**SMALL, "monte_carlo_runs": 7})
        captured = []
        orchestrator._SFN_CLIENT = self._fake_sfn(captured)
        os.environ["STATE_MACHINE_ARN"] = "arn:aws:states:test"
        distributed = orchestrator.execute_distributed_or_local_ensemble(params)
        self.assertEqual(len(captured[0]["batches"]), 2)
        local = run_monte_carlo_ensemble(params)
        self.assertEqual(json.dumps(distributed, sort_keys=True), json.dumps(local, sort_keys=True))

    def test_spatial_refs_are_hydrated_from_s3(self):
        params = normalize_simulation_params({**SMALL, "monte_carlo_runs": 2})
        objects = {}
        s3 = mock.Mock()
        s3.put_object = lambda **kw: objects.__setitem__(kw["Key"], kw["Body"])
        s3.get_object = lambda Bucket, Key: {"Body": mock.Mock(read=lambda: objects[Key])}
        worker._S3_CLIENT = orchestrator._S3_CLIENT = s3
        orchestrator._SFN_CLIENT = self._fake_sfn([])
        os.environ.update(STATE_MACHINE_ARN="arn", RESULTS_BUCKET_NAME="bucket")
        result = orchestrator.execute_distributed_or_local_ensemble(params)
        self.assertEqual(len(objects), 1)
        self.assertTrue(result["spatial_timelines"])

    def test_step_functions_failure_falls_back_to_local(self):
        params = normalize_simulation_params(SMALL)
        os.environ["STATE_MACHINE_ARN"] = "arn"
        local = run_monte_carlo_ensemble(params)
        for failure in (
            mock.Mock(start_sync_execution=mock.Mock(side_effect=RuntimeError("x"))),
            mock.Mock(start_sync_execution=mock.Mock(return_value={"status": "FAILED", "error": "E"})),
        ):
            orchestrator._SFN_CLIENT = failure
            result = orchestrator.execute_distributed_or_local_ensemble(params)
            self.assertEqual(json.dumps(result, sort_keys=True), json.dumps(local, sort_keys=True))


if __name__ == "__main__":
    unittest.main()
