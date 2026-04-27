# Auth Testing Playbook - FSC

## Step 1: Mongo Verification
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})

Verify: bcrypt hash starts with $2b$, indexes on users.email (unique), login_attempts.identifier, password_reset_tokens.expires_at TTL.

## Step 2: API Testing
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@futuresoccercup.com","password":"FSCAdmin2025!"}'
curl -b cookies.txt http://localhost:8001/api/auth/me
