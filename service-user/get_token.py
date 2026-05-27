import requests
import sys

# 1. Get this from Firebase Console -> Project Settings -> General -> Web API Key
API_KEY = "AIzaSyAw8Qbj2yrFNxwTnOBa92OosAvoZSDQ6fw"

# 2. Set test credentials
EMAIL = "testuser@example.com"
PASSWORD = "Test123456!"

# Create user (run once)
signup_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}"
# Login (run subsequently)
login_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"

# Try to login first
r = requests.post(login_url, json={"email": EMAIL, "password": PASSWORD, "returnSecureToken": True})

# If login fails because user doesn't exist, create it
if r.status_code != 200:
    print("Creating new user...")
    r = requests.post(signup_url, json={"email": EMAIL, "password": PASSWORD, "returnSecureToken": True})

if r.status_code == 200:
    print("\n=== YOUR TOKEN (Copy everything below this line) ===")
    print(r.json()["idToken"])
else:
    print(f"Error: {r.json()}", file=sys.stderr)
