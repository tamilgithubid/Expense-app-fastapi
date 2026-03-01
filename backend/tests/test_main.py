class TestHealthCheck:

    def test_home_returns_200(self, client):
        response = client.get("/")
        assert response.status_code == 200

    def test_home_response_body(self, client):
        response = client.get("/")
        assert response.json() == {"message": "PostgreSQL Connected"}


class TestUserRegistration:

    def test_register_success(self, client):
        response = client.post("/register", json={
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "securepass123",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@example.com"
        assert "id" in data
        assert "password" not in data
        assert "hashed_password" not in data

    def test_register_duplicate_username(self, client):
        client.post("/register", json={
            "username": "dupeuser",
            "email": "dupe1@example.com",
            "password": "password123",
        })
        response = client.post("/register", json={
            "username": "dupeuser",
            "email": "dupe2@example.com",
            "password": "password123",
        })
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_register_duplicate_email(self, client):
        client.post("/register", json={
            "username": "user_a",
            "email": "same@example.com",
            "password": "password123",
        })
        response = client.post("/register", json={
            "username": "user_b",
            "email": "same@example.com",
            "password": "password123",
        })
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]


class TestUserLogin:

    def test_login_success(self, client, registered_user):
        response = client.post("/login", data={
            "username": registered_user["username"],
            "password": registered_user["password"],
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, registered_user):
        response = client.post("/login", data={
            "username": registered_user["username"],
            "password": "wrongpassword",
        })
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]

    def test_login_nonexistent_user(self, client):
        response = client.post("/login", data={
            "username": "ghost",
            "password": "nopassword",
        })
        assert response.status_code == 401


class TestCreateExpense:

    def test_create_expense_success(self, client, auth_headers):
        response = client.post("/expenses", json={
            "title": "Coffee",
            "amount": 4.50,
            "category": "Food",
        }, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Coffee"
        assert data["amount"] == 4.50
        assert data["category"] == "Food"
        assert "id" in data
        assert "owner_id" in data

    def test_create_expense_invalidates_cache(self, client, auth_headers):
        import main
        client.post("/expenses", json={
            "title": "Lunch",
            "amount": 12.00,
            "category": "Food",
        }, headers=auth_headers)
        main.r.delete.assert_called()

    def test_create_expense_unauthenticated(self, client):
        response = client.post("/expenses", json={
            "title": "Coffee",
            "amount": 4.50,
            "category": "Food",
        })
        assert response.status_code == 401


class TestGetExpenses:

    def test_get_expenses_empty(self, client, auth_headers):
        response = client.get("/expenses", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_get_expenses_returns_own(self, client, auth_headers):
        client.post("/expenses", json={
            "title": "Coffee", "amount": 4.50, "category": "Food",
        }, headers=auth_headers)
        client.post("/expenses", json={
            "title": "Bus", "amount": 2.00, "category": "Transport",
        }, headers=auth_headers)

        response = client.get("/expenses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        titles = {e["title"] for e in data}
        assert titles == {"Coffee", "Bus"}

    def test_get_expenses_user_isolation(
        self, client, auth_headers, second_user_headers
    ):
        client.post("/expenses", json={
            "title": "User A Expense",
            "amount": 10.00,
            "category": "Test",
        }, headers=auth_headers)

        response = client.get("/expenses", headers=second_user_headers)
        assert response.status_code == 200
        assert response.json() == []

        response = client.get("/expenses", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_get_expenses_unauthenticated(self, client):
        response = client.get("/expenses")
        assert response.status_code == 401

    def test_get_expenses_calls_redis(self, client, auth_headers):
        import main
        client.get("/expenses", headers=auth_headers)
        main.r.get.assert_called()


class TestUnauthenticatedAccess:

    def test_get_expenses_no_token(self, client):
        response = client.get("/expenses")
        assert response.status_code == 401

    def test_post_expenses_no_token(self, client):
        response = client.post("/expenses", json={
            "title": "X", "amount": 1.0, "category": "Y",
        })
        assert response.status_code == 401

    def test_invalid_token(self, client):
        headers = {"Authorization": "Bearer invalid.token.here"}
        response = client.get("/expenses", headers=headers)
        assert response.status_code == 401
