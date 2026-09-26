import subprocess
import sys
import time

TEST_FILES = [
    "selenium_tests/test_browser.py",
    "selenium_tests/test_agriflow_open.py",
    "selenium_tests/test_login_fields.py",
    "selenium_tests/test_login_empty_validation.py",
    "selenium_tests/test_login_invalid_credentials.py",
    "selenium_tests/test_login_valid.py",
    "selenium_tests/test_logout.py",
    "selenium_tests/test_register_navigation.py",
    "selenium_tests/test_register_full.py",
    "selenium_tests/test_role_logins.py",
    "selenium_tests/test_farm_management.py",
    "selenium_tests/test_field_management.py",
    "selenium_tests/test_irrigation_history.py",
    "selenium_tests/test_farmer_complaints.py",
    "selenium_tests/test_farmer_profile.py",
    "selenium_tests/test_maintenance_workflow.py",
    "selenium_tests/test_crop_health_ai.py",
    "selenium_tests/test_alerts_module.py",
    "selenium_tests/test_supervisor_workflow.py",
]

def main():
    print("=" * 60)
    print("      AGRIFLOW COMPREHENSIVE SELENIUM TEST SUITE RUNNER      ")
    print("=" * 60)
    print(f"Total Tests to Execute: {len(TEST_FILES)}\n")
    
    passed_count = 0
    failed_count = 0
    start_time = time.time()
    results = []

    for idx, test_file in enumerate(TEST_FILES, 1):
        print(f"[{idx}/{len(TEST_FILES)}] Running {test_file}...")
        try:
            res = subprocess.run([sys.executable, test_file], capture_output=False)
            if res.returncode == 0:
                print(f"[PASSED]: {test_file}\n")
                passed_count += 1
                results.append((test_file, "PASSED"))
            else:
                print(f"[FAILED]: {test_file}\n")
                failed_count += 1
                results.append((test_file, "FAILED"))
        except Exception as e:
            print(f"[ERROR] running {test_file}: {e}\n")
            failed_count += 1
            results.append((test_file, f"ERROR: {e}"))

    elapsed = round(time.time() - start_time, 2)
    
    print("=" * 60)
    print("                    TEST EXECUTION SUMMARY                   ")
    print("=" * 60)
    for test, status in results:
        print(f" • {test:<45} : {status}")
    print("-" * 60)
    print(f"Total Time Taken: {elapsed} seconds")
    print(f"Total Passed: {passed_count} / {len(TEST_FILES)}")
    print(f"Total Failed: {failed_count} / {len(TEST_FILES)}")
    print("=" * 60)

if __name__ == "__main__":
    main()
