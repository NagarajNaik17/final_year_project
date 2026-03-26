import traceback

try:
    from app.api.auth import seed_superadmin
    print(seed_superadmin())
except Exception as e:
    traceback.print_exc()
