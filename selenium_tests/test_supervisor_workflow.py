import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def main():
    print("Starting Supervisor Verification Workflow Selenium Test...")
    driver = webdriver.Chrome()
    try:
        driver.get("http://localhost:3000/login")
        driver.maximize_window()

        # Login as Supervisor
        username_field = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.NAME, "username")))
        username_field.clear()
        username_field.send_keys("supervisor")

        password_field = driver.find_element(By.NAME, "password")
        password_field.clear()
        password_field.send_keys("supervisor123")

        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        # Verify redirect to Supervisor Dashboard
        WebDriverWait(driver, 10).until(EC.url_to_be("http://localhost:3000/supervisor"))
        assert driver.current_url == "http://localhost:3000/supervisor"
        print("PASSED: Logged in as Supervisor and redirected to /supervisor")

        # Verify Dashboard UI Elements
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Field Supervisor Dashboard')]")))
        print("PASSED: Field Supervisor Dashboard title rendered.")

        # Check for Field Ground Truth Verification List table
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Field Ground Truth Verification List')]")))
        print("PASSED: Field Ground Truth Verification Table rendered.")

        # Check for Water Allocation Requests table
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Water Allocation Requests')]")))
        print("PASSED: Water Allocation Requests Review Table rendered.")

        time.sleep(2)
        print("Supervisor Verification Workflow Selenium Test completed successfully!")

    finally:
        driver.quit()

if __name__ == "__main__":
    main()
