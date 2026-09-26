import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

ROLES_TO_TEST = [
    {"role": "Farmer", "username": "farmer", "password": "farmer123", "expected_url": "http://localhost:3000/farmer"},
    {"role": "Supervisor", "username": "supervisor", "password": "supervisor123", "expected_url": "http://localhost:3000/supervisor"},
    {"role": "Manager", "username": "manager", "password": "manager123", "expected_url": "http://localhost:3000/manager"},
    {"role": "Maintenance", "username": "maintenance", "password": "maintenance123", "expected_url": "http://localhost:3000/maintenance"},
    {"role": "Admin", "username": "admin", "password": "admin123", "expected_url": "http://localhost:3000/admin"},
]

def main():
    print("Starting Multi-Role Login Verification Test...")
    
    for item in ROLES_TO_TEST:
        driver = webdriver.Chrome()
        try:
            role_name = item["role"]
            print(f"\n--- Testing Login for Role: {role_name} ---")
            
            driver.get("http://localhost:3000/login")
            driver.maximize_window()
            
            # Clear & Enter credentials
            username_field = driver.find_element(By.NAME, "username")
            username_field.clear()
            username_field.send_keys(item["username"])
            
            password_field = driver.find_element(By.NAME, "password")
            password_field.clear()
            password_field.send_keys(item["password"])
            
            # Click submit
            driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
            
            # Wait for redirection to role dashboard
            WebDriverWait(driver, 10).until(EC.url_to_be(item["expected_url"]))
            assert driver.current_url == item["expected_url"]
            print(f"PASSED: {role_name} logged in successfully and redirected to {driver.current_url}")
            time.sleep(1.5)
            
        finally:
            driver.quit()
            
    print("\nMulti-Role Login Verification Test passed for all 5 user roles!")

if __name__ == "__main__":
    main()
