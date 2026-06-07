import requests
import sys

API_KEY = "AIzaSyAw8Qbj2yrFNxwTnOBa92OosAvoZSDQ6fw"

EMAIL = "testuser@example.com"
PASSWORD = "Test123456!"

signup_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}"
login_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"

r = requests.post(login_url, json={"email": EMAIL, "password": PASSWORD, "returnSecureToken": True})

if r.status_code != 200:
    print("Creating new user...")
    r = requests.post(signup_url, json={"email": EMAIL, "password": PASSWORD, "returnSecureToken": True})

if r.status_code == 200:
    print("\n=== YOUR TOKEN (Copy everything below this line) ===")
    print(r.json()["idToken"])
else:
    print(f"Error: {r.json()}", file=sys.stderr)
