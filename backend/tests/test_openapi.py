def test_openapi_json_lists_health(client):
    response = client.get("/openapi/openapi.json")

    assert response.status_code == 200
    spec = response.get_json()

    assert spec["openapi"] == "3.0.3"
    paths = spec.get("paths", {})
    health_path = paths.get("/api/v1/health")
    assert health_path is not None
    assert "get" in health_path


def test_swagger_ui_page(client):
    response = client.get("/openapi/swagger-ui")

    assert response.status_code == 200
    assert "swagger-ui" in response.get_data(as_text=True).lower()
